import os
import fitz  # PyMuPDF
from typing import Dict, List, Any

_ocr_reader = None

def _get_ocr_reader():
    """
    Lazy initialization of EasyOCR reader to avoid startup latency.
    """
    global _ocr_reader
    if _ocr_reader is None:
        import easyocr
        _ocr_reader = easyocr.Reader(['en'], gpu=False)
    return _ocr_reader

def _extract_page_ocr(page: fitz.Page) -> str:
    """
    Renders PyMuPDF page pixmap to image buffer and performs OCR.
    """
    try:
        pix = page.get_pixmap()
        img_bytes = pix.tobytes("png")
        reader = _get_ocr_reader()
        ocr_results = reader.readtext(img_bytes, detail=0)
        return " ".join(ocr_results).strip()
    except Exception as e:
        print(f"OCR processing error on page {page.number + 1}: {e}")
        return ""

def parse_pdf(file_path: str) -> Dict[str, Any]:
    """
    Parses a PDF file page by page.
    If extracted text on any page has < 30 characters, triggers EasyOCR fallback.
    Returns:
        {
            "title": str,
            "page_count": int,
            "pages": [{"page": int, "text": str}],
            "full_text": str
        }
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"PDF file not found at path: {file_path}")

    try:
        doc = fitz.open(file_path)
    except Exception as e:
        raise RuntimeError(f"Corrupted or unreadable PDF document {file_path}: {e}")

    # Extract title from PDF metadata or filename fallback
    title = ""
    if doc.metadata and doc.metadata.get("title"):
        title = doc.metadata.get("title").strip()
    if not title:
        title = os.path.basename(file_path).replace(".pdf", "")

    pages_data: List[Dict[str, Any]] = []
    full_text_fragments: List[str] = []

    for page_idx in range(len(doc)):
        try:
            page = doc[page_idx]
            text = page.get_text().strip()

            # Hybrid OCR Fallback condition
            if len(text) < 30:
                ocr_text = _extract_page_ocr(page)
                if ocr_text:
                    text = ocr_text

            pages_data.append({
                "page": page_idx + 1,
                "text": text
            })
            if text:
                full_text_fragments.append(text)
        except Exception as e:
            print(f"Exception parsing page {page_idx + 1}: {e}")
            pages_data.append({
                "page": page_idx + 1,
                "text": ""
            })

    page_count = len(doc)
    doc.close()

    return {
        "title": title,
        "page_count": page_count,
        "pages": pages_data,
        "full_text": "\n\n".join(full_text_fragments)
    }
