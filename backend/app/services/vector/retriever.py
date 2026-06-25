from typing import List, Dict, Any, Optional
from app.services.vector.embedding_service import get_embedding_model
from app.services.vector.vector_store import vector_store_service

def retrieve_relevant_chunks(query: str, top_k: int = 5, filter_paper_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Encodes query string and performs vector search against ChromaDB research_papers collection.
    Returns Top K relevant chunks formatted as:
        [
            {
                "chunk_id": 1,
                "paper_id": "uuid",
                "page": 2,
                "text": "...",
                "similarity_score": 0.895
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

    for doc_text, meta, dist in zip(docs, metas, dists):
        # Convert cosine distance to cosine similarity (1.0 - distance)
        sim_score = round(1.0 - float(dist), 4)

        retrieved_items.append({
            "chunk_id": meta.get("chunk_id", 0),
            "paper_id": meta.get("paper_id", ""),
            "page": meta.get("page", 1),
            "text": doc_text,
            "similarity_score": sim_score
        })

    return retrieved_items
