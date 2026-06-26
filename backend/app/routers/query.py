from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services.ai.rag_service import answer_question

router = APIRouter(prefix="/query", tags=["query"])

class QueryRequest(BaseModel):
    query: str = Field(..., description="User research question.")

class CitationItem(BaseModel):
    paper_title: str
    page: int

class QueryResponse(BaseModel):
    answer: str
    citations: List[CitationItem]

@router.post("", response_model=QueryResponse)
def execute_query(req: QueryRequest):
    """
    Unified RAG Question Answering Endpoint.
    Workflow: Question -> Retriever -> Groq -> Return answer with citations.
    """
    try:
        result = answer_question(req.query)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")
