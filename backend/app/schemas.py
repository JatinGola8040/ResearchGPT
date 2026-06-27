from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

class ApiResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None

class QueryMode(str, Enum):
    SUMMARY = "summary"
    COMPARE = "compare"
    GAP = "gap"
    LITERATURE = "literature"
    CHAT = "chat"

class Citation(BaseModel):
    paper_id: str
    paper_title: str
    page: int
    snippet: str

class PaperSummaryResponse(BaseModel):
    paper_id: str
    paper_title: str
    executive_summary: str
    key_contributions: List[str]
    methodology: str
    results: str
    limitations: str
    citations: List[Citation] = Field(default_factory=list)

class ComparePapersRequest(BaseModel):
    paper_ids: List[str] = Field(..., min_length=2, max_length=5)

class PaperHeaderItem(BaseModel):
    paper_id: str
    paper_title: str

class ComparisonContent(BaseModel):
    research_objective: str
    methodology: str
    datasets: str
    strengths: str
    limitations: str
    key_differences: List[str]
    overall_conclusion: str

class ComparePapersResponse(BaseModel):
    papers: List[PaperHeaderItem]
    comparison: ComparisonContent
    citations: List[Citation] = Field(default_factory=list)

class GapAnalysisRequest(BaseModel):
    paper_ids: List[str] = Field(..., min_length=2, max_length=5)

class GapAnalysisContent(BaseModel):
    current_research_coverage: str
    common_themes: List[str]
    conflicting_findings: List[str]
    research_gaps: List[str]
    future_research_opportunities: List[str]
    potential_research_questions: List[str]

class GapAnalysisResponse(BaseModel):
    papers: List[PaperHeaderItem]
    analysis: GapAnalysisContent
    citations: List[Citation] = Field(default_factory=list)

class LiteratureReviewRequest(BaseModel):
    paper_ids: List[str] = Field(..., min_length=2, max_length=10)

class LiteratureReferenceItem(BaseModel):
    paper_title: str
    citation: str

class LiteratureReviewResponse(BaseModel):
    title: str
    introduction: str
    research_objectives: str
    related_work: str
    methodology_comparison: str
    datasets_used: str
    key_findings: str
    research_trends: str
    research_gaps: str
    future_scope: str
    conclusion: str
    references: List[LiteratureReferenceItem]
    citations: List[Citation] = Field(default_factory=list)

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

class QueryResponse(BaseModel):
    mode: Optional[QueryMode] = None
    answer: str
    citations: List[Citation] = Field(default_factory=list)

class ExportRequest(BaseModel):
    type: str = Field(..., description="Export file type: pdf or docx")
    content: Dict[str, Any] = Field(..., description="The AI response dictionary to export.")
