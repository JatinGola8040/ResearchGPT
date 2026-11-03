import re
import uuid
import logging
from typing import List, Dict, Any, Optional
from difflib import SequenceMatcher

from sqlalchemy.orm import Session

from app.models import Paper, PaperReference

logger = logging.getLogger("researchgpt.reference_extractor")

_DOI_RE = re.compile(r'(10\.\d{4,9}/\S+)', re.IGNORECASE)
_URL_RE = re.compile(r'(https?://\S+)', re.IGNORECASE)
_YEAR_RE = re.compile(r'\b((?:19|20)\d{2})\b')
_NUMBERED_REF_RE = re.compile(r'^\s*\[(\d{1,3})\]\s*', re.MULTILINE)


def split_reference_entries(text: str) -> List[Dict[str, Any]]:
    """
    Splits concatenated bibliography chunk text into individual reference entries.
    Numbered styles split on leading [n] markers; otherwise split on blank lines
    and author-year starts. Best effort.
    """
    if not text or not text.strip():
        return []

    entries: List[Dict[str, Any]] = []

    numbered_matches = list(_NUMBERED_REF_RE.finditer(text))
    if len(numbered_matches) >= 2:
        for i, m in enumerate(numbered_matches):
            start = m.end()
            end = numbered_matches[i + 1].start() if i + 1 < len(numbered_matches) else len(text)
            body = text[start:end].strip()
            if len(body) > 15:
                entries.append({"ref_index": int(m.group(1)), "raw_text": body})
        return entries

    # Unnumbered: split on blank lines, then merge very short fragments forward
    blocks = [b.strip() for b in re.split(r'\n\s*\n', text) if b.strip()]
    for block in blocks:
        if len(block) <= 15:
            if entries:
                entries[-1]["raw_text"] += " " + block
            continue
        entries.append({"ref_index": None, "raw_text": block})

    return entries


def parse_reference_fields(raw_text: str) -> Dict[str, Any]:
    """Extracts structured fields from a single reference string. Best effort."""
    fields: Dict[str, Any] = {"doi": None, "url": None, "year": None, "title_guess": None}

    doi_m = _DOI_RE.search(raw_text)
    if doi_m:
        fields["doi"] = doi_m.group(1).rstrip('.,;)')

    url_m = _URL_RE.search(raw_text)
    if url_m:
        fields["url"] = url_m.group(1).rstrip('.,;)')

    year_m = _YEAR_RE.search(raw_text)
    if year_m:
        fields["year"] = year_m.group(1)

    # Title guess: longest quoted segment, else text between leading authors and the year/venue
    quoted = re.findall(r'["\u201c\u201d]([^"\u201c\u201d]{10,200})["\u201c\u201d]', raw_text)
    if quoted:
        fields["title_guess"] = max(quoted, key=len).strip().rstrip(",;:.")
    else:
        # heuristic: segment after first ". " following author list, up to next period
        parts = re.split(r'\.\s+', raw_text, maxsplit=2)
        if len(parts) >= 2 and 10 <= len(parts[1]) <= 250:
            fields["title_guess"] = parts[1].strip()

    return fields


def _normalize_title(title: str) -> str:
    return re.sub(r'[^a-z0-9 ]', '', (title or '').lower()).strip()


def match_to_uploaded_paper(ref_fields: Dict[str, Any], papers: List[Paper]) -> Optional[str]:
    """
    Tries to match an extracted reference to another uploaded Paper.
    (a) DOI equality if we ever store DOIs on Paper (not stored today - skipped);
    (b) normalized title fuzzy match (SequenceMatcher ratio >= 0.85).
    """
    guess = _normalize_title(ref_fields.get("title_guess") or "")
    if len(guess) < 8:
        return None
    best_id, best_ratio = None, 0.0
    for p in papers:
        candidate = _normalize_title(p.title or p.filename or "")
        if len(candidate) < 8:
            continue
        ratio = SequenceMatcher(None, guess, candidate).ratio()
        if ratio > best_ratio:
            best_id, best_ratio = p.id, ratio
    return best_id if best_ratio >= 0.85 else None


def extract_and_store_references(
    db: Session,
    paper_id: str,
    reference_chunks: List[str],
) -> int:
    """
    Extracts structured references from a paper's bibliography chunks and stores
    them in the paper_references table. Never raises: failures log a warning and
    leave references empty so ingestion still succeeds.
    """
    try:
        combined = "\n\n".join(reference_chunks)
        entries = split_reference_entries(combined)
        if not entries:
            return 0

        other_papers = db.query(Paper).filter(Paper.id != paper_id).all()

        # Clear any previous extraction for idempotent re-runs
        db.query(PaperReference).filter(PaperReference.paper_id == paper_id).delete()

        stored = 0
        for entry in entries:
            fields = parse_reference_fields(entry["raw_text"])
            matched = match_to_uploaded_paper(fields, other_papers)
            db.add(PaperReference(
                id=str(uuid.uuid4()),
                paper_id=paper_id,
                ref_index=entry.get("ref_index"),
                raw_text=entry["raw_text"],
                title_guess=fields.get("title_guess"),
                year=fields.get("year"),
                doi=fields.get("doi"),
                url=fields.get("url"),
                matched_paper_id=matched,
            ))
            stored += 1
        db.commit()
        logger.info(f"Stored {stored} references for paper {paper_id}.")
        return stored
    except Exception as e:
        logger.warning(f"Reference extraction failed for paper {paper_id}: {e}")
        try:
            db.rollback()
        except Exception:
            pass
        return 0


def rematch_all_references(db: Session) -> int:
    """
    Re-runs internal matching across all stored references. Call after a new
    paper's references are stored so older papers' references can link to it.
    Returns the number of references whose match changed.
    """
    try:
        papers = db.query(Paper).all()
        changed = 0
        for ref in db.query(PaperReference).all():
            others = [p for p in papers if p.id != ref.paper_id]
            new_match = match_to_uploaded_paper(
                {"title_guess": ref.title_guess}, others
            )
            if new_match != ref.matched_paper_id:
                ref.matched_paper_id = new_match
                changed += 1
        if changed:
            db.commit()
        return changed
    except Exception as e:
        logger.warning(f"Reference re-matching failed: {e}")
        try:
            db.rollback()
        except Exception:
            pass
        return 0
