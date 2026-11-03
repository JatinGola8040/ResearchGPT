import json
import logging
from typing import Any, Dict, List

from pydantic import BaseModel, Field, field_validator

from app.services.llm_client import llm_client
from app.services.vector.retriever import retrieve_relevant_chunks
from app.services.ai.stance_service import detect_stances

logger = logging.getLogger("researchgpt.court_service")

JUDGE_SYSTEM_PROMPT = """You are the Judge in a scientific evidence court. Given a CLAIM, PROSECUTION passages
(supporting) and DEFENSE passages (contradicting), write a verdict.
Rules: weigh only the provided passages. Output ONLY valid JSON:
{"label": "supported|contested|unsupported|insufficient_evidence",
 "confidence": <float 0-1>,
 "sentences": [{"sentence": "<one verdict sentence>", "tag": "supported|contested|unsupported",
                "source_passage_id": "<id of the passage this sentence rests on, or null>"}]}
- supported: strong agreeing evidence, no serious contradiction.
- contested: meaningful evidence on both sides.
- unsupported: evidence mostly contradicts the claim.
- insufficient_evidence: too little relevant text.
Every verdict sentence must carry a tag; tag = how well THAT sentence is supported by the corpus."""

_VERDICT_LABELS = {"supported", "contested", "unsupported", "insufficient_evidence"}
_SENTENCE_TAGS = {"supported", "contested", "unsupported"}


class _LLMVerdictSentence(BaseModel):
    sentence: str = ""
    tag: str = "contested"
    source_passage_id: Any = None

    @field_validator("sentence", mode="before")
    @classmethod
    def _coerce_str(cls, v):
        return "" if v is None else str(v)

    @field_validator("tag")
    @classmethod
    def _normalize_tag(cls, v):
        s = str(v or "").strip().lower()
        return s if s in _SENTENCE_TAGS else "contested"


class _LLMVerdict(BaseModel):
    label: str = "insufficient_evidence"
    confidence: float = 0.0
    sentences: List[_LLMVerdictSentence] = Field(default_factory=list)

    @field_validator("label")
    @classmethod
    def _normalize_label(cls, v):
        s = str(v or "").strip().lower()
        return s if s in _VERDICT_LABELS else "insufficient_evidence"

    @field_validator("confidence", mode="before")
    @classmethod
    def _coerce_conf(cls, v):
        try:
            return max(0.0, min(1.0, float(v)))
        except (TypeError, ValueError):
            return 0.0

    @field_validator("sentences", mode="before")
    @classmethod
    def _coerce_list(cls, v):
        return v if isinstance(v, list) else ([] if v is None else [v])


def _to_passage(chunk: Dict[str, Any], passage_id: str) -> Dict[str, Any]:
    return {
        "passage_id": passage_id,
        "paper_id": str(chunk.get("paper_id", "")),
        "paper_title": str(chunk.get("paper_title", "")),
        "page": chunk.get("page", 1),
        "text": str(chunk.get("chunk_text", ""))[:1200],
        "similarity_score": chunk.get("similarity_score", 0.0),
    }


def _strength(similarity: float, stance: str) -> str:
    if stance == "partial":
        return "low"
    if similarity >= 0.6:
        return "high"
    if similarity >= 0.45:
        return "medium"
    return "low"


def run_evidence_court(papers_meta: List[Dict[str, str]], claim: str) -> Dict[str, Any]:
    """
    Prosecutor vs Skeptic vs Judge over the uploaded corpus.
    Returns prosecution/defense passage lists plus a tagged verdict.
    """
    paper_ids = [str(p["paper_id"]) for p in papers_meta]

    # 1. Retrieve both sides
    pros_chunks = retrieve_relevant_chunks(
        query=claim, top_k=6, filter_paper_ids=paper_ids, expand_query=False
    )
    def_chunks = retrieve_relevant_chunks(
        query=f"evidence against: {claim} limitations criticisms failure contradictory results",
        top_k=6, filter_paper_ids=paper_ids, expand_query=False
    )

    passages: List[Dict[str, Any]] = []
    seen_texts = set()
    for i, c in enumerate(pros_chunks + def_chunks):
        text_key = str(c.get("chunk_text", ""))[:80]
        if text_key in seen_texts:
            continue
        seen_texts.add(text_key)
        passages.append(_to_passage(c, f"psg-{i}"))

    if not passages:
        return {
            "claim": claim,
            "prosecution": [],
            "defense": [],
            "verdict": {"label": "insufficient_evidence", "confidence": 0.0, "sentences": []},
        }

    # 2. Stance pass over both pools
    claims = [{"claim_id": "the-claim", "paper_id": "", "claim": claim}]
    judgments = detect_stances(claims, {"the-claim": passages})

    prosecution: List[Dict[str, Any]] = []
    defense: List[Dict[str, Any]] = []
    for j in judgments:
        passage = next((p for p in passages if p["passage_id"] == j["passage_id"]), None)
        if not passage or j["stance"] == "unrelated":
            continue
        entry = {
            "passage_id": passage["passage_id"],
            "paper_id": passage["paper_id"],
            "paper_title": passage["paper_title"],
            "page": passage["page"],
            "text": passage["text"],
            "strength": _strength(passage.get("similarity_score", 0.0), j["stance"]),
        }
        if j["stance"] == "agrees":
            prosecution.append(entry)
        elif j["stance"] == "contradicts":
            defense.append(entry)
        else:  # partial -> side with higher pool similarity, flagged low
            if (passage.get("similarity_score") or 0) >= 0.5:
                prosecution.append({**entry, "strength": "low"})
            else:
                defense.append({**entry, "strength": "low"})

    # 3. Judge
    judge_payload = {
        "claim": claim,
        "prosecution": [
            {"passage_id": p["passage_id"], "paper_title": p["paper_title"], "page": p["page"], "text": p["text"][:800]}
            for p in prosecution
        ],
        "defense": [
            {"passage_id": p["passage_id"], "paper_title": p["paper_title"], "page": p["page"], "text": p["text"][:800]}
            for p in defense
        ],
    }
    try:
        data = llm_client.generate_json(
            messages=[
                {"role": "system", "content": JUDGE_SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(judge_payload, indent=1)},
            ],
            schema_cls=_LLMVerdict,
            temperature=0.1,
        )
        verdict = _LLMVerdict.model_validate(data)
    except Exception as e:
        logger.error(f"Judge stage failed: {e}")
        verdict = _LLMVerdict(label="insufficient_evidence", confidence=0.0, sentences=[])

    # Map source_passage_id back to full passage objects
    passage_by_id = {p["passage_id"]: p for p in passages}
    sentences = []
    for s in verdict.sentences:
        source = None
        if s.source_passage_id and str(s.source_passage_id) in passage_by_id:
            p = passage_by_id[str(s.source_passage_id)]
            source = {
                "paper_id": p["paper_id"],
                "paper_title": p["paper_title"],
                "page": p["page"],
                "text": p["text"][:600],
            }
        sentences.append({"sentence": s.sentence, "tag": s.tag, "source": source})

    return {
        "claim": claim,
        "prosecution": [
            {k: v for k, v in p.items() if k != "similarity_score"} for p in prosecution
        ],
        "defense": [
            {k: v for k, v in p.items() if k != "similarity_score"} for p in defense
        ],
        "verdict": {
            "label": verdict.label,
            "confidence": verdict.confidence,
            "sentences": sentences,
        },
    }
