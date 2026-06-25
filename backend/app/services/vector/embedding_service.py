from functools import lru_cache
from typing import List, Dict, Any
from sentence_transformers import SentenceTransformer
from app.config import settings

@lru_cache(maxsize=1)
def get_embedding_model() -> SentenceTransformer:
    """
    Singleton cached loader for SentenceTransformer model.
    Ensures model weights are loaded into memory exactly once.
    """
    model_name = getattr(settings, "EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    try:
        return SentenceTransformer(model_name)
    except Exception as e:
        raise RuntimeError(f"Fatal error loading SentenceTransformer model '{model_name}': {e}")

def generate_chunk_embeddings(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Accepts processed document chunks: [{"chunk_id": int, "page": int, "text": str}]
    Computes vector embeddings for each chunk.
    Returns:
        [
            {
                "chunk_id": 1,
                "page": 1,
                "text": "...",
                "embedding": [0.12, -0.45, ...]
            }
        ]
    """
    if not chunks:
        return []

    try:
        model = get_embedding_model()
    except Exception as e:
        raise RuntimeError(f"Embedding service unavailable: {e}")

    texts = [chunk.get("text", "") for chunk in chunks]

    try:
        # Batch encode texts
        embeddings = model.encode(texts, show_progress_bar=False)
    except Exception as e:
        raise RuntimeError(f"Exception during vector encoding: {e}")

    embedded_results: List[Dict[str, Any]] = []

    for idx, chunk in enumerate(chunks):
        vec = []
        if idx < len(embeddings):
            vec = embeddings[idx].tolist() if hasattr(embeddings[idx], "tolist") else list(embeddings[idx])

        embedded_results.append({
            "chunk_id": chunk.get("chunk_id", idx + 1),
            "page": chunk.get("page", 1),
            "text": chunk.get("text", ""),
            "embedding": vec
        })

    return embedded_results
