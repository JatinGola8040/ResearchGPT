import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List

from pydantic import BaseModel, Field, field_validator

from app.services.llm_client import llm_client
from app.services.vector.retriever import retrieve_relevant_chunks
from app.services.ai.gap_service import generate_gap_analysis
from app.services.ai.stance_service import detect_stances

logger = logging.getLogger("researchgpt.contradiction_service")

CLAIM_EXTRACTION_PROMPT = """You extract atomic, checkable key findings from research-paper passages.
Given passages from several papers, return up to 3 key findings PER PAPER.
Each finding must be a single, specific, verifiable claim (a result, a comparison, a measured effect) -
not a topic description.
Each passage is labeled with a paper_ref (P1, P2, ...). You MUST copy that paper_ref into the paper_id field verbatim.
Respond ONLY with valid JSON:
{"claims": [{"claim_id": "c1", "paper_id": "P1", "claim": "..."}]}"""

_STANCE_RANK = {"contradicts": 3, "partial": 2, "agrees": 1}


class _LLMClaimItem(BaseModel):
    claim_id: str = ""
    paper_id: str = ""
    claim: str = ""

    @field_validator("claim_id", "paper_id", "claim", mode="before")
    @classmethod
    def _coerce_str(cls, v):
        return "" if v is None else str(v)


class _LLMClaimOutput(BaseModel):
    claims: List[_LLMClaimItem] = Field(default_factory=list)

    @field_validator("claims", mode="before")
    @classmethod
    def _coerce_list(cls, v):
        return v if isinstance(v, list) else ([] if v is None else [v])


def _extract_key_claims(paper_ids: List[str], max_per_paper: int = 3) -> List[Dict[str, str]]:
    """Extracts up to max_per_paper atomic key findings per paper from representative chunks."""
    chunks = retrieve_relevant_chunks(
        query="key findings results conclusions performance improvements accuracy",
        top_k=max(6, 3 * len(paper_ids)),
        filter_paper_ids=paper_ids,
        expand_query=False,
        per_paper_balance=True,
    )
    if not chunks:
        return []

    label_to_pid: Dict[str, str] = {}
    ordered_pids: List[str] = []
    for c in chunks:
        pid_c = str(c.get("paper_id") or "")
        if pid_c and pid_c not in ordered_pids:
            ordered_pids.append(pid_c)
    for i, pid_c in enumerate(ordered_pids):
        label_to_pid[f"P{i+1}"] = pid_c
    pid_to_label = {v: k for k, v in label_to_pid.items()}
    passages = [
        {
            "paper_ref": pid_to_label.get(str(c.get("paper_id") or ""), "P?"),
            "paper_title": c.get("paper_title"),
            "page": c.get("page"),
            "text": str(c.get("chunk_text", ""))[:1200],
        }
        for c in chunks
    ]
    try:
        data = llm_client.generate_json(
            messages=[
                {"role": "system", "content": CLAIM_EXTRACTION_PROMPT},
                {"role": "user", "content": "PASSAGES (JSON):\n" + json.dumps(passages, indent=1)},
            ],
            schema_cls=_LLMClaimOutput,
            temperature=0.1,
        )
    except Exception as e:
        logger.error(f"Claim extraction failed: {e}")
        return []

    claims: List[Dict[str, str]] = []
    per_paper: Dict[str, int] = {}
    for raw in data.get("claims", []):
        try:
            item = _LLMClaimItem.model_validate(raw)
        except Exception:
            continue
        resolved = label_to_pid.get(str(item.paper_id).strip().upper(), str(item.paper_id).strip())
        if not item.claim or resolved not in paper_ids:
            logger.warning(f"Claim dropped: unresolvable paper ref '{item.paper_id}'")
            continue
        item = item.model_copy(update={"paper_id": resolved})
        if per_paper.get(item.paper_id, 0) >= max_per_paper:
            continue
        per_paper[item.paper_id] = per_paper.get(item.paper_id, 0) + 1
        claims.append({"claim_id": item.claim_id or f"c{len(claims)+1}", "paper_id": item.paper_id, "claim": item.claim})
    return claims


def _gap_derived_claims(paper_ids: List[str]) -> List[Dict[str, str]]:
    """Harvests conflicting findings and inferred gaps from the existing gap-analysis machinery."""
    papers_meta = [{"paper_id": pid, "paper_title": pid} for pid in paper_ids]
    try:
        gap = generate_gap_analysis(papers_meta)
    except Exception as e:
        logger.error(f"Gap analysis harvest failed: {e}")
        return []

    claims: List[Dict[str, str]] = []
    for i, finding in enumerate(gap.get("conflicting_findings") or []):
        if finding and str(finding).strip():
            claims.append({"claim_id": f"gap-cf-{i}", "paper_id": "", "claim": str(finding).strip()})
    for i, item in enumerate(gap.get("detailed_gaps") or []):
        if str(item.get("type", "")).lower() == "inferred" and item.get("gap"):
            claims.append({"claim_id": f"gap-ig-{i}", "paper_id": "", "claim": str(item["gap"]).strip()})
    return claims


def generate_contradiction_map(papers: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Builds the contradiction-map graph: one node per paper, stance-colored edges
    between papers whose findings align, conflict, or partially agree.
    """
    paper_ids = [str(p["paper_id"]) for p in papers]
    id_to_meta = {str(p["paper_id"]): p for p in papers}

    nodes = [
        {
            "paper_id": pid,
            "title": id_to_meta[pid].get("title") or "Untitled Paper",
            "year": None,
            "pages": str(id_to_meta[pid].get("pages") or ""),
            "chunk_count": int(id_to_meta[pid].get("chunk_count") or 0),
        }
        for pid in paper_ids
    ]

    empty = {
        "nodes": nodes, "edges": [], "claims_total": 0,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    if len(paper_ids) < 2:
        return empty

    # 1. Claims: gap-analysis harvest + LLM key-finding extraction
    claims = _gap_derived_claims(paper_ids) + _extract_key_claims(paper_ids)
    # Balance the claim cap across papers: a flat claims[:12] lets the first
    # papers' claims crowd out later papers entirely, silently dropping real
    # cross-paper edges for larger corpora.
    if len(claims) > 12:
        by_paper: Dict[str, List[Dict[str, Any]]] = {}
        corpus_level: List[Dict[str, Any]] = []
        for c in claims:
            pid = str(c.get("paper_id") or "")
            (corpus_level if not pid else by_paper.setdefault(pid, [])).append(c)
        balanced: List[Dict[str, Any]] = list(corpus_level)
        buckets = [b for b in by_paper.values()]
        i = 0
        while len(balanced) < 12 and any(buckets):
            bucket = buckets[i % len(buckets)]
            if bucket:
                balanced.append(bucket.pop(0))
            i += 1
        claims = balanced[:12]
    if not claims:
        return empty

    # 2. Passages per claim: own source passage + best matches from other papers
    passages_by_claim: Dict[str, List[Dict[str, Any]]] = {}
    passage_lookup: Dict[str, Dict[str, Any]] = {}
    for claim in claims:
        cid = claim["claim_id"]
        own_pid = claim.get("paper_id") or ""
        others = [p for p in paper_ids if p != own_pid] if own_pid else paper_ids
        passages: List[Dict[str, Any]] = []

        if own_pid:
            own = retrieve_relevant_chunks(
                query=claim["claim"], top_k=1, filter_paper_id=own_pid, expand_query=False
            )
            for c in own:
                pid = f"{cid}-own-{len(passages)}"
                passages.append({
                    "passage_id": pid, "paper_id": c.get("paper_id"),
                    "paper_title": c.get("paper_title"), "page": c.get("page"),
                    "text": c.get("chunk_text", ""), "similarity_score": c.get("similarity_score", 0.0),
                })
        if others:
            cross = retrieve_relevant_chunks(
                query=claim["claim"], top_k=2, filter_paper_ids=others, expand_query=False
            )
            for c in cross:
                pid = f"{cid}-x-{len(passages)}"
                passages.append({
                    "passage_id": pid, "paper_id": c.get("paper_id"),
                    "paper_title": c.get("paper_title"), "page": c.get("page"),
                    "text": c.get("chunk_text", ""), "similarity_score": c.get("similarity_score", 0.0),
                })

        passages_by_claim[cid] = passages[:4]
        for p in passages:
            passage_lookup[p["passage_id"]] = p

    # 3. Stance detection
    judgments = detect_stances(claims, passages_by_claim)
    claim_lookup = {c["claim_id"]: c for c in claims}

    # 4. Aggregate into paper-pair edges
    pair_data: Dict[tuple, Dict[str, Any]] = {}
    for j in judgments:
        if j["stance"] == "unrelated":
            continue
        claim = claim_lookup.get(j["claim_id"])
        passage = passage_lookup.get(j["passage_id"])
        if not claim or not passage:
            continue
        own_pid = claim.get("paper_id") or ""
        other_pid = str(passage.get("paper_id") or "")
        if not other_pid:
            continue
        if not own_pid:
            # Corpus-level claim (gap-analysis derived): pair this passage's paper
            # with other papers' passages judged for the same claim.
            claim_papers = sorted({
                str(passage_lookup.get(j2["passage_id"], {}).get("paper_id") or "")
                for j2 in judgments
                if j2["claim_id"] == j["claim_id"] and j2["stance"] != "unrelated"
            } - {"", other_pid})
            if not claim_papers:
                continue
            own_pid = claim_papers[0]
        if own_pid == other_pid:
            continue

        key = tuple(sorted([own_pid, other_pid]))
        entry = pair_data.setdefault(key, {"claims": []})
        entry["claims"].append({
            "claim": claim["claim"],
            "stance": j["stance"],
            "rationale": j.get("rationale", ""),
            "passages": [
                {
                    "paper_id": p.get("paper_id"),
                    "paper_title": p.get("paper_title"),
                    "page": p.get("page"),
                    "text": str(p.get("text", ""))[:600],
                }
                for p in passages_by_claim.get(j["claim_id"], [])
            ],
        })

    edges: List[Dict[str, Any]] = []
    for idx, (pair, entry) in enumerate(pair_data.items()):
        stances = [c["stance"] for c in entry["claims"]]
        headline = max(stances, key=lambda s: _STANCE_RANK.get(s, 0))
        # Confidence: share of claims matching the headline stance
        share = sum(1 for s in stances if s == headline) / max(1, len(stances))
        confidence = "high" if share >= 0.75 else ("medium" if share >= 0.5 else "low")
        edges.append({
            "id": f"edge-{idx}",
            "source_paper_id": pair[0],
            "target_paper_id": pair[1],
            "claim": entry["claims"][0]["claim"],
            "claims": entry["claims"],
            "stance": headline,
            "confidence": confidence,
            "passages": entry["claims"][0]["passages"],
        })

    return {
        "nodes": nodes,
        "edges": edges,
        "claims_total": len(claims),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
