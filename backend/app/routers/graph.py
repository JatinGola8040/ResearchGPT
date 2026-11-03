import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Paper
from app.schemas import (
    ContradictionMapRequest, ContradictionMapResponse,
    EvidenceCourtRequest, EvidenceCourtResponse,
    GalaxyResponse, GalaxyDiscoveryResponse,
)
from app.services.analysis_cache import get_cached, set_cached
from app.services.ai.contradiction_service import generate_contradiction_map
from app.services.ai.court_service import run_evidence_court
from app.services.vector.galaxy_service import build_galaxy, fetch_discovery
from app.services.vector.vector_store import vector_store_service

logger = logging.getLogger("researchgpt.routers.graph")

router = APIRouter(prefix="/papers", tags=["graph"])


def _resolve_papers(db: Session, paper_ids: List[str], default_limit: int = 6) -> List[Paper]:
    if paper_ids:
        papers = db.query(Paper).filter(Paper.id.in_(paper_ids)).all()
        missing = set(paper_ids) - {p.id for p in papers}
        if missing:
            raise HTTPException(status_code=404, detail=f"Papers not found: {sorted(missing)}")
        # Preserve caller order
        order = {pid: i for i, pid in enumerate(paper_ids)}
        papers.sort(key=lambda p: order.get(p.id, 0))
        return papers
    papers = (
        db.query(Paper)
        .filter(Paper.status == "indexed")
        .order_by(Paper.created_at.desc())
        .limit(default_limit)
        .all()
    )
    if not papers:
        raise HTTPException(status_code=400, detail="No indexed papers available. Upload papers first.")
    return papers


def _chunk_count(paper_id: str) -> int:
    try:
        col = vector_store_service.get_collection()
        res = col.get(where={"paper_id": str(paper_id)}, include=[])
        return len(res.get("ids") or [])
    except Exception:
        return 0


@router.post("/contradiction-map", response_model=ContradictionMapResponse, status_code=200)
def contradiction_map(req: ContradictionMapRequest, db: Session = Depends(get_db)):
    """
    Contradiction Map: nodes = papers, edges = stance-colored claim alignments.
    Cached on the exact sorted paper-id set.
    """
    p_ids = req.paper_ids if req.paper_ids else []
    papers = _resolve_papers(db, p_ids)
    resolved_ids = [p.id for p in papers]

    cached = get_cached(db, "contradiction_map", resolved_ids)
    if cached is not None:
        return ContradictionMapResponse.model_validate(cached).model_dump()

    papers_meta = [
        {
            "paper_id": str(p.id),
            "title": str(p.title or p.filename or "Untitled Paper"),
            "pages": str(p.pages or ""),
            "chunk_count": _chunk_count(p.id),
        }
        for p in papers
    ]

    try:
        result = generate_contradiction_map(papers_meta)
    except Exception as e:
        logger.error(f"Contradiction map generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Contradiction map generation failed: {e}")

    if result.get("claims_total", 0) > 0:
        set_cached(db, "contradiction_map", resolved_ids, result)
    return ContradictionMapResponse.model_validate(result).model_dump()


@router.post("/evidence-court", response_model=EvidenceCourtResponse, status_code=200)
def evidence_court(req: EvidenceCourtRequest, db: Session = Depends(get_db)):
    """
    Evidence Court: prosecutor/skeptic/judge over the corpus for a given claim.
    Cached on paper set + claim.
    """
    claim = (req.claim or "").strip()
    if len(claim) < 10:
        raise HTTPException(status_code=400, detail="Claim must be at least 10 characters.")

    p_ids = req.paper_ids if req.paper_ids else []
    papers = _resolve_papers(db, p_ids)
    resolved_ids = [p.id for p in papers]

    cached = get_cached(db, "evidence_court", resolved_ids, extra=claim.lower())
    if cached is not None:
        return EvidenceCourtResponse.model_validate(cached).model_dump()

    papers_meta = [{"paper_id": str(p.id), "paper_title": str(p.title or p.filename or "")} for p in papers]

    try:
        result = run_evidence_court(papers_meta, claim)
    except Exception as e:
        logger.error(f"Evidence court failed: {e}")
        raise HTTPException(status_code=500, detail=f"Evidence court failed: {e}")

    set_cached(db, "evidence_court", resolved_ids, result, extra=claim.lower())
    return EvidenceCourtResponse.model_validate(result).model_dump()


@router.get("/galaxy", response_model=GalaxyResponse, status_code=200)
def galaxy(db: Session = Depends(get_db)):
    """
    Paper Galaxy: 2D embedding map of the library + similarity edges + citation links.
    """
    try:
        result = build_galaxy(db)
    except Exception as e:
        logger.error(f"Galaxy build failed: {e}")
        raise HTTPException(status_code=500, detail=f"Galaxy build failed: {e}")
    return GalaxyResponse.model_validate(result).model_dump()


@router.get("/galaxy/discovery", response_model=GalaxyDiscoveryResponse, status_code=200)
def galaxy_discovery(paper_id: str, db: Session = Depends(get_db)):
    """
    Discovery ghost nodes from Semantic Scholar for one paper. Cached per paper.
    """
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")

    cached = get_cached(db, "galaxy", [paper_id], extra="discovery")
    if cached is not None:
        return GalaxyDiscoveryResponse.model_validate(cached).model_dump()

    try:
        ghost_nodes = fetch_discovery(paper)
    except Exception as e:
        logger.warning(f"Semantic Scholar discovery failed for {paper_id}: {e}")
        raise HTTPException(status_code=502, detail=f"Discovery service unavailable: {e}")

    result = {"ghost_nodes": ghost_nodes}
    set_cached(db, "galaxy", [paper_id], result, extra="discovery")
    return GalaxyDiscoveryResponse.model_validate(result).model_dump()
