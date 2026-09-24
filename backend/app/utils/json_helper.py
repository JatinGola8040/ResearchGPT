import re
import json
from typing import Dict, Any

def extract_clean_text(raw_text: str) -> str:
    """
    Strips reasoning <think>...</think> tags from LLM responses without losing the actual answer.
    """
    if not raw_text:
        return ""

    cleaned = raw_text

    # Step 1: Strip standard closed <think>...</think> blocks
    cleaned = re.sub(r'<think>.*?</think>', '', cleaned, flags=re.DOTALL)

    # Step 2: If closing tag exists without opening tag, take everything after </think>
    if '</think>' in cleaned:
        cleaned = re.sub(r'^.*?</think>', '', cleaned, flags=re.DOTALL)

    # Step 3: If an unclosed <think> tag remains, remove the tag itself rather than deleting content
    if '<think>' in cleaned:
        cleaned = cleaned.replace('<think>', '')

    # Step 4: Strip any residual XML-like thinking artifacts
    cleaned = re.sub(r'</?think>', '', cleaned)

    return cleaned.strip()

def _repair_json_string(text: str) -> str:
    """
    Attempts to fix common LLM JSON syntax issues:
    - Trailing commas
    - Unescaped newlines inside strings
    - Unclosed strings at cutoff points
    - Unclosed brackets and braces
    """
    # 1. Clean markdown fences & think tags
    cleaned = extract_clean_text(text)
    cleaned = re.sub(r'```(?:json)?\s*', '', cleaned)
    cleaned = re.sub(r'\s*```', '', cleaned)
    cleaned = cleaned.strip()

    # Find the first '{'
    start_idx = cleaned.find('{')
    if start_idx == -1:
        return cleaned
    cleaned = cleaned[start_idx:]

    # 2. Fix trailing commas before } or ]
    cleaned = re.sub(r',\s*([\}\]])', r'\1', cleaned)

    # 3. Check if quotes are balanced
    quote_count = cleaned.count('"') - cleaned.count(r'\"')
    if quote_count % 2 != 0:
        # Unterminated string at the end: close the quote
        cleaned += '"'

    # 4. Strip trailing incomplete key or comma
    cleaned = re.sub(r',\s*"[^"]*":?\s*$', '', cleaned)
    cleaned = re.sub(r',\s*$', '', cleaned)

    # 5. Balance braces and brackets
    open_sq = cleaned.count('[') - cleaned.count(']')
    open_cur = cleaned.count('{') - cleaned.count('}')
    if open_sq > 0 or open_cur > 0:
        cleaned = cleaned + (']' * max(0, open_sq)) + ('}' * max(0, open_cur))
        cleaned = re.sub(r',\s*([\}\]])', r'\1', cleaned)

    return cleaned


def extract_json_from_response(raw_text: str) -> Dict[str, Any]:
    """
    Extracts and parses JSON object from an LLM response string.
    Handles <think> tags, markdown code blocks, trailing commas, unclosed strings, and unclosed brackets.
    """
    if not raw_text or not raw_text.strip():
        return {}

    cleaned = extract_clean_text(raw_text)
    cleaned = re.sub(r'```(?:json)?\s*', '', cleaned)
    cleaned = re.sub(r'\s*```', '', cleaned).strip()

    # Attempt 1: Direct parse
    try:
        return json.loads(cleaned)
    except Exception:
        pass

    # Attempt 2: Extract outermost {...}
    match = re.search(r'\{.*\}', cleaned, flags=re.DOTALL)
    if match:
        json_str = match.group(0)
        try:
            return json.loads(json_str)
        except Exception:
            pass

        try:
            fixed = re.sub(r',\s*([\}\]])', r'\1', json_str)
            return json.loads(fixed)
        except Exception:
            pass

    # Attempt 3: Repaired JSON string
    try:
        repaired = _repair_json_string(cleaned)
        return json.loads(repaired)
    except Exception:
        pass

    # Attempt 4: Regex-based field extraction for critical keys
    fallback_dict: Dict[str, Any] = {}
    try:
        summary_m = re.search(r'"corpus_summary"\s*:\s*"([^"]+)"', cleaned)
        if summary_m:
            fallback_dict["corpus_summary"] = summary_m.group(1)

        contrib_m = re.search(r'"potential_contribution"\s*:\s*"([^"]+)"', cleaned)
        if contrib_m:
            fallback_dict["potential_contribution"] = contrib_m.group(1)

        h1_m = re.search(r'"h1"\s*:\s*"([^"]+)"', cleaned)
        h0_m = re.search(r'"h0"\s*:\s*"([^"]+)"', cleaned)
        if h1_m or h0_m:
            fallback_dict["hypothesis"] = {
                "h1": h1_m.group(1) if h1_m else "",
                "h0": h0_m.group(1) if h0_m else "",
            }
    except Exception:
        pass

    return fallback_dict
