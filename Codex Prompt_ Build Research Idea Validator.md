# RESEARCHGPT: BUILD THE RESEARCH IDEA VALIDATOR

You are now taking over development of an existing ResearchGPT application.

FIRST READ:

`RESEARCHGPT_CODEX_HANDOFF.md`

This document describes the current architecture and verified state of the project.

Treat the ACTUAL CODEBASE as the source of truth.

==================================================
# OBJECTIVE
==================================================

Build a new flagship feature:

# RESEARCH IDEA VALIDATOR

The purpose is to change ResearchGPT from being primarily a "research paper analysis tool" into a system that helps researchers answer:

> "Is my proposed research idea actually worth pursuing, based on the literature I have?"

The feature must NOT claim absolute global novelty.

It must provide:

> Evidence-grounded novelty and research-direction assessment against the literature available in the ResearchGPT corpus.

The user should be able to enter a research idea and receive:

1. Existing Work
2. Research Overlap
3. Novelty Signals
4. Evidence-Based Gaps
5. Research Opportunity
6. Research Questions
7. Hypothesis
8. Experiment Blueprint
9. Evaluation Metrics
10. Supporting Citations

==================================================
# CRITICAL CONSTRAINT
==================================================

DO NOT break the existing ResearchGPT functionality.

Before modifying anything:

Read:

`RESEARCHGPT_CODEX_HANDOFF.md`

Then inspect the actual implementation of:

`backend/app/services/vector/retriever.py`

`backend/app/services/vector/vector_store.py`

`backend/app/services/llm_client.py`

`backend/app/services/ai/gap_service.py`

`backend/app/schemas.py`

`backend/app/routers/papers.py`

`frontend/src/lib/api.ts`

`frontend/src/components/features/analysis-tabs/ResearchGapTab.tsx`

Reuse existing functionality wherever possible.

DO NOT rebuild the RAG system.

DO NOT replace ChromaDB.

DO NOT replace embeddings.

DO NOT replace OpenRouter.

DO NOT create a second LLM client.

DO NOT bypass citation validation.

DO NOT duplicate retrieval logic unnecessarily.

==================================================
# PRODUCT EXPERIENCE
==================================================

Add a new primary analysis capability:

## "Idea Validator"

The user enters something like:

> "I want to build a lightweight blockchain-based federated intrusion detection system for resource-constrained IoT devices."

Then clicks:

# Validate Research Idea

The system should produce a structured research assessment.

==================================================
# USER FLOW
==================================================

The flow should be:

USER RESEARCH IDEA

↓

RESEARCH IDEA VALIDATOR

↓

Retrieve relevant literature

↓

Identify existing approaches

↓

Measure conceptual overlap

↓

Identify underexplored intersections

↓

Identify evidence-backed gaps

↓

Assess novelty signals

↓

Generate research direction

↓

Generate research questions

↓

Generate hypothesis

↓

Generate experiment blueprint

↓

Generate evaluation metrics

↓

Show citations

==================================================
# IMPORTANT: CORPUS LIMITATION
==================================================

The UI MUST clearly communicate that the analysis is based on the currently uploaded/indexed literature.

Use language such as:

"Assessment based on the 10 papers currently indexed in your ResearchGPT workspace."

Never claim:

"Your idea is globally novel."

Never claim:

"No one has ever done this."

Never present an AI-generated novelty score as an objective scientific truth.

==================================================
# FEATURE 1: IDEA INPUT
==================================================

Create a polished input interface.

Fields:

Research Idea

Required.

Optional:

Research Domain

Optional:

Target Problem

Optional:

Proposed Method

Optional:

Constraints

Examples:

- limited compute
- real-time inference
- edge deployment
- privacy
- low latency

Primary button:

"Validate Research Idea"

Secondary example:

"Try an example"

The interface should look like a serious research product, not a generic chatbot.

==================================================
# FEATURE 2: LITERATURE OVERLAP
==================================================

Retrieve relevant evidence from the indexed papers.

Reuse:

`retriever.py`

Use multi-query expansion.

Generate retrieval queries based on:

- research idea
- problem
- method
- domain
- important technical terms

Retrieve evidence from multiple papers.

Do not let one large paper dominate the context.

Preserve the existing balanced retrieval behavior.

==================================================
# FEATURE 3: EXISTING WORK
==================================================

Show the papers most relevant to the idea.

For each paper display:

Paper title

Relevance

What the paper already does

Overlap with user's idea

Pages/evidence

Citation

Example:

PAPER A

"Federated Intrusion Detection in IoT"

Overlap: HIGH

Existing contribution:

Federated anomaly detection for IoT networks.

Evidence:

Page 7

[View Evidence]

==================================================
# FEATURE 4: OVERLAP ANALYSIS
==================================================

Break overlap into:

Problem Overlap

Method Overlap

Dataset Overlap

Application/Domain Overlap

Evaluation Overlap

Combination Overlap

Example:

Problem: HIGH

Method: MEDIUM

Dataset: LOW

Domain: HIGH

Evaluation: LOW

Combination: LOW

The purpose is to show:

"What has already been done?"

rather than simply producing a vague similarity score.

==================================================
# FEATURE 5: NOVELTY RADAR
==================================================

Create a visual "Novelty Radar".

Dimensions:

- Problem Novelty
- Method Novelty
- Dataset Novelty
- Combination Novelty
- Evaluation Novelty

IMPORTANT:

These are NOT claims of objective global novelty.

Label the section:

# Evidence-Based Novelty Signals

Use:

High

Medium

Low

with explanations and citations.

If numerical scores are used, explicitly label them:

"Corpus-based signal"

not:

"Global novelty score"

Example:

Problem Novelty
MEDIUM

Reason:

The problem is well established in 4 indexed papers, but the proposed constraint is not directly addressed.

==================================================
# FEATURE 6: RESEARCH GAP RADAR
==================================================

Use the existing gap-analysis engine as much as possible.

Do not duplicate it.

For the user's idea, identify:

1. Explicit gaps
2. Underexplored areas
3. Conflicting findings
4. Missing evaluations
5. Unresolved technical constraints
6. Unexplored combinations

Every important gap MUST have supporting evidence.

Each gap should include:

Gap

Type

Why it matters

Supporting papers

Evidence

Confidence

==================================================
# FEATURE 7: THE KEY INSIGHT
==================================================

Create a section called:

# Where Your Idea Could Contribute

This is the most important output.

It should synthesize:

Existing Work

+

Observed Gap

+

User's Proposed Idea

=

Potential Research Contribution

Example:

Existing work:

Federated IDS has been studied for IoT.

Blockchain-based trust mechanisms have also been studied.

Gap:

Existing approaches introduce either communication overhead or computational overhead and do not adequately evaluate both under resource-constrained edge conditions.

Potential contribution:

A resource-aware trust layer combining lightweight blockchain consensus with federated intrusion detection.

This must be grounded in retrieved evidence.

==================================================
# FEATURE 8: RESEARCH QUESTIONS
==================================================

Generate 2-4 testable research questions.

Good:

"Can lightweight blockchain consensus maintain trust between federated IoT nodes while keeping communication overhead below X?"

Bad:

"How can blockchain improve IoT?"

Questions should be:

Specific

Measurable

Researchable

Grounded in the identified gap.

==================================================
# FEATURE 9: HYPOTHESIS
==================================================

Generate one primary hypothesis.

Format:

H1:

[Specific testable hypothesis]

Also generate:

Null hypothesis:

H0:

[Corresponding null hypothesis]

Do not invent numerical performance claims unless the literature supports them.

==================================================
# FEATURE 10: EXPERIMENT BLUEPRINT
==================================================

Generate a concrete experimental plan.

Sections:

Dataset

Baseline

Proposed Method

Experimental Setup

Variables

Evaluation Metrics

Ablation Study

Expected Comparison

Example:

Dataset

↓

Baseline IDS

↓

Federated IDS

↓

Blockchain + Federated IDS

↓

Lightweight Consensus Variant

↓

Evaluate:

Accuracy

Precision

Recall

F1

Latency

Communication Overhead

Memory

CPU

Energy

The exact metrics must depend on the user's idea.

Do not blindly use this example for every domain.

==================================================
# FEATURE 11: BASELINES
==================================================

Identify relevant baseline approaches from the retrieved literature.

For each:

Baseline

Why it matters

Paper

Evidence

Do not fabricate baseline implementations.

==================================================
# FEATURE 12: EXPECTED CONTRIBUTIONS
==================================================

Generate 2-4 potential contributions.

Example:

1. Resource-aware architecture
2. Lightweight trust mechanism
3. Evaluation under constrained edge conditions
4. Comparative evaluation against existing federated IDS approaches

Clearly label these as:

"Potential Contributions"

not established contributions.

==================================================
# FEATURE 13: CITATIONS
==================================================

This feature must reuse the existing citation validation mechanism.

Every evidence-backed claim must map to:

paper_id

paper_title

page

snippet

Only citations present in retrieved evidence may be shown.

Never allow the LLM to invent:

- paper names
- page numbers
- evidence
- citations

If citation validation fails, remove the unsupported citation.

==================================================
# BACKEND IMPLEMENTATION
==================================================

Create:

`backend/app/services/ai/validator_service.py`

Reuse:

`llm_client.py`

Reuse:

`retriever.py`

Reuse:

existing citation validation.

==================================================
# SCHEMAS
==================================================

Add Pydantic schemas to:

`backend/app/schemas.py`

Suggested request:

IdeaValidationRequest

Fields:

paper_ids

research_idea

domain

target_problem

proposed_method

constraints

Suggested response:

IdeaValidationResponse

Containing:

idea

corpus_summary

existing_work

overlap_analysis

novelty_signals

research_gaps

potential_contribution

research_questions

hypothesis

experiment_blueprint

baselines

potential_contributions

citations

evidence_quality

==================================================
# API
==================================================

Add:

POST

`/papers/validate-idea`

Request:

{
  "paper_ids": [...],
  "research_idea": "...",
  "domain": "...",
  "target_problem": "...",
  "proposed_method": "...",
  "constraints": "..."
}

Response:

validated structured JSON.

Use the existing centralized LLM client.

==================================================
# RETRIEVAL DESIGN
==================================================

Do NOT send only the raw research idea to the vector database.

Create targeted retrieval queries.

For example:

1. Research idea

2. Problem statement

3. Proposed method

4. Existing approaches

5. Limitations

6. Future work

7. Conflicting findings

8. Evaluation constraints

9. Relevant datasets

10. Relevant baselines

The exact expansion must be generated intelligently from the user's input.

Keep retrieval balanced across selected papers.

==================================================
# TWO-STAGE REASONING
==================================================

Do NOT make one enormous LLM prompt containing everything.

Use a two-stage architecture where practical:

STAGE 1:

Evidence extraction

Retrieve and organize:

- existing methods
- limitations
- gaps
- relevant evidence

STAGE 2:

Idea validation

Give the structured evidence + user idea to the LLM.

Then generate:

- overlap
- novelty signals
- contribution
- research questions
- hypothesis
- experiment plan

This improves grounding and reduces hallucination.

==================================================
# FRONTEND
==================================================

Create:

`frontend/src/components/features/analysis-tabs/IdeaValidatorTab.tsx`

Add:

Tab 5:

Idea Validator

Update:

`frontend/src/lib/api.ts`

Add:

`validateIdea()`

The existing four tabs must continue working.

==================================================
# UI DESIGN
==================================================

The feature should look like the strongest feature in the application.

Use the existing dark glassmorphism visual language.

Structure:

--------------------------------------------

RESEARCH IDEA VALIDATOR

"Stress-test your research idea against your literature."

[ Research Idea textarea ]

[ Domain ]

[ Problem ]

[ Method ]

[ Constraints ]

[ VALIDATE IDEA ]

--------------------------------------------

CORPUS ANALYSIS

Analyzing 10 indexed papers

--------------------------------------------

EXISTING WORK

Paper cards

--------------------------------------------

OVERLAP MAP

Problem     ████████ High
Method      █████ Medium
Dataset     ██ Low
Combination █ Low

--------------------------------------------

EVIDENCE-BASED NOVELTY SIGNALS

Problem        MEDIUM
Method         HIGH
Combination    HIGH
Evaluation     MEDIUM

--------------------------------------------

RESEARCH GAP

[ Main identified gap ]

Supporting evidence

[Paper] [Page]

--------------------------------------------

WHERE YOUR IDEA COULD CONTRIBUTE

[Highlighted contribution]

--------------------------------------------

RESEARCH QUESTIONS

RQ1
RQ2
RQ3

--------------------------------------------

HYPOTHESIS

H1

H0

--------------------------------------------

EXPERIMENT BLUEPRINT

Dataset
Baseline
Method
Variables
Metrics
Ablation

--------------------------------------------

SUPPORTING PAPERS

[Paper cards]

--------------------------------------------

EXPORT

[Export Validation Report]

==================================================
# UX REQUIREMENTS
==================================================

During analysis show stages:

1. Reading your idea
2. Searching indexed literature
3. Mapping existing work
4. Identifying gaps
5. Assessing novelty signals
6. Building research plan

This makes the feature visually compelling during the hackathon demo.

==================================================
# LOADING / ERROR STATES
==================================================

Handle:

No papers selected

No indexed papers

Empty idea

LLM timeout

OpenRouter rate limit

Insufficient evidence

Invalid LLM response

Citation validation failure

Do not crash the workspace.

==================================================
# IMPORTANT PRODUCT LANGUAGE
==================================================

Use:

"Evidence-based novelty signals"

"Corpus-based assessment"

"Potential research contribution"

"Underexplored area"

"Evidence-backed gap"

Do NOT use:

"Guaranteed novelty"

"100% novel"

"No one has done this"

"Globally unique"

==================================================
# TESTING
==================================================

Add:

`backend/tests/test_validator_service.py`

Test:

1. Valid idea
2. Empty idea
3. No selected papers
4. Insufficient evidence
5. Citation validation
6. Malformed LLM response
7. Structured response parsing

Also verify existing tests:

`python -m unittest tests.test_openrouter -v`

`python -m unittest tests.test_rag_pipeline -v`

`python tests/verify_live_queries.py`

The existing tests must not regress.

==================================================
# HACKATHON DEMO TEST
==================================================

Use a realistic example:

"I want to develop a lightweight blockchain-based federated intrusion detection system for resource-constrained IoT devices."

Select 3-5 relevant papers.

Run:

Validate Research Idea

The final screen should clearly demonstrate:

WHAT ALREADY EXISTS

↓

WHERE THE OVERLAP IS

↓

WHAT IS UNDEREXPLORED

↓

WHERE THIS IDEA COULD CONTRIBUTE

↓

HOW TO TEST IT

This should be understandable to a judge in under 30 seconds.

==================================================
# FINAL DELIVERABLE
==================================================

After implementation create:

`RESEARCH_IDEA_VALIDATOR_IMPLEMENTATION.md`

Document:

1. Architecture
2. Backend changes
3. Frontend changes
4. Retrieval strategy
5. LLM prompt strategy
6. Citation grounding
7. Schemas
8. API
9. Tests
10. Known limitations

==================================================
# FINAL RULE
==================================================

Do not destroy the existing product to add this feature.

The existing ResearchGPT capabilities are supporting infrastructure.

The Research Idea Validator is the new flagship capability.

The product positioning should become:

> ResearchGPT helps researchers move from "What has been done?" to "What should I research next?"

Implement carefully, test everything, and report exactly what was changed.