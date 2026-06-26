import json
from typing import Dict, Any, List
from app.config import settings
from app.services.ai.rag_service import get_groq_client
from app.services.vector.retriever import retrieve_relevant_chunks

COMPARE_SYSTEM_PROMPT = """You are ResearchGPT, an expert academic comparative analysis assistant.
Your goal is to generate a comprehensive comparative synthesis across multiple research papers based strictly on the retrieved text fragments.

You MUST respond ONLY with a valid JSON object containing precisely these keys:
- "research_objective": Comparative synthesis of the primary goals across the papers.
- "methodology": Contrast the architectures, algorithms, or experimental setups.
- "datasets": Contrast the benchmarks, evaluation data, or training corpuses used.
- "strengths": Comparative advantages and key innovations of each approach.
- "limitations": Comparative drawbacks, trade-offs, or open challenges.
- "key_differences": An array of strings highlighting the critical technical distinctions between the papers.
- "overall_conclusion": A definitive concluding summary on how these papers relate and advance the field.

Rules:
1. Rely strictly on the provided text fragments. Do not hallucinate external details.
2. If any aspect lacks sufficient evidence in the retrieved context, return "Not explicitly mentioned in the retrieved context." for strings or ["Not explicitly mentioned."] for arrays.
3. Return raw valid JSON only."""

def generate_papers_comparison(papers_meta: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Retrieves representative chunks for selected papers and queries Groq to generate structured comparative analysis.
    papers_meta format: [{"paper_id": ..., "paper_title": ...}, ...]
    """
    context_blocks = []
    query = "abstract research objective goals methodology architecture dataset benchmarks evaluation results strengths limitations conclusion"

    for p in papers_meta:
        pid = p["paper_id"]
        title = p["paper_title"]
        chunks = retrieve_relevant_chunks(query=query, top_k=8, filter_paper_id=pid)

        paper_text = "\n".join([
            f"[Page {c.get('page', 1)}]\n{c.get('chunk_text', c.get('text', ''))}"
            for c in chunks
        ])
        if not paper_text.strip():
            paper_text = "No indexed document context available for this document."

        context_blocks.append(f"=== RESEARCH PAPER: {title} (ID: {pid}) ===\n{paper_text}")

    full_context = "\n\n".join(context_blocks)
    user_prompt = f"Retrieved Research Literature Context:\n{full_context}\n\nGenerate the structured comparative JSON analysis below:"

    model_name = getattr(settings, "GROQ_MODEL", "llama-3.3-70b-versatile")
    client = get_groq_client()

    try:
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": COMPARE_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            model=model_name,
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        raw_content = completion.choices[0].message.content.strip() if completion.choices else "{}"
        data = json.loads(raw_content)
    except Exception as e:
        raise RuntimeError(f"Comparative analysis AI generation failed: {e}")

    differences = data.get("key_differences", [])
    if not isinstance(differences, list):
        differences = [str(differences)] if differences else []
    clean_differences = [str(d) for d in differences if d is not None]

    return {
        "research_objective": str(data.get("research_objective") or "Not specified."),
        "methodology": str(data.get("methodology") or "Not specified."),
        "datasets": str(data.get("datasets") or "Not specified."),
        "strengths": str(data.get("strengths") or "Not specified."),
        "limitations": str(data.get("limitations") or "Not specified."),
        "key_differences": clean_differences,
        "overall_conclusion": str(data.get("overall_conclusion") or "Not specified.")
    }
