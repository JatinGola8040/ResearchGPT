from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services.ai.rag_service import answer_question

router = APIRouter(prefix="/query", tags=["query"])

class QueryRequest(BaseModel):
    query: str = Field(..., description="User research question.", min_length=1)

class CitationItem(BaseModel):
    paper_title: str
    page: int

class QueryResponse(BaseModel):
    answer: str
    citations: List[CitationItem]

@router.post("", response_model=QueryResponse, status_code=200)
def execute_query(req: QueryRequest) -> Dict[str, Any]:
    """
    Unified RAG Question Answering Endpoint.
    Workflow: Question -> Retriever -> Groq -> Return answer with citations.
    Stable response schema contract for Next.js frontend integration.
    """
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Research question cannot be empty.")

    try:
        result = answer_question(req.query)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query execution error: {str(e)}")
