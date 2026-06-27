import json
from typing import Dict, Any, List
from app.config import settings
from app.services.ai.rag_service import get_groq_client, build_rag_prompt
from app.services.vector.retriever import retrieve_relevant_chunks

LITERATURE_SYSTEM_PROMPT = """You are ResearchGPT, an expert academic literature review assistant.
Your goal is to synthesize retrieved text fragments across multiple research papers into a comprehensive, structured academic literature review.

You MUST respond ONLY with a valid JSON object containing precisely these keys:
- "title": A comprehensive, academic title for this literature review.
- "introduction": A synthesized overview introducing the domain and background of the reviewed papers.
- "research_objectives": Synthesis of the primary goals and research questions explored across the papers.
- "related_work": Summary of the theoretical background and prior work discussed in the papers.
- "methodology_comparison": Contrast and comparison of the architectures, models, algorithms, or experimental designs used.
- "datasets_used": Synthesis of benchmarks, corpora, evaluation metrics, or datasets utilized across the studies.
- "key_findings": Summary of the primary empirical results and major takeaways.
- "research_trends": Analysis of emerging directions, patterns, or technological evolution evident across the papers.
- "research_gaps": Unexplored areas, open challenges, or trade-offs identified in the reviewed literature.
- "future_scope": Recommended avenues for future research based on collective limitations.
- "conclusion": Concluding synthesis summarizing the overall impact and contribution of these papers to the field.
- "references": An array of objects, where each object has precisely two string keys: "paper_title" (the exact title of the paper) and "citation" (a formal academic citation string or summary note for that paper).

Rules:
1. Rely strictly on the provided text fragments. Do not hallucinate external details.
2. If any aspect lacks sufficient evidence in the retrieved context, return "Not explicitly mentioned in the retrieved context." for string fields.
3. Return raw valid JSON only."""

def _clean_references(val: Any, papers_meta: List[Dict[str, str]]) -> List[Dict[str, str]]:
    if not isinstance(val, list):
        val = []
    clean = []
    for item in val:
        if isinstance(item, dict):
            title = str(item.get("paper_title") or "").strip()
            citation = str(item.get("citation") or "").strip()
            if title or citation:
                clean.append({
                    "paper_title": title or "Unknown Paper",
                    "citation": citation or "Citation unavailable."
                })
    if not clean:
        for p in papers_meta:
            clean.append({
                "paper_title": p["paper_title"],
                "citation": f"[Indexed Document] {p['paper_title']} (ID: {p['paper_id']})"
            })
    return clean

def generate_literature_review(papers_meta: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Retrieves representative chunks for selected papers and queries Groq to generate structured literature review.
    papers_meta format: [{"paper_id": ..., "paper_title": ...}, ...]
    """
    all_chunks = []
    query = "abstract introduction objectives related work methodology datasets benchmark results findings trends gaps future conclusion"

    for p in papers_meta:
        pid = p["paper_id"]
        title = p["paper_title"]
        chunks = retrieve_relevant_chunks(query=query, top_k=6, filter_paper_id=pid)
        if not chunks:
            chunks = [{
                "paper_title": title,
                "page": 1,
                "chunk_text": "No indexed document context available for this research paper."
            }]
        all_chunks.extend(chunks)

    question = "Analyze the retrieved research paper fragments and generate a comprehensive academic literature review synthesizing introduction, objectives, related work, methodologies, datasets, findings, trends, gaps, future scope, conclusion, and references. Generate the structured JSON literature review below."
    user_prompt = build_rag_prompt(all_chunks, question)

    model_name = getattr(settings, "GROQ_MODEL", "llama-3.3-70b-versatile")
    client = get_groq_client()

    try:
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": LITERATURE_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            model=model_name,
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        raw_content = completion.choices[0].message.content.strip() if completion.choices else "{}"
        data = json.loads(raw_content)
    except Exception as e:
        raise RuntimeError(f"Literature review AI generation failed: {e}")

    return {
        "title": str(data.get("title") or "Literature Review"),
        "introduction": str(data.get("introduction") or "Not specified."),
        "research_objectives": str(data.get("research_objectives") or "Not specified."),
        "related_work": str(data.get("related_work") or "Not specified."),
        "methodology_comparison": str(data.get("methodology_comparison") or "Not specified."),
        "datasets_used": str(data.get("datasets_used") or "Not specified."),
        "key_findings": str(data.get("key_findings") or "Not specified."),
        "research_trends": str(data.get("research_trends") or "Not specified."),
        "research_gaps": str(data.get("research_gaps") or "Not specified."),
        "future_scope": str(data.get("future_scope") or "Not specified."),
        "conclusion": str(data.get("conclusion") or "Not specified."),
        "references": _clean_references(data.get("references"), papers_meta)
    }
