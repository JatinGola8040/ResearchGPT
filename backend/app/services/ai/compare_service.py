import json
import logging
from typing import Dict, Any, List
from app.config import settings
from app.services.llm_client import llm_client, LLMException
from app.services.vector.retriever import retrieve_relevant_chunks, format_citations, validate_citations

logger = logging.getLogger("researchgpt.compare_service")

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
3. Return raw valid JSON only. Do not include markdown code fences, reasoning text, or extra commentary."""

def generate_papers_comparison(papers_meta: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Retrieves representative chunks for selected papers and queries OpenRouter to generate structured comparative analysis.
    """
    context_blocks = []
    query = "abstract research objective goals methodology architecture dataset benchmarks evaluation results strengths limitations conclusion"

    all_chunks = []
    for p in papers_meta:
        pid = p["paper_id"]
        title = p["paper_title"]
        chunks = retrieve_relevant_chunks(
            query=query,
            top_k=4,
            filter_paper_id=pid,
            expand_query=True
        )
        all_chunks.extend(chunks)

        paper_text = "\n".join([
            f"[Page {c.get('page', 1)}]\n{c.get('chunk_text', c.get('text', ''))[:600]}"
            for c in chunks
        ])
        if not paper_text.strip():
            paper_text = "No indexed document context available for this document."

        context_blocks.append(f"=== RESEARCH PAPER: {title} (ID: {pid}) ===\n{paper_text}")

    full_context = "\n\n---\n\n".join(context_blocks)
    user_prompt = f"Retrieved Research Literature Context:\n{full_context}\n\nGenerate the structured comparative JSON analysis below:"

    messages = [
        {"role": "system", "content": COMPARE_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]

    try:
        logger.info(f"Generating comparison across {len(papers_meta)} papers using OpenRouter")
        data = llm_client.generate_json(messages=messages)
    except LLMException as e:
        logger.error(f"Comparative analysis AI generation failed: {e.code} - {e.message}")
        raise RuntimeError(f"{e.code}: {e.message}")
    except Exception as e:
        logger.error(f"Comparative analysis AI generation failed: {e}")
        raise RuntimeError(f"LLM_PROVIDER_ERROR: {e}")

    differences = data.get("key_differences", [])
    if not isinstance(differences, list):
        differences = [str(differences)] if differences else []
    clean_differences = [str(d) for d in differences if d is not None]

    raw_citations = format_citations(all_chunks)
    validated_citations = validate_citations(raw_citations, all_chunks)

    return {
        "research_objective": str(data.get("research_objective") or "Not specified."),
        "methodology": str(data.get("methodology") or "Not specified."),
        "datasets": str(data.get("datasets") or "Not specified."),
        "strengths": str(data.get("strengths") or "Not specified."),
        "limitations": str(data.get("limitations") or "Not specified."),
        "key_differences": clean_differences,
        "overall_conclusion": str(data.get("overall_conclusion") or "Not specified."),
        "citations": validated_citations
    }
