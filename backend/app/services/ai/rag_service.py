from typing import List, Dict, Any, Optional
from groq import Groq
from app.config import settings
from app.services.vector.retriever import retrieve_relevant_chunks

# Exact System Prompt requested
RAG_SYSTEM_PROMPT = (
    "You are ResearchGPT.\n"
    "You answer ONLY from the retrieved research papers.\n"
    "Never answer using prior knowledge.\n"
    "If the retrieved context does not contain the answer, reply exactly:\n"
    '"I could not find sufficient evidence in the uploaded research papers."'
)

def build_rag_prompt(chunks: List[Dict[str, Any]], question: str) -> str:
    """
    Separate helper function constructing grounded user prompt from retrieved chunks.
    """
    context_blocks = []
    for chunk in chunks:
        title = chunk.get("paper_title", "Untitled Paper")
        page = chunk.get("page", 1)
        text = chunk.get("chunk_text", chunk.get("text", ""))
        context_blocks.append(f"[Source Paper: {title} | Page: {page}]\n{text}")

    formatted_context = "\n\n---\n\n".join(context_blocks)
    return f"Retrieved Research Context:\n{formatted_context}\n\nUser Question: {question}\n\nAnswer strictly from the retrieved context above:"

_groq_client = None

def get_groq_client() -> Groq:
    """
    Lazy singleton initialization of official Groq API client.
    """
    global _groq_client
    if _groq_client is None:
        api_key = getattr(settings, "GROQ_API_KEY", "")
        _groq_client = Groq(api_key=api_key)
    return _groq_client

def answer_question(question: str, filter_paper_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Retrieves Top 5 chunks, builds prompt, queries Groq Llama 3.3, and returns answer with citations.
    Returns:
        {
            "answer": "...",
            "citations": [
                {
                    "paper_title": "Attention Is All You Need",
                    "page": 9
                }
            ]
        }
    """
    if not question or not question.strip():
        return {"answer": "Please provide a valid research question.", "citations": []}

    # Step 1 & 2: Retrieve Top 5 chunks
    chunks = retrieve_relevant_chunks(question, top_k=5, filter_paper_id=filter_paper_id)

    if not chunks:
        return {
            "answer": "I could not find sufficient evidence in the uploaded research papers.",
            "citations": []
        }

    # Extract deduplicated citations
    seen_citations = set()
    citations_list: List[Dict[str, Any]] = []

    for c in chunks:
        title = c.get("paper_title", "")
        page = c.get("page", 1)

        cite_key = (str(title), int(page))
        if cite_key not in seen_citations:
            seen_citations.add(cite_key)
            citations_list.append({
                "paper_title": str(title),
                "page": int(page)
            })

    # Step 3: Build grounded prompt using separate function
    user_prompt_content = build_rag_prompt(chunks, question)

    # Step 4: Call Groq API
    model_name = getattr(settings, "GROQ_MODEL", "llama-3.3-70b-versatile")
    
    try:
        client = get_groq_client()
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": RAG_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt_content}
            ],
            model=model_name,
            temperature=0.0
        )
        answer_text = completion.choices[0].message.content.strip() if completion.choices else ""
    except Exception as e:
        raise RuntimeError(f"Groq API LLM generation failed: {e}")

    return {
        "answer": answer_text,
        "citations": citations_list
    }
