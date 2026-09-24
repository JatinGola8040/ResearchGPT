import logging
from typing import List, Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import init_db, get_db
from app.models import Paper
from app.routers import papers, query, export
from app.services.vector.vector_store import vector_store_service
from app.services.vector.retriever import retrieve_relevant_chunks, retrieve_gap_evidence
from app.services.ai.gap_service import generate_gap_analysis, GAP_SYSTEM_PROMPT
from app.schemas import DebugGapAnalysisRequest

# Configure unified logger
logging.basicConfig(
    level=logging.INFO if settings.DEBUG_MODE else logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("researchgpt.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB and verify vectors
    logger.info("Initializing ResearchGPT backend services...")
    init_db()
    
    # Warmup / verify vector collection
    try:
        col = vector_store_service.get_collection()
        doc_count = col.count()
        logger.info(f"Connected to ChromaDB '{vector_store_service.collection_name}' with {doc_count} chunks indexed.")
    except Exception as e:
        logger.warning(f"Vector store verification warning: {e}")

    logger.info("ResearchGPT Backend startup complete and ready for queries.")
    yield
    # Shutdown
    logger.info("ResearchGPT Backend shutting down cleanly.")

app = FastAPI(
    title="ResearchGPT Studio API",
    description="Full-stack AI workspace for deep research paper synthesis, literature reviews, grounded QA, and gap analysis with strict citation verification.",
    version="2.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend (default port 3000)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(papers.router)
app.include_router(query.router)
app.include_router(export.router)

@app.get("/")
def root():
    return {
        "success": True,
        "message": "ResearchGPT Backend API is Operational.",
        "data": {"status": "running"}
    }

@app.get("/health")
def health():
    return {
        "success": True,
        "message": "System health check passed.",
        "data": {"status": "healthy"}
    }

@app.get("/debug/llm-health", tags=["debug"])
def debug_llm_health():
    """
    Returns LLM provider and configuration status without executing an inference request or exposing secrets.
    """
    has_key = bool(settings.OPENROUTER_API_KEY and len(settings.OPENROUTER_API_KEY) > 10)
    return {
        "provider": settings.LLM_PROVIDER,
        "model": settings.LLM_MODEL,
        "configured": has_key,
        "status": "configured" if has_key else "missing_key"
    }

@app.get("/debug/vector-count", tags=["debug"])
def debug_vector_count():
    """
    Debugging endpoint returning the total indexed chunks count in ChromaDB.
    """
    collection = vector_store_service.get_collection()
    return {
        "success": True,
        "message": "Retrieved vector collection document count.",
        "data": {
            "collection": vector_store_service.collection_name,
            "documents": collection.count()
        }
    }

class DebugSearchRequest(BaseModel):
    query: str
    paper_ids: Optional[List[str]] = None
    top_k: int = 5

@app.post("/debug/search", tags=["debug"])
def debug_search(req: DebugSearchRequest):
    """
    Development endpoint for testing semantic search retrieval and query expansion.
    """
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty.")
        
    chunks = retrieve_relevant_chunks(
        query=req.query,
        top_k=req.top_k,
        filter_paper_ids=req.paper_ids,
        expand_query=True
    )
    return {
        "success": True,
        "message": "Debug search completed successfully.",
        "data": {
            "query": req.query,
            "count": len(chunks),
            "results": chunks
        }
    }

@app.post("/debug/gap-analysis", tags=["debug"])
def debug_gap_analysis(req: DebugGapAnalysisRequest, db: Session = Depends(get_db)):
    """
    Diagnostic Endpoint:
    Returns full diagnostic breakdown of retrieval, prompt length, model metadata, and parsed results.
    Does NOT expose API keys or secrets.
    """
    if not settings.DEBUG_MODE:
        raise HTTPException(status_code=403, detail="Debug endpoint disabled in production.")

    p_ids = req.paper_ids if req.paper_ids else []
    if not p_ids:
        indexed = db.query(Paper).filter(Paper.status == "indexed").limit(3).all()
        p_ids = [p.id for p in indexed]

    papers_db = db.query(Paper).filter(Paper.id.in_(p_ids)).all()
    papers_meta = [{"paper_id": str(p.id), "paper_title": str(p.title or p.filename)} for p in papers_db]

    retrieved_chunks = retrieve_gap_evidence(paper_ids=p_ids, top_k_per_paper=3)
    similarity_scores = [c.get("similarity_score", 0.0) for c in retrieved_chunks]

    # Calculate prompt length
    context_preview = "\n\n".join([f"[{c.get('paper_title')} p.{c.get('page')}] {c.get('chunk_text', '')[:400]}" for c in retrieved_chunks])
    full_prompt_sample = f"System: {GAP_SYSTEM_PROMPT[:100]}...\n\nUser: {context_preview}"

    # Execute actual analysis
    analysis_res = generate_gap_analysis(papers_meta)

    return {
        "success": True,
        "message": "Debug gap analysis diagnostics completed.",
        "data": {
            "query": req.query or "Identify unresolved research gaps across papers",
            "selected_papers": papers_meta,
            "retrieved_chunks_count": len(retrieved_chunks),
            "retrieved_chunks": retrieved_chunks,
            "similarity_scores": similarity_scores,
            "prompt_approx_char_length": len(full_prompt_sample),
            "model": settings.LLM_MODEL,
            "temperature": settings.LLM_TEMPERATURE,
            "max_tokens": settings.LLM_MAX_TOKENS,
            "parsed_response": analysis_res,
            "citation_count": len(analysis_res.get("citations", [])),
            "evidence_count": len(analysis_res.get("detailed_gaps", []))
        }
    }
