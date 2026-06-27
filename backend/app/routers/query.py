from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.schemas import QueryResponse
from app.services.ai.rag_service import answer_question

router = APIRouter(prefix="/query", tags=["query"])

class QueryEndpointRequest(BaseModel):
    query: str = Field(..., description="User research question.", min_length=1)

@router.post("", response_model=QueryResponse, status_code=200)
def execute_query(req: QueryEndpointRequest) -> Dict[str, Any]:
    """
    Unified RAG Question Answering Endpoint.
    Workflow: Question -> Retriever -> Groq -> Return answer with citations.
    Enforces exact stable schema contract {answer, citations} with zero unexpected fields.
    """
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Research question cannot be empty.")

    try:
        result = answer_question(req.query)
        if not isinstance(result.get("citations"), list):
            result["citations"] = []
        validated = QueryResponse.model_validate(result)
        return validated.model_dump()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query execution error: {str(e)}")
