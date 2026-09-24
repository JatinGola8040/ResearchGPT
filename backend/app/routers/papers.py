import os
import shutil
import uuid
import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models import Paper
from app.schemas import (
    PaperResponse, PaperSummaryResponse, ComparePapersRequest, ComparePapersResponse,
    GapAnalysisRequest, GapAnalysisResponse, LiteratureReviewRequest, LiteratureReviewResponse,
    IdeaValidationRequest, IdeaValidationResponse
)
from app.config import settings
from app.services.pdf.pdf_parser import parse_pdf
from app.services.pdf.document_processor import process_document
from app.services.vector.embedding_service import generate_chunk_embeddings
from app.services.vector.vector_store import vector_store_service
from app.services.ai.summary_service import generate_paper_summary
from app.services.ai.compare_service import generate_papers_comparison
from app.services.ai.gap_service import generate_gap_analysis
from app.services.ai.literature_service import generate_literature_review
from app.services.ai.validator_service import generate_idea_validation

logger = logging.getLogger("researchgpt.routers.papers")

router = APIRouter(prefix="/papers", tags=["papers"])

def run_ingestion_pipeline_task(paper_id: str, file_path: str):
    """
    Background task executing the complete ingestion pipeline:
    Parse PDF -> Clean & Chunk -> Compute Embeddings -> Store in ChromaDB -> Update DB Status.
    """
    db = SessionLocal()
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        db.close()
        return

    try:
        logger.info(f"Starting ingestion pipeline for paper {paper_id} ({paper.filename})")
        # Step 1: Parse PDF
        parsed = parse_pdf(file_path)
        
        # Step 2: Clean & Chunk document
        processed = process_document(parsed)
        
        meta = processed.get("metadata", {})
        if meta.get("title") and not paper.title:
            paper.title = meta.get("title")
        if meta.get("page_count"):
            paper.pages = str(meta.get("page_count"))

        # Step 3: Generate embeddings
        embedded_chunks = generate_chunk_embeddings(processed.get("chunks", []))
        
        # Step 4: Store embeddings inside ChromaDB
        stored_count = vector_store_service.add_document(paper_id=paper_id, embedded_chunks=embedded_chunks)
        
        # Step 5: Update paper status from processing to indexed
        paper.status = "indexed"
        db.commit()
        logger.info(f"Successfully indexed paper {paper_id} with {stored_count} chunks.")
    except Exception as e:
        paper.status = "failed"
        paper.error_message = str(e)
        db.commit()
        logger.error(f"Ingestion pipeline failed for paper {paper_id}: {e}")
    finally:
        db.close()

@router.post("/process/{paper_id}", status_code=200)
def process_paper_test(paper_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Synchronous testing endpoint executing the complete document processing & indexing pipeline.
    """
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")

    if not os.path.exists(paper.filepath):
        raise HTTPException(status_code=404, detail=f"PDF file missing on disk at {paper.filepath}")

    try:
        parsed = parse_pdf(paper.filepath)
        processed = process_document(parsed)
        
        meta = processed.get("metadata", {})
        if meta.get("title") and not paper.title:
            paper.title = meta.get("title")
        if meta.get("page_count"):
            paper.pages = str(meta.get("page_count"))

        embedded_chunks = generate_chunk_embeddings(processed.get("chunks", []))
        chunks_stored = vector_store_service.add_document(paper_id=paper.id, embedded_chunks=embedded_chunks)

        paper.status = "indexed"
        db.commit()
        db.refresh(paper)

        return {
            "paper_id": paper.id,
            "status": paper.status,
            "title": paper.title,
            "chunks_generated": len(processed.get("chunks", [])),
            "chunks_indexed": chunks_stored
        }
    except Exception as e:
        paper.status = "failed"
        paper.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Indexing pipeline failed: {str(e)}")

@router.post("/upload", response_model=PaperResponse, status_code=201)
def upload_paper(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files (.pdf) are supported.")

    paper_id = str(uuid.uuid4())
    unique_filename = f"{paper_id}.pdf"
    
    upload_dir = os.path.join(settings.STORAGE_DIR, "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write uploaded file to storage: {e}")

    display_title = title if title else (file.filename[:-4] if file.filename else "Untitled Paper")

    new_paper = Paper(
        id=paper_id,
        filename=file.filename,
        filepath=file_path,
        title=display_title,
        status="processing"
    )
    db.add(new_paper)
    db.commit()
    db.refresh(new_paper)

    # Trigger background ingestion pipeline
    background_tasks.add_task(run_ingestion_pipeline_task, paper_id, file_path)

    return new_paper

@router.get("", response_model=List[PaperResponse], status_code=200)
def list_papers(db: Session = Depends(get_db)):
    return db.query(Paper).order_by(Paper.created_at.desc()).all()

@router.get("/{paper_id}/summary", response_model=PaperSummaryResponse, status_code=200)
def get_paper_summary(paper_id: str, db: Session = Depends(get_db)):
    """
    Feature 7: Retrieves representative chunks for a paper and generates structured AI summary.
    """
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    try:
        summary_data = generate_paper_summary(paper_id)
        
        contributions = summary_data.get("key_contributions", [])
        if not isinstance(contributions, list):
            contributions = [str(contributions)] if contributions else []
        clean_contributions = [str(c) for c in contributions if c is not None]

        citations = summary_data.get("citations", [])
        if not isinstance(citations, list):
            citations = []

        payload = {
            "paper_id": str(paper.id),
            "paper_title": str(paper.title or ""),
            "executive_summary": str(summary_data.get("executive_summary") or ""),
            "key_contributions": clean_contributions,
            "methodology": str(summary_data.get("methodology") or ""),
            "results": str(summary_data.get("results") or ""),
            "limitations": str(summary_data.get("limitations") or ""),
            "citations": citations
        }
        validated = PaperSummaryResponse.model_validate(payload)
        return validated.model_dump()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Summary generation failed for {paper_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {str(e)}")

@router.post("/compare", response_model=ComparePapersResponse, status_code=200)
def compare_papers(req: ComparePapersRequest, db: Session = Depends(get_db)):
    """
    Feature 8: Compares uploaded papers based on representative chunks.
    """
    p_ids = req.paper_ids if req.paper_ids else []
    if not p_ids:
        indexed_papers = db.query(Paper).filter(Paper.status == "indexed").limit(3).all()
        p_ids = [p.id for p in indexed_papers]
    
    if len(p_ids) < 1:
        raise HTTPException(status_code=400, detail="Please upload and select papers to compare.")

    papers_meta = []
    for pid in p_ids:
        p = db.query(Paper).filter(Paper.id == pid).first()
        if not p:
            raise HTTPException(status_code=404, detail=f"Paper with ID {pid} not found.")
        papers_meta.append({"paper_id": str(p.id), "paper_title": str(p.title or "Untitled Paper")})

    try:
        comparison_data = generate_papers_comparison(papers_meta)
        citations = comparison_data.pop("citations", [])
        if not isinstance(citations, list):
            citations = []
        payload = {
            "papers": papers_meta,
            "comparison": comparison_data,
            "citations": citations
        }
        validated = ComparePapersResponse.model_validate(payload)
        return validated.model_dump()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Comparison generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Comparison generation failed: {str(e)}")

@router.post("/gap-analysis", response_model=GapAnalysisResponse, status_code=200)
def analyze_research_gaps(req: GapAnalysisRequest, db: Session = Depends(get_db)):
    """
    Feature 9: Analyzes research gaps across uploaded papers using balanced per-paper evidence.
    """
    p_ids = req.paper_ids if req.paper_ids else []
    if not p_ids:
        # Automatically use indexed papers if no explicit selection was passed
        indexed_papers = db.query(Paper).filter(Paper.status == "indexed").limit(4).all()
        p_ids = [p.id for p in indexed_papers]

    if not p_ids:
        raise HTTPException(
            status_code=400,
            detail="No indexed research papers found. Please upload at least one PDF to perform gap analysis."
        )

    papers_meta = []
    for pid in p_ids:
        p = db.query(Paper).filter(Paper.id == pid).first()
        if not p:
            raise HTTPException(status_code=404, detail=f"Paper with ID {pid} not found.")
        papers_meta.append({"paper_id": str(p.id), "paper_title": str(p.title or "Untitled Paper")})

    try:
        logger.info(f"Initiating gap analysis across {len(papers_meta)} papers")
        analysis_data = generate_gap_analysis(papers_meta)
        citations = analysis_data.pop("citations", [])
        if not isinstance(citations, list):
            citations = []
        payload = {
            "papers": papers_meta,
            "analysis": analysis_data,
            "citations": citations
        }
        validated = GapAnalysisResponse.model_validate(payload)
        return validated.model_dump()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Gap analysis generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Gap analysis generation failed: {str(e)}")

@router.post("/literature-review", response_model=LiteratureReviewResponse, status_code=200)
def create_literature_review(req: LiteratureReviewRequest, db: Session = Depends(get_db)):
    """
    Feature 10: Generates structured academic literature review across uploaded papers.
    """
    p_ids = req.paper_ids if req.paper_ids else []
    if not p_ids:
        indexed_papers = db.query(Paper).filter(Paper.status == "indexed").limit(5).all()
        p_ids = [p.id for p in indexed_papers]

    if not p_ids:
        raise HTTPException(status_code=400, detail="Please upload and select papers for literature review.")

    papers_meta = []
    for pid in p_ids:
        p = db.query(Paper).filter(Paper.id == pid).first()
        if not p:
            raise HTTPException(status_code=404, detail=f"Paper with ID {pid} not found.")
        papers_meta.append({"paper_id": str(p.id), "paper_title": str(p.title or "Untitled Paper")})

    try:
        review_data = generate_literature_review(papers_meta)
        if not isinstance(review_data.get("citations"), list):
            review_data["citations"] = []
        validated = LiteratureReviewResponse.model_validate(review_data)
        return validated.model_dump()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Literature review generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Literature review generation failed: {str(e)}")

@router.post("/validate-idea", response_model=IdeaValidationResponse, status_code=200)
def validate_research_idea(req: IdeaValidationRequest, db: Session = Depends(get_db)):
    if not req.research_idea or not req.research_idea.strip():
        raise HTTPException(status_code=400, detail="Please provide a research idea to validate.")

    p_ids = req.paper_ids if req.paper_ids else []
    if not p_ids:
        indexed_papers = db.query(Paper).filter(Paper.status == "indexed").limit(5).all()
        p_ids = [p.id for p in indexed_papers]

    if not p_ids:
        raise HTTPException(
            status_code=400,
            detail="No indexed research papers found. Please upload at least one PDF before validating an idea."
        )

    papers_meta = []
    for pid in p_ids:
        paper = db.query(Paper).filter(Paper.id == pid).first()
        if not paper:
            raise HTTPException(status_code=404, detail=f"Paper with ID {pid} not found.")
        if paper.status != "indexed":
            raise HTTPException(status_code=400, detail=f'Paper "{paper.title or paper.filename}" is not indexed yet.')
        papers_meta.append({"paper_id": str(paper.id), "paper_title": str(paper.title or "Untitled Paper")})

    try:
        validation_data = generate_idea_validation(
            papers_meta,
            IdeaValidationRequest(
                paper_ids=p_ids,
                research_idea=req.research_idea,
                domain=req.domain,
                target_problem=req.target_problem,
                proposed_method=req.proposed_method,
                constraints=req.constraints,
            ),
        )
        validated = IdeaValidationResponse.model_validate(validation_data)
        return validated.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Idea validation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Idea validation failed: {str(e)}")

@router.delete("/{paper_id}", status_code=200)
def delete_paper(paper_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail=f"Paper with ID {paper_id} not found.")

    try:
        vector_store_service.delete_document(paper_id)
    except Exception as e:
        logger.warning(f"Failed to delete ChromaDB vectors for {paper_id}: {e}")

    if os.path.exists(paper.filepath):
        try:
            os.remove(paper.filepath)
        except Exception as e:
            logger.warning(f"Failed to remove PDF file from disk: {e}")

    db.delete(paper)
    db.commit()
    
    return {
        "id": paper_id,
        "status": "deleted",
        "success": True,
        "message": f"Research paper {paper_id} deleted successfully."
    }
