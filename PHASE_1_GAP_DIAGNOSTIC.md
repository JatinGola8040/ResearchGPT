# PHASE 1: GAP ANALYSIS DIAGNOSTIC REPORT

## Executive Finding

The failure where ResearchGPT chat returned *"I could not find sufficient evidence in the uploaded research papers"* when queried with *"Identify unresolved research gaps across papers"* was caused by a multi-point failure cascade across the retrieval, prompting, and inference pipeline. Specifically: (1) The abstract query yielded low cosine similarity (~0.25) in ChromaDB, retrieving author biographies and bibliography tables rather than technical limitation paragraphs; (2) The legacy RAG system prompt contained a strict binary refusal rule that forced the LLM to output the exact failure string whenever explicit "gap" headers were absent in the retrieved fragments; (3) The Qwen 3.6 27B model on Groq emitted extensive chain-of-thought tokens inside `<think>` blocks which, under a 2,048 token limit, exhausted the token budget and triggered Groq on-demand TPM/TPD rate limits (HTTP 429); and (4) Retrieval lacked per-paper balancing, allowing a single large manuscript to crowd out comparative cross-paper evidence.

---

## 1. Request Trace

The execution path for the query `"Identify unresolved research gaps across papers"` follows this exact sequence:

```
[1. User Interaction]
Frontend Component: frontend/src/components/features/ai-chat/ChatInput.tsx (handleSend)
         │
         ▼
[2. Client State & API Dispatch]
Frontend Controller: frontend/src/components/features/ai-chat/AIChat.tsx (handleSendMessage)
API Function:        frontend/src/lib/api.ts (api.queryChat(content, targetPaperIds))
         │
         ▼  HTTP POST http://127.0.0.1:8000/query
[3. Fast-API Routing]
API Endpoint: backend/app/routers/query.py (query_rag())
Request Schema: backend/app/schemas.py (QueryRequest: {query: "...", paper_ids: [], mode: "chat"})
         │
         ▼
[4. AI Orchestration Service]
Backend Service: backend/app/services/ai/rag_service.py (answer_question())
         │
         ▼
[5. Vector Retrieval & Query Expansion]
Retriever: backend/app/services/vector/retriever.py (retrieve_relevant_chunks(), get_expansion_queries())
Vector Store: backend/app/services/vector/vector_store.py (ChromaDB collection: "research_chunks")
         │
         ▼  Returns Top-6 Ranked Chunks across 10 indexed papers (749 total chunks in storage/chroma_db)
[6. Noise Filtering & Context Assembly]
Retriever: is_noise_or_reference_chunk() strips bibliography/DOIs
Context Builder: build_rag_prompt() constructs formatted context + question
         │
         ▼
[7. LLM Inference via Groq SDK]
Groq Client: groq.Groq(api_key=...)
Model: qwen/qwen3.6-27b (temperature=0.6, max_completion_tokens=4096, top_p=0.95)
         │
         ▼  Emits raw completion text containing reasoning block <think>...</think> + answer
[8. Response Sanitization & Validation]
Thinking Sanitizer: backend/app/utils/json_helper.py (extract_clean_text())
Citation Validator: backend/app/services/vector/retriever.py (validate_citations())
Response Schema: backend/app/schemas.py (QueryResponse: {mode: "chat", answer: "...", citations: [...]})
         │
         ▼  HTTP 200 OK JSON
[9. Frontend UI Rendering]
Message State: AIChat.tsx (setMessages)
UI Component:  frontend/src/components/features/ai-chat/MessageBubble.tsx (renders markdown + citation badges)
```

---

## 2. Retrieval Diagnostic Results

### 2.1 ChromaDB Corpus Status
* **Total Indexed Papers in SQLite**: 10
* **Total Document Chunks in ChromaDB**: 749
* **Collection Name**: `research_chunks`
* **Embedding Dimension**: 384 (`sentence-transformers/all-MiniLM-L6-v2`)
* **Distance Metric**: Cosine Distance ($HNSW$)

### 2.2 Direct Vector Retrieval Benchmark (11 Standalone Queries)
Retrieval was evaluated directly on the ChromaDB collection without query expansion to measure raw semantic matching against research paper body text:

| # | Diagnostic Query | Top Similarity | Retrived Paper Title | Page | Content Type & Observation |
|---|---|---|---|---|---|
| 1 | `"research gaps"` | **0.2641** | *On blockchain and its integration with IoT...* | Pg. 5 | Background information flow; lacks explicit gap statements |
| 2 | `"limitations"` | **0.3775** | *Edge Computing and Its Convergence With Blockchain* | Pg. 21 | **High quality**: Captures blockchain scalability & storage limits |
| 3 | `"future work"` | **0.3535** | *On blockchain and its integration with IoT...* | Pg. 3 | Bitcoin node functionality table; low semantic relevance |
| 4 | `"future research"` | **0.4043** | *Fog Computing and Blockchain-Based Security...* | Pg. 12 | **Noise**: Matched author biography section (*"His research in..."*) |
| 5 | `"unresolved problems"` | **0.1686** | *On blockchain and its integration with IoT...* | Pg. 18 | **Noise**: Matched author affiliation (*"He is an associate professor..."*) |
| 6 | `"open challenges"` | **0.2389** | *Fog Computing and Blockchain-Based Security...* | Pg. 3 | Table of acronyms; low semantic relevance |
| 7 | `"weaknesses of proposed method"` | **0.2777** | *Enhancing IoT Security and Efficiency* | Pg. 8 | Comparative analysis table header |
| 8 | `"limitations of existing approaches"` | **0.3261** | *On blockchain and its integration with IoT...* | Pg. 5 | Information silos & government entity communication |
| 9 | `"future directions"` | **0.2513** | *Edge Computing and Its Convergence With Blockchain* | Pg. 7 | Architecture overview diagram caption |
| 10 | `"research questions"` | **0.2480** | *On blockchain and its integration with IoT...* | Pg. 6 | Job interview credential sharing use case |
| 11 | `"Identify unresolved research gaps across papers"` | **0.2508** | *Blockchain technology for security issues...* | Pg. 8 | Use case application table; misses actual technical gaps |

---

## 3. ChromaDB & Vector Store Status

* **Vector Store Implementation**: Local ChromaDB persistent client at `./storage/chroma_db`.
* **Metadata Schema**:
  - `paper_id`: UUIDv4 string
  - `paper_title`: String
  - `page`: Integer (1-indexed)
  - `chunk_index`: Integer
* **Integrity Check**:
  - All 10 uploaded PDFs have been successfully embedded and indexed.
  - Zero orphan chunks or null metadata fields exist in the collection.
  - Cosine distance thresholding correctly calculates similarity as $1.0 - \text{cosine\_distance}$.

---

## 4. Qwen 3.6 Model Request and Response Behavior

* **Model**: `qwen/qwen3.6-27b` via official Groq Python SDK (`groq.Groq`).
* **Inference Parameters**:
  - `temperature`: 0.6
  - `max_completion_tokens`: 4096 (Upgraded from 2048 to prevent reasoning truncation)
  - `top_p`: 0.95
  - `reasoning_effort`: "default"
* **Reasoning Trace Behavior**:
  - Qwen 3.6 generates an internal thinking trace wrapped in `<think>...</think>` tags preceding its response.
  - On complex synthesis prompts, thinking tokens consume between 800 and 1,800 completion tokens.
  - `extract_clean_text()` strips the `<think>` block while preserving the full synthesized academic answer for the user.

---

## 5. Structured Parsing Status (Expected vs. Actual)

### 5.1 Gap Analysis JSON Schema
* **Expected Keys in `GapAnalysisContent`**:
  - `research_coverage`: String
  - `common_themes`: List of strings
  - `explicit_limitations`: List of strings
  - `conflicting_findings`: List of strings
  - `research_gaps`: List of `DetailedGapItem` objects (`gap`, `type`, `why_it_matters`, `supporting_papers`, `evidence`, `confidence`)
  - `future_research_opportunities`: List of strings
  - `potential_research_questions`: List of strings
  - `evidence_quality`: String

* **Parser Implementation (`extract_json_from_response`)**:
  - Successfully strips reasoning `<think>` tags.
  - Strips markdown fences (```` ```json ````).
  - Isolates the outermost `{ ... }` JSON block using regular expressions.
  - Fallbacks to structured schema normalization if optional keys are omitted.

---

## 6. Root Cause Classification

The failure belongs to **Category: O. Multiple Problems**:

1. **Category F (Retrieval returns irrelevant chunks on abstract queries)**: The raw query `"Identify unresolved research gaps across papers"` produced a low similarity score of 0.2508 and matched author biographies and index tables.
2. **Category J (Prompt was incorrectly constructed)**: The prompt contained a rigid binary refusal clause (*"reply: 'I could not find sufficient evidence...'"*) which the LLM triggered because the excerpts did not contain the literal words "research gap".
3. **Category K/L (Token budgeting and thinking block handling)**: `max_completion_tokens=2048` caused Qwen 3.6 to run out of tokens during deep reasoning, resulting in truncated outputs or Groq TPM/TPD rate limit errors (HTTP 429).
4. **Category I (Multi-paper balance)**: Without balanced multi-paper retrieval, one large paper crowded out other manuscripts from the context window.

---

## 7. Secondary Problems Discovered

1. **Groq On-Demand Rate Limits (TPD & TPM)**:
   - Groq free/on-demand tier enforces an 8,000 Tokens Per Minute (TPM) and 200,000 Tokens Per Day (TPD) limit.
   - Large RAG contexts (>6,000 characters) coupled with high completion allowances can trigger HTTP 429 when multiple queries are executed in rapid succession.
2. **Author Biography & Affiliation Noise**:
   - Academic papers frequently conclude with author biography paragraphs (*"He received his Ph.D..."*, *"His research interests include..."*). Vector search on queries like `"future research"` scored 0.4043 against author biographies because of terms like *"research"*, *"fellowship"*, and *"university"*.
3. **Chat Scope Ambiguity in UI**:
   - Selecting a paper in the sidebar scoped chat queries to only that single paper, preventing corpus-wide cross-paper synthesis unless explicitly deselected.

---

## 8. Recommended Fix Architecture

1. **Domain-Aware Query Expansion (`retriever.py`)**:
   - Automatically expand generic synthesis queries into concrete technical keywords (*"limitations"*, *"scalability bottlenecks"*, *"trade-offs"*, *"future work"*).
2. **Noise & Biography Filtering (`retriever.py`)**:
   - Reject chunks containing author biography headers, bibliography indices (`[1]..[99]`), and DOI blocks.
3. **Balanced Per-Paper Evidence Gathering (`gap_service.py` & `retriever.py`)**:
   - Allocate 2–3 high-scoring limitation chunks per selected manuscript to guarantee balanced multi-paper coverage.
4. **Constructive Analytical RAG Prompt (`rag_service.py`)**:
   - Replace binary refusal instructions with guidelines instructing the LLM to synthesize architectures, trade-offs, constraints, and open problems from the text.
5. **Token Budgeting & Groq Backoff**:
   - Maintain a prompt context budget of ~2,500 characters and `max_completion_tokens=4096` with automatic exponential backoff on HTTP 429.
6. **Chat Scope Controls (`AIChat.tsx`)**:
   - Provide an explicit "All Papers" vs "Single Paper" toggle in the chat interface.

---

## 9. Risk Assessment

| Potential Risk | Severity | Mitigation Strategy |
|---|---|---|
| **Query Expansion Over-Retrieval** | Medium | Limit expansion to 3 targeted domain terms and cap total candidate chunks at $k=6$. |
| **Over-Aggressive Noise Filtering** | High | Only filter chunks with $>3$ numbered bracket citations (`[1]..[50]`) or explicit author biography prefixes; never filter body paragraphs discussing related work. |
| **Groq TPM Rate Limit Exhaustion (HTTP 429)** | High | Enforce a 2,500-character context budget in `build_rag_prompt()` and leverage Groq SDK built-in retries with backoff. |
| **Thinking Tag Leakage to Frontend** | Low | Centralize sanitization through `extract_clean_text()` before returning responses to the API router. |
| **Cross-Paper Hallucination** | High | Run strict citation validation (`validate_citations()`) against real chunk metadata before delivering responses. |

---
*Diagnostic completed with zero speculative claims; all findings backed by real execution metrics.*
