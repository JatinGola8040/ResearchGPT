import sys
sys.stdout.reconfigure(encoding='utf-8')
import re
from typing import List, Dict, Any, Optional
from app.database import SessionLocal
from app.models import Paper
from app.services.vector.embedding_service import get_embedding_model
from app.services.vector.vector_store import vector_store_service

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
    if "Marie Skłodowska-Curie Actions" in text or "IEEE Transactions" in text and "Manuscript received" in text:
        # Check if it's mostly affiliations
        if len(re.findall(r'(Department|University|Institute|Laboratory|Faculty)', text)) >= 3 and len(text) < 400:
            return True
            
    return False

def get_gap_expansion_queries(query: str) -> List[str]:
    queries = [query]
    q_lower = query.lower()
    if any(k in q_lower for k in ["gap", "unresolved", "limit", "future", "challenge", "open problem", "weakness"]):
        queries.append("limitations unresolved challenges future work open problems shortcomings weaknesses")
        queries.append("experimental results trade-offs scalability latency security constraints")
    elif any(k in q_lower for k in ["compare", "method", "architecture", "technique", "approach"]):
        queries.append("methodology proposed architecture experimental setup dataset evaluation")
    return queries

db = SessionLocal()
papers = db.query(Paper).filter(Paper.status == "indexed").all()
p_map = {p.id: p.title for p in papers}
db.close()

model = get_embedding_model()
coll = vector_store_service.get_collection()

query = "Identify unresolved research gaps across papers"
exp_queries = get_gap_expansion_queries(query)
print("Expanded queries:", exp_queries)

all_chunks = {}
for q in exp_queries:
    vec = model.encode(q, show_progress_bar=False).tolist()
    res = coll.query(query_embeddings=[vec], n_results=15, include=["documents", "metadatas", "distances"])
    if res and res["documents"] and res["documents"][0]:
        for doc, meta, dist in zip(res["documents"][0], res["metadatas"][0], res["distances"][0]):
            if is_noise_or_reference_chunk(doc):
                continue
            sim = round(1.0 - float(dist), 4)
            cid = f"{meta.get('paper_id')}_{meta.get('chunk_id')}"
            if cid not in all_chunks or sim > all_chunks[cid]["similarity_score"]:
                all_chunks[cid] = {
                    "paper_id": meta.get("paper_id"),
                    "paper_title": p_map.get(meta.get("paper_id"), "Untitled"),
                    "page": meta.get("page", 1),
                    "similarity_score": sim,
                    "chunk_text": doc
                }

sorted_chunks = sorted(all_chunks.values(), key=lambda x: x["similarity_score"], reverse=True)
print(f"\nFound {len(sorted_chunks)} clean, relevant chunks:")
for i, c in enumerate(sorted_chunks[:8]):
    print(f"[{i+1}] Paper: '{c['paper_title']}' | Page: {c['page']} | Sim: {c['similarity_score']:.4f}")
    snippet = c['chunk_text'][:160].replace('\n', ' ')
    print(f"    Text: {snippet}...\n")
