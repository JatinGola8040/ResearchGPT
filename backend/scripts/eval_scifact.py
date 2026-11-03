"""
SciFact evaluation for the Evidence Court stance+judge pipeline.

Downloads SciFact (claims + corpus) or reads a local copy, ingests the cited
abstracts of a sample of claims as pseudo-papers into an ISOLATED Chroma
collection ("scifact_eval" - never touches "research_papers"), runs stance
detection + the judge, and reports per-class P/R/F1 and macro-F1 against gold
labels. Writes backend/eval_results_scifact.json.

Usage:
    cd backend && python -m scripts.eval_scifact [--n 50] [--data-dir PATH]
"""
import argparse
import io
import json
import logging
import tarfile
from collections import Counter
from pathlib import Path

import httpx

from app.services.ai.stance_service import detect_stances
from app.services.ai.court_service import JUDGE_SYSTEM_PROMPT, _LLMVerdict
from app.services.llm_client import llm_client
from app.services.vector.embedding_service import get_embedding_model
from app.services.vector.vector_store import vector_store_service

logger = logging.getLogger("researchgpt.eval_scifact")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

SCIFACT_URL = "https://scifact.s3.us-west-2.amazonaws.com/release/latest/data.tar.gz"
EVAL_COLLECTION = "scifact_eval"

# Predicted -> gold mapping: supported->SUPPORT, unsupported->CONREFUTE,
# contested->CONREFUTE if defense dominates else SUPPORT is ambiguous; per spec:
# supported/contested/unsupported map to SUPPORT/CONREFUTE/NOINFO
PRED_TO_GOLD = {
    "supported": "SUPPORT",
    "contested": "CONREFUTE",
    "unsupported": "CONREFUTE",
    "insufficient_evidence": "NOINFO",
}


def download_scifact(data_dir: Path) -> None:
    data_dir.mkdir(parents=True, exist_ok=True)
    logger.info(f"Downloading SciFact from {SCIFACT_URL} ...")
    with httpx.Client(timeout=120.0, follow_redirects=True) as client:
        resp = client.get(SCIFACT_URL)
        resp.raise_for_status()
    with tarfile.open(fileobj=io.BytesIO(resp.content), mode="r:gz") as tar:
        tar.extractall(data_dir)
    logger.info(f"Extracted SciFact to {data_dir}")


def load_jsonl(path: Path) -> list:
    with open(path) as f:
        return [json.loads(line) for line in f if line.strip()]


def find_file(data_dir: Path, name: str) -> Path:
    matches = list(data_dir.rglob(name))
    if not matches:
        raise FileNotFoundError(f"{name} not found under {data_dir}")
    return matches[0]


def get_eval_collection():
    return vector_store_service.client.get_or_create_collection(
        name=EVAL_COLLECTION, metadata={"hnsw:space": "cosine"}
    )


def ingest_abstracts(claims_sample: list, corpus: dict) -> None:
    """Ingests cited abstracts for the sampled claims into the isolated eval collection."""
    model = get_embedding_model()
    collection = get_eval_collection()

    needed_doc_ids = set()
    for claim in claims_sample:
        needed_doc_ids.update(str(d) for d in claim.get("cited_doc_ids", []))

    ids, docs, metas = [], [], []
    for doc_id in sorted(needed_doc_ids):
        entry = corpus.get(doc_id)
        if not entry:
            continue
        abstract = " ".join(entry.get("abstract", []))
        if not abstract.strip():
            continue
        ids.append(f"doc-{doc_id}")
        docs.append(f"{entry.get('title', '')}\n\n{abstract}")
        metas.append({"doc_id": doc_id, "title": entry.get("title", "")})

    if not ids:
        return
    embeddings = model.encode(docs, show_progress_bar=False).tolist()
    collection.upsert(ids=ids, embeddings=embeddings, documents=docs, metadatas=metas)
    logger.info(f"Ingested {len(ids)} abstracts into '{EVAL_COLLECTION}'.")


def retrieve_passages(claim_text: str, top_k: int = 6) -> list:
    model = get_embedding_model()
    collection = get_eval_collection()
    q_vec = model.encode(claim_text, show_progress_bar=False).tolist()
    res = collection.query(query_embeddings=[q_vec], n_results=top_k, include=["documents", "metadatas", "distances"])
    passages = []
    if res and res.get("documents") and res["documents"][0]:
        for i, (doc, meta, dist) in enumerate(zip(res["documents"][0], res["metadatas"][0], res["distances"][0])):
            passages.append({
                "passage_id": f"psg-{i}",
                "doc_id": meta.get("doc_id"),
                "paper_title": meta.get("title", ""),
                "page": 1,
                "text": doc,
                "similarity_score": round(1.0 - float(dist), 4),
            })
    return passages


def judge(claim_text: str, prosecution: list, defense: list) -> _LLMVerdict:
    payload = {
        "claim": claim_text,
        "prosecution": [{"passage_id": p["passage_id"], "text": p["text"][:800]} for p in prosecution],
        "defense": [{"passage_id": p["passage_id"], "text": p["text"][:800]} for p in defense],
    }
    try:
        data = llm_client.generate_json(
            messages=[
                {"role": "system", "content": JUDGE_SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps(payload, indent=1)},
            ],
            schema_cls=_LLMVerdict,
            temperature=0.1,
        )
        return _LLMVerdict.model_validate(data)
    except Exception as e:
        logger.warning(f"Judge failed: {e}")
        return _LLMVerdict(label="insufficient_evidence", confidence=0.0, sentences=[])


def compute_metrics(pairs: list) -> dict:
    """pairs: list of (gold, predicted) labels in {SUPPORT, CONREFUTE, NOINFO}."""
    labels = ["SUPPORT", "CONREFUTE", "NOINFO"]
    per_class = {}
    for label in labels:
        tp = sum(1 for g, p in pairs if g == label and p == label)
        fp = sum(1 for g, p in pairs if g != label and p == label)
        fn = sum(1 for g, p in pairs if g == label and p != label)
        precision = tp / (tp + fp) if (tp + fp) else 0.0
        recall = tp / (tp + fn) if (tp + fn) else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
        per_class[label] = {"precision": round(precision, 4), "recall": round(recall, 4), "f1": round(f1, 4), "support": sum(1 for g, _ in pairs if g == label)}
    macro_f1 = sum(c["f1"] for c in per_class.values()) / len(labels)
    accuracy = sum(1 for g, p in pairs if g == p) / len(pairs) if pairs else 0.0
    return {"per_class": per_class, "macro_f1": round(macro_f1, 4), "accuracy": round(accuracy, 4), "n": len(pairs)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=50, help="Number of claims to evaluate")
    parser.add_argument("--data-dir", type=str, default=None, help="Local SciFact directory (skips download)")
    args = parser.parse_args()

    data_dir = Path(args.data_dir) if args.data_dir else Path("./storage/scifact_data")
    if not (args.data_dir and list(data_dir.rglob("claims.jsonl"))):
        if not list(data_dir.rglob("claims.jsonl")):
            download_scifact(data_dir)

    claims = load_jsonl(find_file(data_dir, "claims.jsonl"))
    corpus_list = load_jsonl(find_file(data_dir, "corpus.jsonl"))
    corpus = {str(d["doc_id"]): d for d in corpus_list}

    # Sample: only claims with gold evidence labels
    labeled = [c for c in claims if c.get("evidence")]
    sample = labeled[: args.n]
    logger.info(f"Evaluating {len(sample)} claims.")

    ingest_abstracts(sample, corpus)

    pairs = []
    confusion = Counter()
    for i, claim in enumerate(sample):
        claim_text = claim["claim"]
        gold = claim.get("label", "NOINFO")

        passages = retrieve_passages(claim_text)
        judgments = detect_stances(
            [{"claim_id": "c", "claim": claim_text}],
            {"c": passages},
        )
        pros, defs = [], []
        by_id = {p["passage_id"]: p for p in passages}
        for j in judgments:
            p = by_id.get(j["passage_id"])
            if not p:
                continue
            if j["stance"] == "agrees":
                pros.append(p)
            elif j["stance"] == "contradicts":
                defs.append(p)

        verdict = judge(claim_text, pros, defs)
        pred = PRED_TO_GOLD.get(verdict.label, "NOINFO")
        pairs.append((gold, pred))
        confusion[(gold, pred)] += 1
        logger.info(f"[{i+1}/{len(sample)}] gold={gold} pred={pred} ({verdict.label})")

    metrics = compute_metrics(pairs)

    print("\n================ SciFact Evaluation ================")
    for label, m in metrics["per_class"].items():
        print(f"{label:10s}  P={m['precision']:.3f}  R={m['recall']:.3f}  F1={m['f1']:.3f}  (n={m['support']})")
    print(f"\nMacro-F1: {metrics['macro_f1']:.4f}   Accuracy: {metrics['accuracy']:.4f}   N={metrics['n']}")
    print("====================================================\n")

    out = Path("./eval_results_scifact.json")
    out.write_text(json.dumps({"metrics": metrics, "confusion": {f"{g}->{p}": n for (g, p), n in confusion.items()}}, indent=2))
    logger.info(f"Wrote {out}")


if __name__ == "__main__":
    main()
