import logging
from typing import Any, Dict, List

from pydantic import BaseModel, Field, field_validator

from app.services.llm_client import llm_client

logger = logging.getLogger("researchgpt.stance_service")

STANCE_SYSTEM_PROMPT = """You are a scientific claim-alignment engine. You receive a list of CLAIMS and, for each
claim, a set of PASSAGES taken from different research papers (each passage has passage_id,
paper_title and page). For every (claim, passage) pair decide the stance of the passage
toward the claim:
  - "agrees": the passage clearly supports or independently reaches the same finding.
  - "contradicts": the passage clearly disputes or reports an incompatible finding.
  - "partial": the passage is related but only partially supports, qualifies, or uses a
    different method/dataset, so agreement is ambiguous.
  - "unrelated": the passage does not bear on the claim.
Rules: judge ONLY from the passage text. Never invent content. When unsure choose "partial".
Respond ONLY with valid JSON:
{"judgments": [{"claim_id": "...", "passage_id": "...", "stance": "agrees|contradicts|partial|unrelated", "rationale": "one sentence"}]}"""

_VALID_STANCES = {"agrees", "contradicts", "partial", "unrelated"}


class _LLMStanceJudgment(BaseModel):
    claim_id: str = ""
    passage_id: str = ""
    stance: str = "partial"
    rationale: str = ""

    @field_validator("claim_id", "passage_id", "stance", "rationale", mode="before")
    @classmethod
    def _coerce_str(cls, v):
        if v is None:
            return ""
        if isinstance(v, (list, dict)):
            return str(v)
        return str(v)

    @field_validator("stance")
    @classmethod
    def _normalize_stance(cls, v):
        s = (v or "").strip().lower()
        return s if s in _VALID_STANCES else "partial"


class _LLMStanceOutput(BaseModel):
    judgments: List[_LLMStanceJudgment] = Field(default_factory=list)

    @field_validator("judgments", mode="before")
    @classmethod
    def _coerce_list(cls, v):
        if v is None:
            return []
        if isinstance(v, list):
            return v
        return [v]


def _chunk_list(items: List[Any], size: int) -> List[List[Any]]:
    return [items[i:i + size] for i in range(0, len(items), size)]


def detect_stances(
    claims: List[Dict[str, Any]],
    passages_by_claim: Dict[str, List[Dict[str, Any]]],
) -> List[Dict[str, Any]]:
    """
    Runs stance detection for every (claim, passage) pair.
    Requests are chunked so a single LLM call never carries more than ~6 claims
    with ~3 passages each; results are merged. Unknown stances coerce to "partial".
    """
    results: List[Dict[str, Any]] = []

    for claim_batch in _chunk_list(claims, 6):
        batch_payload = []
        for claim in claim_batch:
            cid = str(claim.get("claim_id", ""))
            passages = (passages_by_claim.get(cid) or [])[:3]
            batch_payload.append({
                "claim_id": cid,
                "claim": str(claim.get("claim", "")),
                "passages": [
                    {
                        "passage_id": str(p.get("passage_id", "")),
                        "paper_title": str(p.get("paper_title", "")),
                        "page": p.get("page", 1),
                        "text": str(p.get("text", ""))[:1200],
                    }
                    for p in passages
                ],
            })

        if not any(c["passages"] for c in batch_payload):
            continue

        user_msg = "CLAIMS and PASSAGES (JSON):\n" + __import__("json").dumps(batch_payload, indent=1)
        try:
            data = llm_client.generate_json(
                messages=[
                    {"role": "system", "content": STANCE_SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg},
                ],
                schema_cls=_LLMStanceOutput,
                temperature=0.1,
            )
        except Exception as e:
            logger.error(f"Stance detection batch failed: {e}")
            continue

        judgments = data.get("judgments", [])
        if not isinstance(judgments, list):
            judgments = [judgments]
        for j in judgments:
            try:
                parsed = _LLMStanceJudgment.model_validate(j)
            except Exception:
                continue
            if not parsed.claim_id or not parsed.passage_id:
                continue
            results.append({
                "claim_id": parsed.claim_id,
                "passage_id": parsed.passage_id,
                "stance": parsed.stance,
                "rationale": parsed.rationale,
            })

    return results
