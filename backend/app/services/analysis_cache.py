import hashlib
import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models import AnalysisCache

logger = logging.getLogger("researchgpt.analysis_cache")


def make_cache_key(kind: str, paper_ids: List[str], extra: str = "") -> str:
    """Deterministic cache key: kind + hash of the sorted paper-id set (+ optional extra like a claim)."""
    payload = json.dumps({"ids": sorted(str(p) for p in paper_ids), "extra": extra}, sort_keys=True)
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()[:24]
    return f"{kind}:{digest}"


def get_cached(db: Session, kind: str, paper_ids: List[str], extra: str = "") -> Optional[Dict[str, Any]]:
    key = make_cache_key(kind, paper_ids, extra)
    try:
        row = db.query(AnalysisCache).filter(AnalysisCache.id == key).first()
        if row:
            logger.info(f"Analysis cache HIT for {key}")
            return json.loads(row.result_json)
    except Exception as e:
        logger.warning(f"Analysis cache read failed for {key}: {e}")
    return None


def set_cached(db: Session, kind: str, paper_ids: List[str], result: Dict[str, Any], extra: str = "") -> None:
    key = make_cache_key(kind, paper_ids, extra)
    try:
        row = db.query(AnalysisCache).filter(AnalysisCache.id == key).first()
        payload = json.dumps(result)
        if row:
            row.result_json = payload
            row.created_at = datetime.utcnow()
        else:
            row = AnalysisCache(
                id=key,
                kind=kind,
                paper_ids=json.dumps(sorted(str(p) for p in paper_ids)),
                result_json=payload,
            )
            db.add(row)
        db.commit()
    except Exception as e:
        logger.warning(f"Analysis cache write failed for {key}: {e}")
        try:
            db.rollback()
        except Exception:
            pass
