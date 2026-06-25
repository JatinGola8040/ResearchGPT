import re
from typing import Dict, List, Any

def clean_text(text: str) -> str:
    """
    Cleans raw document text by removing excessive whitespace,
    normalizing line breaks, and stripping duplicate blank lines.
    """
    if not text:
        return ""
    
    # Normalize line endings (\r\n or \r to \n)
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    
    # Collapse multiple horizontal spaces/tabs into a single space
    cleaned = re.sub(r"[ \t]+", " ", normalized)
    
    # Collapse 3+ consecutive newlines into 2 (leaving 1 blank line max)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    
    # Strip whitespace from individual lines
    lines = [line.strip() for line in cleaned.split("\n")]
    return "\n".join(lines).strip()

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """
    Reusable chunking utility that splits a string into overlapping character windows.
    """
    if not text:
        return []

    chunks: List[str] = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = min(start + chunk_size, text_length)
        chunks.append(text[start:end])
        if end == text_length:
            break
        start += (chunk_size - overlap)

    return chunks

def process_document(parsed_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Accepts parsed dictionary from pdf_parser.py.
    Cleans text, computes metadata (including estimated word count), and splits into chunks.
    Returns:
        {
            "metadata": {
                "title": str,
                "page_count": int,
                "estimated_word_count": int
            },
            "chunks": [
                {
                    "chunk_id": int,
                    "page": int,
                    "text": str
                }
            ]
        }
    """
    title = parsed_data.get("title", "Untitled Document")
    page_count = parsed_data.get("page_count", 0)
    pages = parsed_data.get("pages", [])

    processed_chunks: List[Dict[str, Any]] = []
    total_word_count = 0
    current_chunk_id = 1

    for page_info in pages:
        page_num = page_info.get("page", 1)
        raw_text = page_info.get("text", "")

        cleaned_page_text = clean_text(raw_text)
        if not cleaned_page_text:
            continue

        # Compute word count contribution
        words = cleaned_page_text.split()
        total_word_count += len(words)

        # Split page text into overlapping windows
        page_chunks = chunk_text(cleaned_page_text, chunk_size=1000, overlap=200)
        for chunk_str in page_chunks:
            processed_chunks.append({
                "chunk_id": current_chunk_id,
                "page": page_num,
                "text": chunk_str
            })
            current_chunk_id += 1

    return {
        "metadata": {
            "title": title,
            "page_count": page_count,
            "estimated_word_count": total_word_count
        },
        "chunks": processed_chunks
    }
