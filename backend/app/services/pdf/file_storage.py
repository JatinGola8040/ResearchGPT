import os
import shutil
import uuid
from typing import Tuple
from fastapi import UploadFile, HTTPException
from app.config import settings

def validate_pdf_file(file: UploadFile):
    """
    Validates file extension and MIME content type.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file extension. Only .pdf files are accepted.")

    if file.content_type and file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid MIME type. Only 'application/pdf' is accepted.")

def save_pdf_file(file: UploadFile) -> Tuple[str, str, str]:
    """
    Validates and saves an uploaded PDF file to disk.
    Returns: (paper_id: str, clean_filename: str, storage_path: str)
    """
    validate_pdf_file(file)

    paper_id = str(uuid.uuid4())
    unique_filename = f"{paper_id}.pdf"

    upload_dir = os.path.join(settings.STORAGE_DIR, "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    storage_path = os.path.join(upload_dir, unique_filename)

    with open(storage_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    clean_filename = file.filename if file.filename else "untitled.pdf"
    return paper_id, clean_filename, storage_path

def delete_pdf_file(storage_path: str) -> bool:
    """
    Deletes an uploaded PDF file from disk.
    Returns True if deleted, False otherwise.
    """
    if os.path.exists(storage_path):
        try:
            os.remove(storage_path)
            return True
        except Exception as e:
            print(f"Failed to remove file at {storage_path}: {e}")
            return False
    return False
