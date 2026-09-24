import sys
import json
sys.stdout.reconfigure(encoding='utf-8')

from app.services.vector.retriever import retrieve_relevant_chunks, format_citations
from app.services.vector.vector_store import vector_store_service
from app.services.ai.rag_service import answer_question, build_rag_prompt
from app.services.ai.gap_service import generate_gap_analysis
from app.database import SessionLocal
from app.models import Paper

db = SessionLocal()
papers = db.query(Paper).filter(Paper.status == "indexed").all()
print(f"=== Database Indexed Papers ({len(papers)}) ===")
for p in papers:
    print(f" - [{p.id}] {p.title} ({p.pages} pages)")

coll = vector_store_service.get_collection()
print(f"\n=== ChromaDB Collection ===")
print(f"Collection Name: {coll.name}")
print(f"Total Chunks in ChromaDB: {coll.count()}")

query = "Identify unresolved research gaps across papers"
print(f"\n=== Testing Query in Generic RAG: '{query}' ===")
chunks = retrieve_relevant_chunks(query, top_k=10)
print(f"Retrieved {len(chunks)} chunks:")
for i, c in enumerate(chunks):
    sim = c.get("similarity_score", c.get("score", 0.0))
    print(f"[{i+1}] Paper: {c.get('paper_title')} | Page: {c.get('page')} | Sim: {sim:.4f}")
    snippet = c.get('chunk_text', '')[:140].replace('\n', ' ')
    print(f"    Snippet: {snippet}...")

print("\n=== Testing AI Answer Generation for Generic RAG ===")
ans = answer_question(query)
print("Answer Result:")
print(ans.get("answer"))
print(f"Citations Returned: {len(ans.get('citations', []))}")

print("\n=== Testing Multi-Paper Gap Analysis Service ===")
selected_meta = [{"paper_id": p.id, "paper_title": p.title} for p in papers[:3]]
gap_res = generate_gap_analysis(selected_meta)
print("Gap Analysis Output Keys:", list(gap_res.keys()))
print("Coverage:", gap_res.get("current_research_coverage")[:200])
print("Research Gaps:", gap_res.get("research_gaps"))

db.close()
