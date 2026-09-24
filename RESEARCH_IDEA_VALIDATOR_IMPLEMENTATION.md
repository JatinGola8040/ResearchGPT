# Research Idea Validator Implementation

## 1. Architecture

The Research Idea Validator is implemented as a new two-stage feature layered on top of the existing ResearchGPT stack.

Stage 1:
- Reuses `backend/app/services/vector/retriever.py` for balanced, multi-query evidence retrieval across selected papers.
- Reuses `backend/app/services/ai/gap_service.py` to synthesize evidence-backed gaps when sufficient corpus evidence exists.

Stage 2:
- Uses the centralized `backend/app/services/llm_client.py` client to generate a structured corpus-based idea assessment from:
  - the user idea and optional fields
  - retrieved evidence snippets
  - the existing gap-analysis output

No new RAG stack, vector store, embedding model, or LLM client was introduced.

## 2. Backend Changes

Added:
- `backend/app/services/ai/validator_service.py`
- `backend/tests/test_validator_service.py`

Updated:
- `backend/app/schemas.py`
- `backend/app/routers/papers.py`

The service:
- builds targeted retrieval queries from the idea, problem, method, domain, and constraints
- keeps retrieval balanced across papers
- validates citations strictly against retrieved chunks only
- falls back to an "insufficient evidence" structured response when the indexed corpus is too weak

## 3. Frontend Changes

Added:
- `frontend/src/components/features/analysis-tabs/IdeaValidatorTab.tsx`

Updated:
- `frontend/src/components/layout/RightAnalysisPanel.tsx`
- `frontend/src/lib/api.ts`

The frontend now exposes a fifth primary analysis tab:
- `Idea`

The tab includes:
- polished idea input form
- optional fields for domain, problem, method, and constraints
- indexed-paper selection
- staged loading flow for demo visibility
- structured output sections for:
  - existing work
  - overlap map
  - evidence-based novelty signals
  - research gaps
  - potential contribution
  - research questions
  - hypothesis
  - experiment blueprint
  - baselines
  - supporting citations

## 4. Retrieval Strategy

The validator does not send only the raw idea into retrieval.

It expands retrieval with targeted queries derived from:
- the research idea
- existing approaches
- limitations and future work
- target problem
- proposed method
- domain benchmarks and datasets
- explicit constraints and trade-offs

Retrieval still relies on the existing balanced chunk selection behavior to avoid one paper dominating context.

## 5. LLM Prompt Strategy

The validator uses a two-stage reasoning pattern:

1. Evidence collection
- retrieve balanced chunks with the existing retriever
- optionally synthesize gaps via the existing gap engine

2. Idea validation
- pass the structured evidence package into a single validator prompt
- require corpus-limited language
- forbid claims of global novelty
- require valid structured JSON

## 6. Citation Grounding

Citation grounding remains strict:
- citations are generated from retrieved chunks only
- citations are passed through `validate_citations(...)`
- no paper title, page, or snippet is accepted unless it maps back to retrieved evidence

The validator response therefore stays aligned with the existing grounding model used elsewhere in ResearchGPT.

## 7. Schemas

Added request schema:
- `IdeaValidationRequest`

Added response and nested schemas:
- `IdeaValidationResponse`
- `EvidenceWorkItem`
- `OverlapAnalysis`
- `OverlapDimension`
- `NoveltySignal`
- `IdeaGapItem`
- `HypothesisSet`
- `ExperimentBlueprint`
- `BaselineItem`

## 8. API

Added:
- `POST /papers/validate-idea`

Request fields:
- `paper_ids`
- `research_idea`
- `domain`
- `target_problem`
- `proposed_method`
- `constraints`

Frontend client method:
- `api.validateIdea()`

## 9. Tests

Added:
- `backend/tests/test_validator_service.py`

Covered cases:
- valid idea
- empty idea
- no selected papers
- insufficient evidence
- citation validation
- malformed LLM response
- structured response parsing

Verification completed:
- `backend\\venv\\Scripts\\python.exe -m unittest tests.test_validator_service -v` -> passed
- targeted ESLint on changed frontend files -> passed

Environment-limited verification:
- `tests.test_rag_pipeline` partially passed, but the live embedding-model test failed because the environment could not reach Hugging Face
- `tests.test_openrouter` partially passed, but live OpenRouter calls failed because outbound socket access was blocked

## 10. Known Limitations

- Novelty signals are corpus-based only and intentionally not global novelty claims.
- Validator quality depends on the relevance and breadth of currently indexed papers.
- Live retrieval and OpenRouter integration tests require network/model access in the environment.
- The full workspace lint command still reports unrelated pre-existing lint violations outside the new validator files.
