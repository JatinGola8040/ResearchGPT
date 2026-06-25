import os
import fitz  # PyMuPDF
from typing import List, Dict

_ocr_reader = None

def get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        import easyocr
        # Initialize EasyOCR for English (CPU mode by default for broad Hackathon compatibility)
        _ocr_reader = easyocr.Reader(['en'], gpu=False)
    return _ocr_reader

def extract_text_from_pdf(filepath: str) -> List[Dict[str, any]]:
    """
    Extracts text page-by-page using PyMuPDF.
    If a page has very low digital text density (<50 chars), falls back to EasyOCR.
    Returns: [{"page_num": int, "text": str}, ...]
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"PDF file not found at {filepath}")

    doc = fitz.open(filepath)
    extracted_pages = []

    for page_index in range(len(doc)):
        page = doc[page_index]
        text = page.get_text().strip()

        # Check density
        if len(text) < 50:
            # Low digital text density -> Scanned image or complex visual figure
            try:
                pix = page.get_pixmap()
                img_bytes = pix.tobytes("png")
                reader = get_ocr_reader()
                ocr_results = reader.readtext(img_bytes, detail=0)
                text = " ".join(ocr_results).strip()
            except Exception as e:
                # If OCR fails, keep whatever digital text we had or log error
                text = f"[OCR Extraction Failed on Page {page_index + 1}: {str(e)}]"

        extracted_pages.append({
            "page_num": page_index + 1,
            "text": text
        })

    doc.close()
    return extracted_pages
