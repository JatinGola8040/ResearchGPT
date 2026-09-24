import re
import logging
from typing import List, Dict, Any, Optional
from app.config import settings
from app.services.llm_client import llm_client, LLMException
from app.services.vector.retriever import retrieve_relevant_chunks, format_citations, validate_citations

logger = logging.getLogger("researchgpt.rag_service")

RAG_SYSTEM_PROMPT = """You are ResearchGPT, an elite academic research intelligence assistant.
Your mission is to synthesize rigorous, deeply insightful, and evidence-grounded answers based on the provided research paper context fragments.

Guidelines:
1. Synthesize insights, architectures, methodologies, trade-offs, limitations, and future directions directly from the provided text excerpts.
2. Even if a user asks high-level synthesis questions (such as identifying research gaps, comparing methodologies, or analyzing trends), actively analyze the technical challenges, trade-offs, constraints, and open problems discussed across the excerpts to provide a thorough, structured academic answer.
3. Reference specific paper titles or page numbers when citing findings.
4. Structure your response with clear markdown headings, bullet points, and bold key terms for maximum readability.
5. If certain aspects requested by the user are not covered in the excerpts, provide what IS covered in detail and briefly note the boundaries of the retrieved data.
6. Do NOT fabricate citations or external sources not present in the excerpts."""

def build_rag_prompt(chunks: List[Dict[str, Any]], question: str) -> str:
    """
    Constructs a structured, token-budgeted grounded user prompt from retrieved chunks.
    """
    context_blocks = []
    for chunk in chunks:
        title = chunk.get("paper_title", "Untitled Paper")
        page = chunk.get("page", 1)
        text = chunk.get("chunk_text", chunk.get("text", ""))[:800]
        context_blocks.append(f"[Source: {title} | Page: {page}]\n{text}")

    formatted_context = "\n\n---\n\n".join(context_blocks)
    return (
        f"Retrieved Research Context Excerpts:\n{formatted_context}\n\n"
        f"User Question: {question}\n\n"
        f"Please provide a comprehensive, well-structured academic response based strictly on the retrieved context above:"
    )

def answer_question(
    question: str,
    paper_ids: Optional[List[str]] = None,
    paper_id: Optional[str] = None,
    filter_paper_ids: Optional[List[str]] = None,
    filter_paper_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Core RAG answering engine powered by OpenRouter and openai/gpt-oss-120b.
    Performs vector similarity retrieval across ChromaDB, builds context prompt, queries OpenRouter,
    and validates citations against retrieved ground truth.
    """
    if not question or not question.strip():
        return {
            "answer": "Please provide a valid research question.",
            "citations": []
        }

    target_ids = []
    p_ids = paper_ids or filter_paper_ids
    if p_ids:
        target_ids.extend([p for p in p_ids if p and p.strip()])
    single_p = paper_id or filter_paper_id
    if single_p and single_p not in target_ids:
        target_ids.append(single_p)

    # Step 1: Retrieve Top 6 relevant chunks with query expansion and noise filtering
    chunks = retrieve_relevant_chunks(
        query=question,
        top_k=6,
        filter_paper_ids=target_ids if target_ids else None,
        expand_query=True,
        per_paper_balance=(len(target_ids) > 1)
    )

    if not chunks:
        return {
            "answer": "I could not find sufficient evidence in the uploaded research papers.",
            "citations": []
        }

    # Step 2: Build grounded prompt
    user_prompt_content = build_rag_prompt(chunks, question)

    # Step 3: Call centralized OpenRouter LLM client
    messages = [
        {"role": "system", "content": RAG_SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt_content}
    ]

    try:
        logger.info(f"Querying OpenRouter RAG for question: {question[:60]}")
        max_toks = getattr(settings, "LLM_MAX_TOKENS", 4096)
        answer_text = llm_client.generate(messages=messages, max_tokens=max_toks)
    except LLMException as e:
        logger.error(f"LLM generation failed: {e.code} - {e.message}")
        raise RuntimeError(f"{e.code}: {e.message}")
    except Exception as e:
        logger.error(f"Unexpected LLM generation error: {e}")
        raise RuntimeError(f"LLM_PROVIDER_ERROR: {e}")

    # Step 4: Extract and validate citations
    raw_citations = format_citations(chunks)
    validated = validate_citations(raw_citations, chunks)

    return {
        "answer": answer_text,
        "citations": validated
    }
