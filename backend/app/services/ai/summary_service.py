import json
from typing import Dict, Any, List
from app.config import settings
from app.services.ai.rag_service import get_groq_client
from app.services.vector.retriever import retrieve_relevant_chunks

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
3. Return raw valid JSON only."""

def generate_paper_summary(paper_id: str) -> Dict[str, Any]:
    """
    Retrieves representative chunks for a selected paper and queries Groq to generate structured summary.
    Returns:
        {
            "executive_summary": "...",
            "key_contributions": [...],
            "methodology": "...",
            "results": "...",
            "limitations": "..."
        }
    """
    query = "abstract introduction contributions methodology experimental setup results conclusion limitations"
    chunks = retrieve_relevant_chunks(query=query, top_k=10, filter_paper_id=paper_id)

    if not chunks:
        return {
            "executive_summary": "Could not retrieve indexed text fragments for this research paper.",
            "key_contributions": ["No indexed document context available."],
            "methodology": "Not explicitly mentioned.",
            "results": "Not explicitly mentioned.",
            "limitations": "Not explicitly mentioned."
        }

    context_text = "\n\n---\n\n".join([
        f"[Page {c.get('page', 1)}]\n{c.get('chunk_text', c.get('text', ''))}"
        for c in chunks
    ])
    user_prompt = f"Research Paper Context Fragments (Document ID: {paper_id}):\n{context_text}\n\nGenerate the structured JSON summary below:"

    model_name = getattr(settings, "GROQ_MODEL", "llama-3.3-70b-versatile")
    client = get_groq_client()

    try:
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            model=model_name,
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        raw_content = completion.choices[0].message.content.strip() if completion.choices else "{}"
        data = json.loads(raw_content)
    except Exception as e:
        raise RuntimeError(f"Summary AI generation failed: {e}")

    # Safeguard structure contract
    contributions = data.get("key_contributions", [])
    if not isinstance(contributions, list):
        contributions = [str(contributions)] if contributions else []

    return {
        "executive_summary": str(data.get("executive_summary", "Summary unavailable.")),
        "key_contributions": contributions,
        "methodology": str(data.get("methodology", "Not specified.")),
        "results": str(data.get("results", "Not specified.")),
        "limitations": str(data.get("limitations", "Not specified."))
    }
