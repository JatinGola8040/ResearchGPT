# ResearchGPT RAG Stabilization & Model Migration Report

## Executive Summary

This report documents the root-cause diagnosis, retrieval pipeline hardening, model migration to **Qwen 3.6 27B** via the Groq Python SDK, automated test suite results, and end-to-end verification across the 5 mandatory research queries for **ResearchGPT Studio**.

---

## 1. Root Causes of Previous Failures

### 1.1 Root Cause 1: Abstract Semantic Drift in Vector Retrieval
* **Issue**: When a user queried abstract research synthesis prompts such as *"Identify unresolved research gaps across papers"*, standard dense cosine embeddings on chunked text biased retrieval towards bibliography entries, citation lists (`[58] R3...`, `[125] ShoCard...`, `doi: 10.1109...`), and author biography boilerplate.
* **Impact**: The top retrieved chunks contained zero technical limitation statements from the papers, causing the model to correctly identify that the context lacked evidence and return: `"I could not find sufficient evidence in the uploaded research papers."`

### 1.2 Root Cause 2: Incompatible Legacy Model Identifier & SDK Call Convention
* **Issue**: The codebase originally targeted deprecated/unavailable model identifiers with default max token configurations that triggered 404 or 413 token payload errors on Groq on-demand rate limits.
* **Impact**: Unhandled API errors or immediate fallbacks to binary denial prompts.

### 1.3 Root Cause 3: Reasoning Model `<think>` Blocks & JSON Schema Incompatibilities
* **Issue**: Modern reasoning models like `qwen/qwen3.6-27b` emit deep thought traces in `<think>...</think>` tags prior to final output. When services attempted `json.loads(response)` or `json_object` enforcement, raw thinking blocks broke JSON parsing or exhausted completion token limits.
* **Impact**: Structured JSON endpoints (`/papers/gap-analysis`, `/papers/summary`, `/papers/compare`, `/papers/literature-review`) threw 500 parse errors and returned empty fallback states.

### 1.4 Root Cause 4: Groq On-Demand Rate Limits (8,000 TPM Budget)
* **Issue**: Aggregating 8 large chunks from 3–5 papers resulted in prompt contexts exceeding 6,000–10,000 characters, causing HTTP 429 / 413 rate limit rejections when combined with high reasoning token outputs.
* **Impact**: Intermittent request drops during multi-paper analysis.

---

## 2. Retrieval Pipeline Architecture Upgrades

We engineered a multi-stage retrieval architecture in `backend/app/services/vector/retriever.py`:

```
User Query ("Identify unresolved research gaps across papers")
                    │
                    ▼
       ┌──────────────────────────┐
       │   Domain Query Expansion │
       │  • "limitations challenges"
       │  • "bottlenecks trade-offs"
       │  • "future research scope"
       └────────────┬─────────────┘
                    │
                    ▼
       ┌──────────────────────────┐
       │ Dense ChromaDB Retrieval │ (Top-k candidates per query)
       └────────────┬─────────────┘
                    │
                    ▼
       ┌──────────────────────────┐
       │   Noise & Bibliography   │
       │        Filtering         │ (Strips [1..100], DOIs, affiliations)
       └────────────┬─────────────┘
                    │
                    ▼
       ┌──────────────────────────┐
       │ Balanced Multi-Paper     │
       │ Deduplication & Budget   │ (Ensures equal representation across papers)
       └────────────┬─────────────┘
                    │
                    ▼
       ┌──────────────────────────┐
       │ Grounded Prompt Context  │ (~2,500 token budget)
       └──────────────────────────┘
```

### Key Technical Implementations:
1. **Noise Filtering (`is_noise_or_reference_chunk`)**:
   - Detects and rejects reference lists, citation indexes, DOI clusters, and copyright blocks.
2. **Domain-Aware Query Expansion (`get_expansion_queries`)**:
   - Expands generic gap queries into targeted limitation, bottleneck, and future work terms.
3. **Balanced Per-Paper Evidence Gathering (`retrieve_gap_evidence`)**:
   - Gathers top 2–3 high-fidelity limitation chunks per selected manuscript, preventing a single verbose paper from dominating the context.
4. **Strict Citation Validation (`validate_citations`)**:
   - Validates every citation returned against real chunk IDs, paper titles, and page numbers, discarding any hallucinated references.

---

## 3. LLM Migration: Qwen 3.6 27B on Groq

### 3.1 Centralized Model Settings (`backend/app/config.py` & `.env`)
```python
LLM_MODEL = "qwen/qwen3.6-27b"
LLM_TEMPERATURE = 0.6
LLM_MAX_TOKENS = 2048
LLM_TOP_P = 0.95
LLM_REASONING_EFFORT = "default"
```

### 3.2 Reasoning Sanitizer (`backend/app/utils/json_helper.py`)
* `extract_clean_text()`: Safely strips `<think>...</think>` blocks, handling both closed and unclosed thinking tags seamlessly.
* `extract_json_from_response()`: Automatically isolates valid JSON dictionaries from markdown code fences or reasoning streams.

---

## 4. Test Results for Mandatory Live Queries

All tests executed live against the running backend with 10 indexed research papers in SQLite & ChromaDB:

| # | Test Query | Retrieval Status | Verification Result | Citations Grounded |
|---|---|---|---|---|
| **1** | *"What are the main contributions across these papers?"* | **PASS** | Detailed multi-paper contribution synthesis generated. | 6 verified citations |
| **2** | *"Compare the methodologies used in these papers."* | **PASS** | Edge computing vs. 5G industrial security methodologies contrasted. | 5 verified citations |
| **3** | *"Identify unresolved research gaps across papers."* | **PASS** | Resource optimization, scalability bottlenecks, and consensus trade-offs identified. | 5 verified citations |
| **4** | *"Which limitations are explicitly mentioned?"* | **PASS** | Edge node storage constraints, network latency, and throughput limitations cited with page numbers. | 5 verified citations |
| **5** | *"What future research directions are suggested?"* | **PASS** | Lightweight consensus, cross-chain interoperability, and edge-fog partitioning directions outlined. | 5 verified citations |

### Automated Test Suite Execution:
```bash
& "backend/venv/Scripts/python.exe" -m unittest tests.test_rag_pipeline -v
```
**Output**:
```
test_01_noise_filtering (tests.test_rag_pipeline.TestRAGPipeline) ... ok
test_02_query_expansion (tests.test_rag_pipeline.TestRAGPipeline) ... ok
test_03_json_helper_thinking_stripping (tests.test_rag_pipeline.TestRAGPipeline) ... ok
test_04_citation_validation (tests.test_rag_pipeline.TestRAGPipeline) ... ok
test_05_empty_query_rag (tests.test_rag_pipeline.TestRAGPipeline) ... ok
test_06_no_papers_gap_analysis (tests.test_rag_pipeline.TestRAGPipeline) ... ok
test_07_end_to_end_gap_analysis_live (tests.test_rag_pipeline.TestRAGPipeline) ... ok

----------------------------------------------------------------------
Ran 7 tests in 104.610s

OK
```

---

## 5. Development Diagnostic Endpoint (`POST /debug/gap-analysis`)

A diagnostic endpoint was added to `backend/app/main.py` fulfilling Part 16:

* **Endpoint**: `POST http://127.0.0.1:8000/debug/gap-analysis`
* **Payload**:
  ```json
  {
    "paper_ids": ["6d0f0617-e929-4ec4-b6d0-3fa58db7fe12", "369c1c41-1ae0-4ff0-9d84-7afefb56b2c1"],
    "query": "Identify unresolved research gaps across papers"
  }
  ```
* **Returns**:
  - `query`
  - `selected_papers`
  - `retrieved_chunks_count`
  - `retrieved_chunks` (with page numbers and text snippets)
  - `similarity_scores`
  - `prompt_approx_char_length`
  - `model` (`qwen/qwen3.6-27b`)
  - `parsed_response` (rich structured gaps, coverage, themes, limitations)
  - `citation_count`
  - *(Never exposes API keys or secrets)*

---

## 6. How to Run and Verify the Project

### 6.1 Prerequisites
* Python 3.11+ with virtual environment in `backend/venv`
* Node.js 18+ with dependencies installed in `frontend`
* Valid `GROQ_API_KEY` configured in `backend/.env`

### 6.2 Running the Backend
In PowerShell:
```powershell
cd backend
& ".\venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
* Swagger Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* Health Check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

### 6.3 Running the Frontend
In a separate terminal:
```powershell
cd frontend
npm run dev
```
* Web Application: [http://localhost:3000/workspace](http://localhost:3000/workspace)

### 6.4 Running Automated Verification
```powershell
# Run Pipeline Unit & Live Tests
& "backend\venv\Scripts\python.exe" -m unittest tests.test_rag_pipeline -v

# Run 5 Core Queries Live Verification
& "backend\venv\Scripts\python.exe" -u tests\verify_live_queries.py
```
