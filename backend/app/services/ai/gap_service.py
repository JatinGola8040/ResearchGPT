import json
from typing import Dict, Any, List
from app.config import settings
from app.services.ai.rag_service import get_groq_client, build_rag_prompt
from app.services.vector.retriever import retrieve_relevant_chunks

GAP_SYSTEM_PROMPT = """You are ResearchGPT, an expert academic research gap analysis assistant.
Your goal is to analyze retrieved text fragments across multiple research papers to identify current research coverage, common themes, conflicting findings, research gaps, future opportunities, and potential questions.

You MUST respond ONLY with a valid JSON object containing precisely these keys:
- "current_research_coverage": A comprehensive synthesis string summarizing what the current research across these papers collectively covers.
- "common_themes": An array of strings describing shared methodologies, goals, or findings across the papers.
- "conflicting_findings": An array of strings highlighting any contradictory results, disagreements, or differing conclusions across the papers. If none found, note that.
- "research_gaps": An array of strings identifying critical unexplored areas, unaddressed problems, or technological limitations.
- "future_research_opportunities": An array of strings proposing concrete avenues for future investigation or extensions based on the limitations.
- "potential_research_questions": An array of specific, actionable research questions that future studies could address to bridge these gaps.

Rules:
1. Rely strictly on the provided text fragments. Do not hallucinate external details.
2. If any aspect lacks sufficient evidence in the retrieved context, return "Not explicitly mentioned in the retrieved context." for strings or ["Not explicitly mentioned."] for arrays.
3. Return raw valid JSON only."""

def _clean_list(val: Any) -> List[str]:
    if not isinstance(val, list):
        val = [str(val)] if val is not None else []
    clean = [str(v) for v in val if v is not None and str(v).strip()]
    return clean if clean else ["Not explicitly mentioned."]

def generate_gap_analysis(papers_meta: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Retrieves representative chunks for selected papers and queries Groq to generate structured research gap report.
    papers_meta format: [{"paper_id": ..., "paper_title": ...}, ...]
    """
    all_chunks = []
    query = "abstract research gaps open challenges limitations future work unresolved questions conflicting findings conclusions"

    for p in papers_meta:
        pid = p["paper_id"]
        title = p["paper_title"]
        chunks = retrieve_relevant_chunks(query=query, top_k=8, filter_paper_id=pid)
        if not chunks:
            chunks = [{
                "paper_title": title,
                "page": 1,
                "chunk_text": "No indexed document context available for this research paper."
            }]
        all_chunks.extend(chunks)

    question = "Analyze the retrieved research paper fragments to detect research gaps, current coverage, common themes, conflicting findings, future research opportunities, and potential research questions. Generate the structured JSON gap analysis below."
    user_prompt = build_rag_prompt(all_chunks, question)

    model_name = getattr(settings, "GROQ_MODEL", "llama-3.3-70b-versatile")
    client = get_groq_client()

    try:
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": GAP_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            model=model_name,
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        raw_content = completion.choices[0].message.content.strip() if completion.choices else "{}"
        data = json.loads(raw_content)
    except Exception as e:
        raise RuntimeError(f"Research gap analysis AI generation failed: {e}")

    return {
        "current_research_coverage": str(data.get("current_research_coverage") or "Not specified."),
        "common_themes": _clean_list(data.get("common_themes")),
        "conflicting_findings": _clean_list(data.get("conflicting_findings")),
        "research_gaps": _clean_list(data.get("research_gaps")),
        "future_research_opportunities": _clean_list(data.get("future_research_opportunities")),
        "potential_research_questions": _clean_list(data.get("potential_research_questions"))
    }
