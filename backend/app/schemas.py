from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any, Union
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
    relevance_score: Optional[float] = None

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
    paper_ids: List[str] = Field(..., min_length=1, max_length=10)

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

class DetailedGapItem(BaseModel):
    gap: str
    type: str = Field(default="explicit", description="explicit | inferred")
    why_it_matters: str = ""
    supporting_papers: List[str] = Field(default_factory=list)
    evidence: List[str] = Field(default_factory=list)
    confidence: str = Field(default="medium", description="high | medium | low")

class GapAnalysisRequest(BaseModel):
    paper_ids: List[str] = Field(default_factory=list)

class GapAnalysisContent(BaseModel):
    current_research_coverage: str = ""
    research_coverage: Optional[str] = None
    common_themes: List[str] = Field(default_factory=list)
    explicit_limitations: List[str] = Field(default_factory=list)
    conflicting_findings: List[str] = Field(default_factory=list)
    research_gaps: List[Union[str, DetailedGapItem]] = Field(default_factory=list)
    detailed_gaps: List[DetailedGapItem] = Field(default_factory=list)
    future_research_opportunities: List[str] = Field(default_factory=list)
    potential_research_questions: List[str] = Field(default_factory=list)
    research_questions: List[str] = Field(default_factory=list)
    evidence_quality: str = Field(default="High grounded fidelity across indexed papers.")

class GapAnalysisResponse(BaseModel):
    papers: List[PaperHeaderItem]
    analysis: GapAnalysisContent
    citations: List[Citation] = Field(default_factory=list)

class IdeaValidationRequest(BaseModel):
    paper_ids: List[str] = Field(default_factory=list)
    research_idea: str = Field(..., min_length=3)
    domain: Optional[str] = None
    target_problem: Optional[str] = None
    proposed_method: Optional[str] = None
    constraints: List[str] = Field(default_factory=list)

class EvidenceWorkItem(BaseModel):
    paper_id: str
    paper_title: str
    relevance: str = Field(default="medium", description="high | medium | low")
    existing_contribution: str
    overlap_with_idea: str
    evidence_pages: List[int] = Field(default_factory=list)

class OverlapDimension(BaseModel):
    level: str = Field(default="medium", description="high | medium | low")
    rationale: str = ""

class OverlapAnalysis(BaseModel):
    problem: OverlapDimension
    method: OverlapDimension
    dataset: OverlapDimension
    domain: OverlapDimension
    evaluation: OverlapDimension
    combination: OverlapDimension

class NoveltySignal(BaseModel):
    dimension: str
    signal: str = Field(default="medium", description="high | medium | low")
    rationale: str

from pydantic import BaseModel, ConfigDict, Field, field_validator

class IdeaGapItem(BaseModel):
    gap: str
    type: str = Field(default="explicit", description="explicit | inferred | underexplored | missing_evaluation | conflicting_findings")
    why_it_matters: str = ""
    supporting_papers: List[str] = Field(default_factory=list)
    evidence: List[str] = Field(default_factory=list)
    confidence: str = Field(default="medium", description="high | medium | low")

    @field_validator("supporting_papers", "evidence", mode="before")
    @classmethod
    def coerce_list(cls, v: Any) -> List[str]:
        if isinstance(v, list):
            return [str(item).strip() for item in v if str(item).strip()]
        if isinstance(v, str) and v.strip():
            return [v.strip()]
        return []

class HypothesisSet(BaseModel):
    h1: str
    h0: str

class ExperimentBlueprint(BaseModel):
    dataset: List[str] = Field(default_factory=list)
    baselines: List[str] = Field(default_factory=list)
    proposed_method: str = ""
    experimental_setup: str = ""
    variables: List[str] = Field(default_factory=list)
    evaluation_metrics: List[str] = Field(default_factory=list)
    ablation_study: List[str] = Field(default_factory=list)
    expected_comparison: str = ""

    @field_validator("dataset", "baselines", "variables", "evaluation_metrics", "ablation_study", mode="before")
    @classmethod
    def coerce_list_fields(cls, v: Any) -> List[str]:
        if isinstance(v, list):
            return [str(item).strip() for item in v if str(item).strip()]
        if isinstance(v, str) and v.strip():
            return [v.strip()]
        return []

class BaselineItem(BaseModel):
    baseline: str = ""
    why_it_matters: str = ""
    paper: str = ""
    evidence: str = ""

    @field_validator("evidence", "why_it_matters", "baseline", "paper", mode="before")
    @classmethod
    def coerce_str_fields(cls, v: Any) -> str:
        if isinstance(v, list):
            return " ".join(str(item).strip() for item in v if str(item).strip())
        return str(v or "").strip()

class IdeaValidationResponse(BaseModel):
    idea: str
    corpus_summary: str
    existing_work: List[EvidenceWorkItem] = Field(default_factory=list)
    overlap_analysis: OverlapAnalysis
    novelty_signals: List[NoveltySignal] = Field(default_factory=list)
    research_gaps: List[IdeaGapItem] = Field(default_factory=list)
    potential_contribution: str
    research_questions: List[str] = Field(default_factory=list)
    hypothesis: HypothesisSet
    experiment_blueprint: ExperimentBlueprint
    baselines: List[BaselineItem] = Field(default_factory=list)
    potential_contributions: List[str] = Field(default_factory=list)
    citations: List[Citation] = Field(default_factory=list)
    evidence_quality: str = Field(default="Limited corpus evidence.")

class LiteratureReviewRequest(BaseModel):
    paper_ids: List[str] = Field(..., min_length=1, max_length=10)

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
    query: str = Field(default="", description="The research question or search query")
    paper_ids: Optional[List[str]] = Field(default_factory=list, description="Optional list of paper UUIDs to filter")
    mode: Optional[QueryMode] = Field(default=QueryMode.CHAT)

class QueryResponse(BaseModel):
    mode: Optional[QueryMode] = None
    answer: str
    citations: List[Citation] = Field(default_factory=list)

class ExportRequest(BaseModel):
    type: str = Field(..., description="Export file type: pdf or docx")
    content: Dict[str, Any] = Field(..., description="The AI response dictionary to export.")

class DebugGapAnalysisRequest(BaseModel):
    query: Optional[str] = Field(default="Identify unresolved research gaps across papers")
    paper_ids: Optional[List[str]] = Field(default_factory=list)
