import os
import shutil
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Paper
from app.schemas import PaperResponse
from app.config import settings
from app.services.pdf.pdf_parser import parse_pdf
from app.services.pdf.document_processor import process_document

router = APIRouter(prefix="/papers", tags=["papers"])

@router.post("/process/{paper_id}")
def process_paper_test(paper_id: str, db: Session = Depends(get_db)):
    """
    Temporary endpoint for testing Feature 3 Document Processing Pipeline.
    """
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")

    if not os.path.exists(paper.filepath):
        raise HTTPException(status_code=404, detail=f"PDF file missing on disk at {paper.filepath}")

    try:
        parsed_output = parse_pdf(paper.filepath)
        processed_response = process_document(parsed_output)
        return processed_response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document processing failed: {str(e)}")

@router.post("/upload", response_model=PaperResponse, status_code=201)
def upload_paper(
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
        status="uploaded"
    )
    db.add(new_paper)
    db.commit()
    db.refresh(new_paper)

    return new_paper

@router.get("", response_model=List[PaperResponse])
def list_papers(db: Session = Depends(get_db)):
    return db.query(Paper).order_by(Paper.created_at.desc()).all()

@router.delete("/{paper_id}", status_code=204)
def delete_paper(paper_id: str, db: Session = Depends(get_db)):
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")

    if os.path.exists(paper.filepath):
        try:
            os.remove(paper.filepath)
        except Exception as e:
            print(f"Failed to remove PDF file from disk: {e}")

    db.delete(paper)
    db.commit()
    return None
