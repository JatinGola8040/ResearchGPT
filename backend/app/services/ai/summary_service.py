import json
import logging
from typing import Dict, Any, List
from app.config import settings
from app.services.llm_client import llm_client, LLMException
from app.services.vector.retriever import retrieve_relevant_chunks, format_citations, validate_citations
from app.schemas import PaperSummaryResponse

logger = logging.getLogger("researchgpt.summary_service")

SUMMARY_SYSTEM_PROMPT = """You are ResearchGPT, an expert academic research summarization assistant.
Your goal is to generate a structured, comprehensive summary of the provided research paper fragments.

You MUST respond ONLY with a valid JSON object containing precisely these keys:
- "executive_summary": A concise 2-3 sentence high-level overview.
- "key_contributions": An array of strings highlighting main innovations or findings.
- "methodology": Summary of the experimental design, algorithms, or setup.
- "results": Summary of key quantitative or qualitative outcomes.
- "limitations": Discuss open challenges or constraints mentioned.

Rules:
1. Rely strictly on the provided text fragments.
2. If any section lacks sufficient evidence in the text, return "Not explicitly mentioned in the retrieved context." for strings or ["Not explicitly mentioned."] for arrays.
3. Return raw valid JSON only. Do not include markdown code fences, reasoning text, or extra commentary."""

def generate_paper_summary(paper_id: str) -> Dict[str, Any]:
    """
    Retrieves representative chunks for a selected paper and queries OpenRouter to generate structured summary.
    """
    query = "abstract introduction contributions methodology experimental setup results conclusion limitations"
    chunks = retrieve_relevant_chunks(
        query=query,
        top_k=8,
        filter_paper_id=paper_id,
        expand_query=True
    )

    if not chunks:
        return {
            "executive_summary": "Could not retrieve indexed text fragments for this research paper.",
            "key_contributions": ["No indexed document context available."],
            "methodology": "Not explicitly mentioned.",
            "results": "Not explicitly mentioned.",
            "limitations": "Not explicitly mentioned.",
            "citations": []
        }

    context_text = "\n\n---\n\n".join([
        f"[Page {c.get('page', 1)}]\n{c.get('chunk_text', c.get('text', ''))[:700]}"
        for c in chunks
    ])
    user_prompt = f"Research Paper Context Fragments (Document ID: {paper_id}):\n{context_text}\n\nGenerate the structured JSON summary below:"

    messages = [
        {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]

    try:
        logger.info(f"Generating summary for paper {paper_id} using OpenRouter")
        data = llm_client.generate_json(messages=messages)
    except LLMException as e:
        logger.error(f"Summary AI generation failed: {e.code} - {e.message}")
        raise RuntimeError(f"{e.code}: {e.message}")
    except Exception as e:
        logger.error(f"Summary AI generation failed: {e}")
        raise RuntimeError(f"LLM_PROVIDER_ERROR: {e}")

    contributions = data.get("key_contributions", [])
    if not isinstance(contributions, list):
        contributions = [str(contributions)] if contributions else []

    raw_citations = format_citations(chunks)
    validated_citations = validate_citations(raw_citations, chunks)

    return {
        "executive_summary": str(data.get("executive_summary", "Summary unavailable.")),
        "key_contributions": contributions,
        "methodology": str(data.get("methodology", "Not specified.")),
        "results": str(data.get("results", "Not specified.")),
        "limitations": str(data.get("limitations", "Not specified.")),
        "citations": validated_citations
    }
