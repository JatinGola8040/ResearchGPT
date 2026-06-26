from typing import List, Dict, Any, Optional
from app.database import SessionLocal
from app.models import Paper
from app.services.vector.embedding_service import get_embedding_model
from app.services.vector.vector_store import vector_store_service

def retrieve_relevant_chunks(query: str, top_k: int = 5, filter_paper_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Encodes query string and performs vector search against ChromaDB research_papers collection.
    Enriches results with paper_title fetched from SQLite.
    Returns Top K relevant chunks formatted as:
        [
            {
                "paper_title": "Attention Is All You Need",
                "paper_id": "uuid",
                "page": 2,
                "chunk_id": 1,
                "similarity_score": 0.895,
                "chunk_text": "..."
            }
        ]
    """
    if not query or not query.strip():
        return []

    try:
        model = get_embedding_model()
    except Exception as e:
        raise RuntimeError(f"Embedding service unreachable during query retrieval: {e}")

    try:
        query_vector = model.encode(query, show_progress_bar=False)
        vec_list = query_vector.tolist() if hasattr(query_vector, "tolist") else list(query_vector)
    except Exception as e:
        raise RuntimeError(f"Exception encoding search query: {e}")

    collection = vector_store_service.get_collection()

    where_filter = None
    if filter_paper_id:
        where_filter = {"paper_id": str(filter_paper_id)}

    try:
        results = collection.query(
            query_embeddings=[vec_list],
            n_results=top_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"]
        )
    except Exception as e:
        raise RuntimeError(f"ChromaDB retrieval error: {e}")

    retrieved_items: List[Dict[str, Any]] = []

    if not results or not results.get("documents") or not results["documents"][0]:
        return []

    docs = results["documents"][0]
    metas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(docs)
    dists = results["distances"][0] if results.get("distances") else [0.0] * len(docs)

    # Batch retrieve paper titles from SQLite
    titles_map = {}
    db = SessionLocal()
    try:
        unique_pids = list({meta.get("paper_id", "") for meta in metas if meta})
        if unique_pids:
            papers_db = db.query(Paper).filter(Paper.id.in_(unique_pids)).all()
            titles_map = {p.id: (p.title if p.title else p.filename) for p in papers_db}
    except Exception as e:
        print(f"Database error fetching paper titles: {e}")
    finally:
        db.close()

    for doc_text, meta, dist in zip(docs, metas, dists):
        sim_score = round(1.0 - float(dist), 4)
        p_id = meta.get("paper_id", "")
        p_title = titles_map.get(p_id, "Untitled Research Paper")

        retrieved_items.append({
            "paper_title": p_title,
            "paper_id": p_id,
            "page": meta.get("page", 1),
            "chunk_id": meta.get("chunk_id", 0),
            "similarity_score": sim_score,
            "chunk_text": doc_text,
            "text": doc_text  # Backward compatibility alias for rag_service
        })

    return retrieved_items
