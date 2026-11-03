import logging
from typing import Any, Dict, List

import numpy as np
from sqlalchemy.orm import Session

from app.models import Paper, PaperReference
from app.services.vector.vector_store import vector_store_service

logger = logging.getLogger("researchgpt.galaxy_service")

_SIMILARITY_THRESHOLD = 0.55
_MAX_EDGES_PER_NODE = 5


def _reduce_to_2d(vectors: np.ndarray) -> np.ndarray:
    """PCA to 2D via scikit-learn; falls back to first two dims for <3 papers."""
    n = vectors.shape[0]
    if n < 3:
        coords = vectors[:, :2]
        if coords.shape[1] < 2:
            coords = np.pad(coords, ((0, 0), (0, 2 - coords.shape[1])))
        return coords
    try:
        from sklearn.decomposition import PCA
        return PCA(n_components=2).fit_transform(vectors)
    except Exception as e:
        logger.warning(f"PCA failed ({e}); falling back to first two embedding dims.")
        return vectors[:, :2]


def build_galaxy(db: Session) -> Dict[str, Any]:
    """
    Averages each indexed paper's chunk embeddings into one vector, reduces to 2D,
    and computes cosine-similarity edges plus citation links from PaperReference matches.
    """
    indexed = db.query(Paper).filter(Paper.status == "indexed").all()
    if not indexed:
        return {"points": [], "edges": [], "citation_links": []}

    collection = vector_store_service.get_collection()

    paper_ids: List[str] = []
    titles: Dict[str, str] = {}
    avg_vectors: List[np.ndarray] = []
    chunk_counts: Dict[str, int] = {}

    for paper in indexed:
        pid = str(paper.id)
        try:
            result = collection.get(where={"paper_id": pid}, include=["embeddings"])
        except Exception as e:
            logger.warning(f"Galaxy: could not fetch embeddings for {pid}: {e}")
            continue
        embeddings = result.get("embeddings")
        if embeddings is None or len(embeddings) == 0:
            continue
        mat = np.asarray(embeddings, dtype=float)
        avg_vectors.append(mat.mean(axis=0))
        chunk_counts[pid] = int(mat.shape[0])
        paper_ids.append(pid)
        titles[pid] = paper.title or paper.filename or "Untitled Paper"

    if not paper_ids:
        return {"points": [], "edges": [], "citation_links": []}

    vectors = np.vstack(avg_vectors)
    coords = _reduce_to_2d(vectors)

    points = [
        {
            "paper_id": pid,
            "title": titles[pid],
            "x": float(coords[i, 0]),
            "y": float(coords[i, 1]),
            "n_chunks": chunk_counts[pid],
        }
        for i, pid in enumerate(paper_ids)
    ]

    # Cosine-similarity edges
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    normed = vectors / norms
    sim_matrix = normed @ normed.T

    edges: List[Dict[str, Any]] = []
    per_node_count: Dict[str, int] = {pid: 0 for pid in paper_ids}
    candidate_pairs = []
    for i in range(len(paper_ids)):
        for j in range(i + 1, len(paper_ids)):
            sim = float(sim_matrix[i, j])
            if sim >= _SIMILARITY_THRESHOLD:
                candidate_pairs.append((sim, paper_ids[i], paper_ids[j]))
    candidate_pairs.sort(reverse=True)
    for sim, a, b in candidate_pairs:
        if per_node_count[a] >= _MAX_EDGES_PER_NODE or per_node_count[b] >= _MAX_EDGES_PER_NODE:
            continue
        edges.append({"source_paper_id": a, "target_paper_id": b, "similarity": round(sim, 4)})
        per_node_count[a] += 1
        per_node_count[b] += 1

    # Citation links from Phase 0 reference matching
    citation_links: List[Dict[str, str]] = []
    pid_set = set(paper_ids)
    try:
        refs = db.query(PaperReference).filter(PaperReference.matched_paper_id.isnot(None)).all()
        seen = set()
        for ref in refs:
            src, tgt = str(ref.paper_id), str(ref.matched_paper_id)
            if src in pid_set and tgt in pid_set and src != tgt and (src, tgt) not in seen:
                seen.add((src, tgt))
                citation_links.append({"source_paper_id": src, "target_paper_id": tgt})
    except Exception as e:
        logger.warning(f"Galaxy: citation-link lookup failed: {e}")

    return {"points": points, "edges": edges, "citation_links": citation_links}


# ------------------------------------------------------------------
# Semantic Scholar discovery (ghost nodes)
# ------------------------------------------------------------------
_S2_BASE = "https://api.semanticscholar.org/graph/v1"
_S2_FIELDS = "title,abstract,year,citationCount,externalIds,url"


def fetch_discovery(paper: Paper) -> List[Dict[str, Any]]:
    """
    Finds related external papers via the free Semantic Scholar Graph API.
    Title search -> top hit -> recommendations (fallback: references).
    Respects the public 1 rps limit with a polite pause between calls.
    Raises on hard failure so the router can degrade to a 502/toast.
    """
    import time
    import httpx

    title = (paper.title or paper.filename or "").strip()
    if not title:
        return []

    ghost_nodes: List[Dict[str, Any]] = []
    with httpx.Client(timeout=20.0) as client:
        search_resp = client.get(
            f"{_S2_BASE}/paper/search",
            params={"query": title, "limit": 5, "fields": _S2_FIELDS},
        )
        search_resp.raise_for_status()
        hits = search_resp.json().get("data", [])
        if not hits:
            return []

        top = hits[0]
        s2_id = top.get("paperId")
        if not s2_id:
            return []

        time.sleep(1.1)  # public rate limit: 1 rps without a key

        recs: List[Dict[str, Any]] = []
        try:
            rec_resp = client.get(f"{_S2_BASE}/paper/{s2_id}/recommendations", params={"limit": 8, "fields": _S2_FIELDS})
            if rec_resp.status_code == 200:
                recs = rec_resp.json().get("recommendedPapers", [])
        except Exception:
            recs = []

        if not recs:
            time.sleep(1.1)
            ref_resp = client.get(f"{_S2_BASE}/paper/{s2_id}/references", params={"limit": 8, "fields": _S2_FIELDS})
            ref_resp.raise_for_status()
            recs = [r.get("citedPaper", {}) for r in ref_resp.json().get("data", [])]

    for r in recs:
        rtitle = (r.get("title") or "").strip()
        if not rtitle:
            continue
        ghost_nodes.append({
            "title": rtitle,
            "year": r.get("year"),
            "citation_count": r.get("citationCount"),
            "url": r.get("url") or (f"https://www.semanticscholar.org/paper/{r.get('paperId')}" if r.get("paperId") else None),
            "abstract": r.get("abstract"),
        })
    return ghost_nodes[:8]
