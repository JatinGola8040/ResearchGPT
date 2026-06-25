from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

class QueryMode(str, Enum):
    SUMMARY = "summary"
    COMPARE = "compare"
    GAP = "gap"
    LITERATURE = "literature"
    CHAT = "chat"

class PaperResponse(BaseModel):
    id: str
    filename: str
    title: Optional[str] = None
    authors: Optional[str] = None
    abstract: Optional[str] = None
    pages: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    uploaded_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class QueryRequest(BaseModel):
    query: Optional[str] = Field(default="")
    paper_ids: List[str]
    mode: QueryMode

class Citation(BaseModel):
    paper_id: str
    page: int
    snippet: str

class QueryResponse(BaseModel):
    mode: QueryMode
    answer: str
    citations: List[Citation] = Field(default_factory=list)
