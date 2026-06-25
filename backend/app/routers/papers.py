import os
import shutil
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db, SessionLocal
from app.models import Paper
from app.schemas import PaperResponse
from app.config import settings
from app.services.pdf.pdf_parser import parse_pdf
from app.services.pdf.document_processor import process_document
from app.services.vector.embedding_service import generate_chunk_embeddings
from app.services.vector.vector_store import vector_store_service

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

@router.post("/process/{paper_id}")
def process_paper_test(paper_id: str, db: Session = Depends(get_db)):
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

@router.post("/upload", response_model=PaperResponse, status_code=202)
def upload_paper(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    paper_id = str(uuid.uuid4())
    unique_filename = f"{paper_id}.pdf"
    
    upload_dir = os.path.join(settings.STORAGE_DIR, "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    display_title = title if title else (file.filename[:-4] if file.filename else "Untitled")

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

@router.get("", response_model=List[PaperResponse])
def list_papers(db: Session = Depends(get_db)):
    return db.query(Paper).order_by(Paper.created_at.desc()).all()

@router.delete("/{paper_id}", status_code=204)
def delete_paper(paper_id: str, db: Session = Depends(get_db)):
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")

    # Remove vector chunks from ChromaDB
    try:
        vector_store_service.delete_document(paper_id)
    except Exception as e:
        print(f"Failed to delete ChromaDB vectors: {e}")

    # Remove file from disk
    if os.path.exists(paper.filepath):
        try:
            os.remove(paper.filepath)
        except Exception as e:
            print(f"Failed to remove PDF file from disk: {e}")

    db.delete(paper)
    db.commit()
    return None
