import json
import logging
from typing import Dict, Any, List, Optional
from app.config import settings
from app.services.llm_client import llm_client, LLMException
from app.services.vector.retriever import retrieve_gap_evidence, format_citations, validate_citations

logger = logging.getLogger("researchgpt.gap_service")

GAP_SYSTEM_PROMPT = """You are ResearchGPT, a world-class academic research intelligence analyst.
Your goal is to synthesize grounded research evidence across multiple peer-reviewed papers to identify explicit limitations, unexplored research gaps, conflicting findings, and future research opportunities.

Rules & Grounding Guidelines:
1. Rely EXCLUSIVELY on the provided research context fragments. Do NOT fabricate or hallucinate external information.
2. Distinguish between:
   - "explicit" gaps: directly stated by the authors in limitations, discussion, or future work sections.
   - "inferred" gaps: logical extensions derived from conflicting findings or technological trade-offs across papers.
3. For each identified research gap, provide a structured object:
   - "gap": Concise description of the gap or bottleneck.
   - "type": "explicit" or "inferred".
   - "why_it_matters": Explanation of why resolving this gap is critical for the domain.
   - "supporting_papers": List of paper titles discussing or exhibiting this gap.
   - "evidence": Specific excerpt or factual detail from the text.
   - "confidence": "high", "medium", or "low" based on evidence depth.
4. If evidence on an aspect is limited, state "Evidence is limited in the current corpus."

You MUST respond ONLY with a valid JSON object matching this schema:
{
  "research_coverage": "Comprehensive synthesis of what the provided papers collectively cover and achieve.",
  "common_themes": ["Theme 1", "Theme 2"],
  "explicit_limitations": ["Limitation explicitly stated by Paper A", "Limitation explicitly stated by Paper B"],
  "conflicting_findings": ["Contradiction or differing methodology outcome across papers, or note if consistent"],
  "research_gaps": [
    {
      "gap": "Description of gap",
      "type": "explicit",
      "why_it_matters": "Significance to the field",
      "supporting_papers": ["Paper Title"],
      "evidence": ["Direct context excerpt or observation"],
      "confidence": "high"
    }
  ],
  "future_research_opportunities": ["Opportunity 1", "Opportunity 2"],
  "research_questions": ["Actionable research question 1", "Actionable research question 2"],
  "evidence_quality": "Assessment of the evidence sufficiency across the analyzed papers (e.g., High, Moderate, Limited)."
}
Do NOT include markdown code fences, reasoning text, or extra commentary outside the JSON."""

def _clean_string_list(val: Any) -> List[str]:
    if not isinstance(val, list):
        val = [str(val)] if val is not None else []
    clean = [str(v).strip() for v in val if v is not None and str(v).strip()]
    return clean if clean else ["Evidence is limited in the current corpus."]

def _clean_detailed_gaps(raw_gaps: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw_gaps, list):
        return []
    clean_gaps = []
    for g in raw_gaps:
        if isinstance(g, dict):
            gap_title = str(g.get("gap") or "").strip()
            if not gap_title:
                continue
            clean_gaps.append({
                "gap": gap_title,
                "type": "inferred" if str(g.get("type", "")).lower() == "inferred" else "explicit",
                "why_it_matters": str(g.get("why_it_matters") or "Crucial for scalability, efficiency, or security in this domain."),
                "supporting_papers": [str(p) for p in g.get("supporting_papers", []) if p],
                "evidence": [str(e) for e in g.get("evidence", []) if e],
                "confidence": str(g.get("confidence", "high")).lower() if str(g.get("confidence")).lower() in ["high", "medium", "low"] else "medium"
            })
        elif isinstance(g, str) and g.strip():
            clean_gaps.append({
                "gap": g.strip(),
                "type": "explicit",
                "why_it_matters": "Identified as a critical bottleneck in the literature.",
                "supporting_papers": [],
                "evidence": [],
                "confidence": "medium"
            })
    return clean_gaps

def generate_gap_analysis(papers_meta: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    Performs multi-paper balanced gap analysis using OpenRouter.
    papers_meta format: [{"paper_id": ..., "paper_title": ...}, ...]
    """
    if not papers_meta:
        return {
            "current_research_coverage": "No papers selected for analysis.",
            "research_coverage": "No papers selected.",
            "common_themes": [],
            "explicit_limitations": [],
            "conflicting_findings": [],
            "research_gaps": [],
            "detailed_gaps": [],
            "future_research_opportunities": [],
            "potential_research_questions": [],
            "research_questions": [],
            "evidence_quality": "Insufficient (no documents selected).",
            "citations": []
        }

    paper_ids = [p["paper_id"] for p in papers_meta if p.get("paper_id")]
    
    # Retrieve top 3 high-priority limitation/gap chunks per paper (balanced)
    all_chunks = retrieve_gap_evidence(paper_ids=paper_ids, top_k_per_paper=3)
    
    if not all_chunks:
        for p in papers_meta:
            all_chunks.append({
                "paper_title": p.get("paper_title", "Untitled"),
                "paper_id": p.get("paper_id"),
                "page": 1,
                "chunk_text": "No indexed text fragments available."
            })

    # Build token-budgeted prompt context
    context_blocks = []
    for c in all_chunks:
        p_title = c.get("paper_title", "Untitled")
        p_page = c.get("page", 1)
        text = c.get("chunk_text", c.get("text", ""))[:600]
        context_blocks.append(f"[Paper: {p_title} | Page {p_page}]\n{text}")

    full_context = "\n\n---\n\n".join(context_blocks)
    user_prompt = (
        f"Analyzed Papers ({len(papers_meta)} documents):\n"
        + "\n".join([f"- {p.get('paper_title')} (ID: {p.get('paper_id')})" for p in papers_meta])
        + f"\n\nRetrieved Evidence Context:\n{full_context}\n\n"
        + "Perform a comprehensive research gap analysis across these papers following the system instructions. Output raw JSON ONLY:"
    )

    messages = [
        {"role": "system", "content": GAP_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]

    try:
        logger.info(f"Triggering OpenRouter gap analysis for {len(papers_meta)} papers")
        data = llm_client.generate_json(messages=messages)
    except LLMException as e:
        logger.error(f"Gap analysis AI generation failed: {e.code} - {e.message}")
        raise RuntimeError(f"{e.code}: {e.message}")
    except Exception as e:
        logger.error(f"Gap analysis AI generation failed: {e}")
        raise RuntimeError(f"LLM_PROVIDER_ERROR: {e}")

    # Process structured output
    coverage = str(data.get("research_coverage") or data.get("current_research_coverage") or "The analyzed papers explore core methodologies and technical architectures in this domain.")
    common_themes = _clean_string_list(data.get("common_themes"))
    explicit_limitations = _clean_string_list(data.get("explicit_limitations"))
    conflicting_findings = _clean_string_list(data.get("conflicting_findings"))
    detailed_gaps = _clean_detailed_gaps(data.get("research_gaps"))
    
    # Backward compatibility flat gaps string list
    flat_gaps = [g["gap"] for g in detailed_gaps] if detailed_gaps else _clean_string_list(data.get("research_gaps"))
    
    future_ops = _clean_string_list(data.get("future_research_opportunities"))
    research_qs = _clean_string_list(data.get("research_questions") or data.get("potential_research_questions"))
    evidence_quality = str(data.get("evidence_quality") or ("High grounded fidelity across indexed papers." if len(all_chunks) >= 3 else "Limited corpus evidence."))

    citations = format_citations(all_chunks)
    validated_citations = validate_citations(citations, all_chunks)

    return {
        "current_research_coverage": coverage,
        "research_coverage": coverage,
        "common_themes": common_themes,
        "explicit_limitations": explicit_limitations,
        "conflicting_findings": conflicting_findings,
        "research_gaps": flat_gaps,
        "detailed_gaps": detailed_gaps,
        "future_research_opportunities": future_ops,
        "potential_research_questions": research_qs,
        "research_questions": research_qs,
        "evidence_quality": evidence_quality,
        "citations": validated_citations
    }
