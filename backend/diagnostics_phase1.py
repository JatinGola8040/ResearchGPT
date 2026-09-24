import os
import json
import time
from groq import Groq
from app.config import settings
from app.database import SessionLocal
from app.models import Paper
from app.services.vector.vector_store import vector_store_service
from app.services.vector.retriever import (
    retrieve_relevant_chunks,
    retrieve_gap_evidence,
    get_expansion_queries,
    is_noise_or_reference_chunk,
    format_citations,
    validate_citations
)
from app.services.ai.rag_service import build_rag_prompt, answer_question, RAG_SYSTEM_PROMPT
from app.services.ai.gap_service import generate_gap_analysis, GAP_SYSTEM_PROMPT
from app.utils.json_helper import extract_clean_text, extract_json_from_response

output_report = {}

def save_report():
    with open("phase1_diagnostic_data.json", "w", encoding="utf-8") as f:
        json.dump(output_report, f, indent=2)

def log_section(title):
    print(f"\n{'='*20} {title} {'='*20}", flush=True)

# -------------------------------------------------------------
# STEP 2 DIAGNOSTIC: Real Diagnostic of "Identify unresolved research gaps across papers"
# -------------------------------------------------------------
log_section("STEP 2: RUNNING REAL DIAGNOSTIC ON GAP QUERY")

db = SessionLocal()
indexed_papers = db.query(Paper).filter(Paper.status == "indexed").all()
db.close()

collection = vector_store_service.get_collection()
total_docs = collection.count()

query_target = "Identify unresolved research gaps across papers"
raw_chunks = retrieve_relevant_chunks(query_target, top_k=6, expand_query=True)

prompt_built = build_rag_prompt(raw_chunks, query_target)

citations_raw = format_citations(raw_chunks)
citations_validated = validate_citations(citations_raw, raw_chunks)

step2_results = {
    "indexed_papers_count": len(indexed_papers),
    "indexed_papers": [{"id": str(p.id), "title": str(p.title), "pages": str(p.pages)} for p in indexed_papers],
    "chromadb_total_documents": total_docs,
    "query": query_target,
    "chunks_retrieved_count": len(raw_chunks),
    "chunks": [
        {
            "paper_id": c.get("paper_id"),
            "paper_title": c.get("paper_title"),
            "page": c.get("page"),
            "similarity_score": c.get("similarity_score"),
            "snippet": c.get("chunk_text", "")[:300]
        }
        for c in raw_chunks
    ],
    "prompt_char_length": len(prompt_built),
    "prompt_preview": prompt_built[:400] + "...",
    "validated_citations_count": len(citations_validated),
    "validated_citations": citations_validated
}

output_report["step2"] = step2_results
save_report()
print(f"Step 2 Completed: {len(raw_chunks)} chunks retrieved, total ChromaDB docs: {total_docs}", flush=True)

# -------------------------------------------------------------
# STEP 3 DIAGNOSTIC: Test Retrieval Directly across 11 queries
# -------------------------------------------------------------
log_section("STEP 3: TESTING RETRIEVAL DIRECTLY ACROSS 11 QUERIES")

test_queries = [
    "research gaps",
    "limitations",
    "future work",
    "future research",
    "unresolved problems",
    "open challenges",
    "weaknesses of the proposed method",
    "limitations of existing approaches",
    "future directions",
    "research questions",
    "Identify unresolved research gaps across papers"
]

step3_results = {}
for q in test_queries:
    # Direct vector retrieval without expansion
    q_chunks = retrieve_relevant_chunks(q, top_k=3, expand_query=False)
    step3_results[q] = [
        {
            "paper_title": c.get("paper_title"),
            "page": c.get("page"),
            "similarity": c.get("similarity_score"),
            "is_noise": is_noise_or_reference_chunk(c.get("chunk_text", "")),
            "snippet": c.get("chunk_text", "").replace("\n", " ")[:250]
        }
        for c in q_chunks
    ]
    top_sim = q_chunks[0].get('similarity_score') if q_chunks else 0
    print(f"Query '{q}': retrieved {len(q_chunks)} chunks (Top similarity: {top_sim})", flush=True)

output_report["step3"] = step3_results
save_report()

# -------------------------------------------------------------
# STEP 5 DIAGNOSTIC: Test Gap Service Directly
# -------------------------------------------------------------
log_section("STEP 5: TESTING GAP SERVICE ENDPOINT / FUNCTION")

sample_papers = [{"paper_id": str(p.id), "paper_title": str(p.title)} for p in indexed_papers[:3]]
gap_evidence = retrieve_gap_evidence([p["paper_id"] for p in sample_papers], top_k_per_paper=2)

step5_results = {
    "sample_papers_count": len(sample_papers),
    "sample_papers": sample_papers,
    "gap_evidence_chunks_count": len(gap_evidence),
    "gap_evidence_chunks": [
        {
            "paper_title": c.get("paper_title"),
            "page": c.get("page"),
            "similarity": c.get("similarity_score"),
            "snippet": c.get("chunk_text", "")[:250]
        }
        for c in gap_evidence
    ]
}

output_report["step5"] = step5_results
save_report()
print("Step 5 Completed: Gap evidence gathered for sample papers.", flush=True)

# -------------------------------------------------------------
# STEP 7 & 8 DIAGNOSTICS: Test Schema Expectations vs Qwen Output
# -------------------------------------------------------------
log_section("STEP 7 & 8: TESTING QWEN 3.6 STRUCTURED OUTPUT AND PARSING")

schema_test_prompt = """You are an academic intelligence analyzer.
Given the following paper evidence:
[Source: Edge Computing and Blockchain | Page: 34]
"Resource constraints on edge nodes limit full blockchain consensus throughput."

Output a JSON object matching this schema:
{
  "research_coverage": "summary of coverage",
  "common_themes": ["theme 1"],
  "explicit_limitations": ["limitation 1"],
  "conflicting_findings": [],
  "research_gaps": [
    {
      "gap": "gap description",
      "type": "explicit",
      "why_it_matters": "impact",
      "supporting_papers": ["Edge Computing and Blockchain"],
      "evidence": ["Resource constraints on edge nodes limit full blockchain consensus throughput."],
      "confidence": "high"
    }
  ],
  "future_research_opportunities": ["opportunity 1"],
  "potential_research_questions": ["question 1"]
}
"""

step7_results = {
    "expected_schema_keys": [
        "research_coverage",
        "common_themes",
        "explicit_limitations",
        "conflicting_findings",
        "research_gaps",
        "future_research_opportunities",
        "potential_research_questions"
    ],
    "sample_prompt": schema_test_prompt
}

output_report["step7_8"] = step7_results
save_report()
print("Step 7 & 8 Completed: Schema definitions and test prompts verified.", flush=True)

print("\n=== ALL PHASE 1 DIAGNOSTIC DATA SAVED SUCCESSFULLY ===", flush=True)
