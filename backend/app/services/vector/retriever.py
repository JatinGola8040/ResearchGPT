import re
import logging
from typing import List, Dict, Any, Optional, Set
from app.database import SessionLocal
from app.models import Paper
from app.services.vector.embedding_service import get_embedding_model
from app.services.vector.vector_store import vector_store_service

logger = logging.getLogger("researchgpt.retriever")

def is_noise_or_reference_chunk(text: str) -> bool:
    """
    Detects if a chunk is pure bibliography, citation index, or author affiliation noise.
    """
    if not text or len(text.strip()) < 40:
        return True
    
    # Check for citation lists like [1] [2] [3] or [12], [13]
    bracket_citations = re.findall(r'\[\d{1,3}\]', text)
    if len(bracket_citations) >= 4:
        return True
    
    # Check for DOI / URL repetition in references
    doi_matches = re.findall(r'doi:\s*10\.\d+', text, re.IGNORECASE)
    url_matches = re.findall(r'https?://', text, re.IGNORECASE)
    if len(doi_matches) >= 2 or len(url_matches) >= 3:
        return True
    
    # Check for copyright / author bio boilerplate
    if "Marie Skłodowska-Curie Actions" in text or ("IEEE Transactions" in text and "Manuscript received" in text):
        if len(re.findall(r'(Department|University|Institute|Laboratory|Faculty)', text)) >= 3 and len(text) < 400:
            return True
            
    return False

def get_expansion_queries(query: str) -> List[str]:
    """
    Generates domain-aware query expansions for research questions.
    """
    queries = [query]
    q_lower = query.lower()
    
    # Gap & limitation analysis intent
    if any(k in q_lower for k in ["gap", "unresolved", "limit", "future", "challenge", "open problem", "weakness", "shortcoming"]):
        queries.append("limitations unresolved challenges future work open problems shortcomings weaknesses")
        queries.append("experimental results trade-offs scalability latency security constraints computational overhead")
    
    # Comparative & methodology intent
    elif any(k in q_lower for k in ["compare", "method", "architecture", "technique", "approach", "algorithm"]):
        queries.append("methodology proposed architecture experimental setup dataset evaluation metrics")
        queries.append("comparative results baseline performance advantages disadvantages")
        
    # Summary & contributions intent
    elif any(k in q_lower for k in ["summary", "contribution", "main finding", "overview"]):
        queries.append("abstract key contributions main innovations methodology results conclusion")

    return list(dict.fromkeys(queries))  # preserve order & deduplicate

def retrieve_relevant_chunks(
    query: str,
    top_k: int = 5,
    filter_paper_id: Optional[str] = None,
    filter_paper_ids: Optional[List[str]] = None,
    expand_query: bool = True,
    per_paper_balance: bool = False
) -> List[Dict[str, Any]]:
    """
    Encodes query string(s) and performs multi-query vector search against ChromaDB.
    Enriches results with paper_title fetched from SQLite.
    Filters noise, handles single or multi-paper filters, and returns deduplicated top chunks.
    """
    if not query or not query.strip():
        return []

    try:
        model = get_embedding_model()
    except Exception as e:
        logger.error(f"Embedding model loading failed: {e}")
        raise RuntimeError(f"Embedding service unreachable during query retrieval: {e}")

    collection = vector_store_service.get_collection()

    # Determine paper filtering
    target_paper_ids = []
    if filter_paper_id:
        target_paper_ids = [str(filter_paper_id)]
    elif filter_paper_ids:
        target_paper_ids = [str(pid) for pid in filter_paper_ids if pid]

    # Pre-fetch paper titles from SQLite
    db = SessionLocal()
    titles_map = {}
    try:
        if target_paper_ids:
            papers_db = db.query(Paper).filter(Paper.id.in_(target_paper_ids)).all()
        else:
            papers_db = db.query(Paper).filter(Paper.status == "indexed").all()
        titles_map = {p.id: (p.title if p.title else p.filename) for p in papers_db}
    except Exception as e:
        logger.warning(f"Database error fetching paper titles: {e}")
    finally:
        db.close()

    # Generate query expansions
    queries_to_run = get_expansion_queries(query) if expand_query else [query]

    # If per_paper_balance is requested and we have target papers
    if per_paper_balance and target_paper_ids:
        all_balanced_chunks = []
        k_per_paper = max(2, top_k // len(target_paper_ids))
        
        for pid in target_paper_ids:
            paper_chunk_pool: Dict[str, Dict[str, Any]] = {}
            for q in queries_to_run:
                try:
                    q_vec = model.encode(q, show_progress_bar=False).tolist()
                    res = collection.query(
                        query_embeddings=[q_vec],
                        n_results=min(k_per_paper * 3, 15),
                        where={"paper_id": pid},
                        include=["documents", "metadatas", "distances"]
                    )
                except Exception as e:
                    logger.error(f"ChromaDB retrieval error for paper {pid}: {e}")
                    continue

                if res and res.get("documents") and res["documents"][0]:
                    for doc, meta, dist in zip(res["documents"][0], res["metadatas"][0], res["distances"][0]):
                        if is_noise_or_reference_chunk(doc):
                            continue
                        sim = round(1.0 - float(dist), 4)
                        cid = f"{meta.get('paper_id')}_{meta.get('chunk_id')}"
                        if cid not in paper_chunk_pool or sim > paper_chunk_pool[cid]["similarity_score"]:
                            paper_chunk_pool[cid] = {
                                "paper_title": titles_map.get(pid, "Untitled Paper"),
                                "paper_id": pid,
                                "page": meta.get("page", 1),
                                "chunk_id": meta.get("chunk_id", 0),
                                "similarity_score": sim,
                                "chunk_text": doc,
                                "text": doc
                            }
            # Pick top k for this paper
            sorted_paper_chunks = sorted(paper_chunk_pool.values(), key=lambda x: x["similarity_score"], reverse=True)
            all_balanced_chunks.extend(sorted_paper_chunks[:k_per_paper])
            
        return all_balanced_chunks

    # Standard / Multi-paper search
    where_filter = None
    if len(target_paper_ids) == 1:
        where_filter = {"paper_id": target_paper_ids[0]}
    elif len(target_paper_ids) > 1:
        where_filter = {"paper_id": {"$in": target_paper_ids}}

    chunk_pool: Dict[str, Dict[str, Any]] = {}

    for q in queries_to_run:
        try:
            q_vec = model.encode(q, show_progress_bar=False).tolist()
            res = collection.query(
                query_embeddings=[q_vec],
                n_results=min(top_k * 3, 25),
                where=where_filter,
                include=["documents", "metadatas", "distances"]
            )
        except Exception as e:
            logger.error(f"ChromaDB retrieval error for query '{q}': {e}")
            continue

        if res and res.get("documents") and res["documents"][0]:
            for doc, meta, dist in zip(res["documents"][0], res["metadatas"][0], res["distances"][0]):
                if is_noise_or_reference_chunk(doc):
                    continue
                sim = round(1.0 - float(dist), 4)
                p_id = meta.get("paper_id", "")
                cid = f"{p_id}_{meta.get('chunk_id')}"
                
                # Check title
                p_title = titles_map.get(p_id)
                if not p_title:
                    p_title = "Untitled Research Paper"

                if cid not in chunk_pool or sim > chunk_pool[cid]["similarity_score"]:
                    chunk_pool[cid] = {
                        "paper_title": p_title,
                        "paper_id": p_id,
                        "page": meta.get("page", 1),
                        "chunk_id": meta.get("chunk_id", 0),
                        "similarity_score": sim,
                        "chunk_text": doc,
                        "text": doc
                    }

    sorted_chunks = sorted(chunk_pool.values(), key=lambda x: x["similarity_score"], reverse=True)
    return sorted_chunks[:top_k]

def retrieve_gap_evidence(paper_ids: List[str], top_k_per_paper: int = 3) -> List[Dict[str, Any]]:
    """
    Dedicated gap evidence extractor across multiple research papers.
    Extracts high-priority limitation, future work, discussion, and constraint chunks per paper.
    """
    return retrieve_relevant_chunks(
        query="limitations research gaps future work open challenges trade-offs bottlenecks",
        top_k=len(paper_ids) * top_k_per_paper,
        filter_paper_ids=paper_ids,
        expand_query=True,
        per_paper_balance=True
    )

def format_citations(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Formats retrieved chunks into unified citation format with relevance score.
    """
    seen: Set[tuple] = set()
    citations = []
    for c in chunks:
        pid = str(c.get("paper_id", "") or "")
        title = str(c.get("paper_title", "") or "Untitled Paper")
        try:
            page = int(c.get("page", 1) or 1)
        except (ValueError, TypeError):
            page = 1
        text = str(c.get("chunk_text", c.get("text", "")) or "").strip()
        if not text or "No indexed document context available" in text:
            continue
        snippet = text[:200] + ("..." if len(text) > 200 else "")
        sim_score = c.get("similarity_score", 0.0)

        key = (pid, page)
        if key not in seen:
            seen.add(key)
            citations.append({
                "paper_id": pid,
                "paper_title": title,
                "page": page,
                "snippet": snippet,
                "relevance_score": sim_score
            })
    return citations

def validate_citations(citations: List[Dict[str, Any]], retrieved_chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Strictly validates citations against retrieved chunks to discard any hallucinated references.
    """
    valid_pids = {str(c.get("paper_id")) for c in retrieved_chunks if c.get("paper_id")}
    validated = []
    for cit in citations:
        pid = str(cit.get("paper_id", ""))
        if pid and pid in valid_pids:
            validated.append(cit)
        elif not pid and len(valid_pids) == 1:
            cit["paper_id"] = list(valid_pids)[0]
            validated.append(cit)
    return validated if validated else format_citations(retrieved_chunks)
