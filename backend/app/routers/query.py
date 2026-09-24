import logging
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.schemas import QueryResponse, QueryMode
from app.services.ai.rag_service import answer_question

logger = logging.getLogger("researchgpt.routers.query")

router = APIRouter(prefix="/query", tags=["query"])

class QueryEndpointRequest(BaseModel):
    query: str = Field(..., description="User research question.", min_length=1)
    paper_ids: Optional[List[str]] = Field(default_factory=list, description="Optional paper UUID filters")
    mode: Optional[QueryMode] = Field(default=QueryMode.CHAT)

@router.post("", response_model=QueryResponse, status_code=200)
def execute_query(req: QueryEndpointRequest) -> Dict[str, Any]:
    """
    Unified RAG Question Answering Endpoint.
    Workflow: Question -> Multi-Query Expansion & Noise Filter -> Retriever -> Groq Qwen -> Validated Citations.
    """
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Research question cannot be empty.")

    try:
        logger.info(f"Received query: '{req.query}' with {len(req.paper_ids or [])} paper filters")
        result = answer_question(
            question=req.query,
            filter_paper_ids=req.paper_ids
        )
        if not isinstance(result.get("citations"), list):
            result["citations"] = []
        
        result["mode"] = req.mode
        validated = QueryResponse.model_validate(result)
        return validated.model_dump()
    except Exception as e:
        logger.error(f"Error during query execution: {e}")
        raise HTTPException(status_code=500, detail=f"Query execution error: {str(e)}")
