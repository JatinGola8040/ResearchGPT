import os
import shutil
import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models import Paper
from app.schemas import (
    PaperResponse, PaperSummaryResponse, ComparePapersRequest, ComparePapersResponse,
    GapAnalysisRequest, GapAnalysisResponse, LiteratureReviewRequest, LiteratureReviewResponse
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
        vector_store_service.add_document(paper_id=paper_id, embedded_chunks=embedded_chunks)
        
        # Step 5: Update paper status from processing to indexed
        paper.status = "indexed"
        db.commit()
    except Exception as e:
        paper.status = "failed"
        paper.error_message = str(e)
        db.commit()
        print(f"Ingestion pipeline failed for paper {paper_id}: {e}")
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

        # Generate embeddings & store in ChromaDB
        embedded_chunks = generate_chunk_embeddings(processed.get("chunks", []))
        chunks_stored = vector_store_service.add_document(paper_id=paper.id, embedded_chunks=embedded_chunks)

        # Update paper status from processing to indexed
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
    Enforces consistent non-null JSON schema contract.
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
        print(f"Summary generation failed for {paper_id}: {e}")
        raise HTTPException(status_code=500, detail="Summary generation failed")

@router.post("/compare", response_model=ComparePapersResponse, status_code=200)
def compare_papers(req: ComparePapersRequest, db: Session = Depends(get_db)):
    """
    Feature 8: Compares 2-5 uploaded papers based on representative chunks.
    """
    if not (2 <= len(req.paper_ids) <= 5):
        raise HTTPException(status_code=400, detail="Please select between 2 and 5 papers to compare.")

    papers_meta = []
    for pid in req.paper_ids:
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
        print(f"Comparison generation failed: {e}")
        raise HTTPException(status_code=500, detail="Comparison generation failed")

@router.post("/gap-analysis", response_model=GapAnalysisResponse, status_code=200)
def analyze_research_gaps(req: GapAnalysisRequest, db: Session = Depends(get_db)):
    """
    Feature 9: Analyzes research gaps across 2-5 uploaded papers based on representative chunks.
    """
    if not (2 <= len(req.paper_ids) <= 5):
        raise HTTPException(status_code=400, detail="Please select between 2 and 5 papers for gap analysis.")

    papers_meta = []
    for pid in req.paper_ids:
        p = db.query(Paper).filter(Paper.id == pid).first()
        if not p:
            raise HTTPException(status_code=404, detail=f"Paper with ID {pid} not found.")
        papers_meta.append({"paper_id": str(p.id), "paper_title": str(p.title or "Untitled Paper")})

    try:
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
        print(f"Gap analysis generation failed: {e}")
        raise HTTPException(status_code=500, detail="Gap analysis generation failed")

@router.post("/literature-review", response_model=LiteratureReviewResponse, status_code=200)
def create_literature_review(req: LiteratureReviewRequest, db: Session = Depends(get_db)):
    """
    Feature 10: Generates structured academic literature review across 2-10 uploaded papers.
    """
    if not (2 <= len(req.paper_ids) <= 10):
        raise HTTPException(status_code=400, detail="Please select between 2 and 10 papers for literature review.")

    papers_meta = []
    for pid in req.paper_ids:
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
        print(f"Literature review generation failed: {e}")
        raise HTTPException(status_code=500, detail="Literature review generation failed")

@router.delete("/{paper_id}", status_code=200)
def delete_paper(paper_id: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail=f"Paper with ID {paper_id} not found.")

    # Remove vector chunks from ChromaDB
    try:
        vector_store_service.delete_document(paper_id)
    except Exception as e:
        print(f"Warning: Failed to delete ChromaDB vectors for {paper_id}: {e}")

    # Remove file from disk
    if os.path.exists(paper.filepath):
        try:
            os.remove(paper.filepath)
        except Exception as e:
            print(f"Warning: Failed to remove PDF file from disk: {e}")

    db.delete(paper)
    db.commit()
    
    return {
        "id": paper_id,
        "status": "deleted",
        "success": True,
        "message": f"Research paper {paper_id} deleted successfully."
    }
