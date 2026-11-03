"""
One-shot migration: tag existing Chroma chunks with chunk_type metadata.

For every Paper with status="indexed", fetches its stored chunks from Chroma
(ids + documents), re-runs classify_chunk() and upserts the metadata - WITHOUT
re-embedding. Idempotent: safe to run any number of times.

Usage:
    cd backend && python -m scripts.reindex_chunk_types
"""
import logging
from collections import defaultdict

from app.database import SessionLocal
from app.models import Paper
from app.services.pdf.document_processor import classify_chunk
from app.services.vector.vector_store import vector_store_service

logger = logging.getLogger("researchgpt.reindex")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")


def reindex_chunk_types() -> dict:
    db = SessionLocal()
    stats = {"papers": 0, "chunks_updated": 0, "references_chunks": 0}
    try:
        collection = vector_store_service.get_collection()
        indexed_papers = db.query(Paper).filter(Paper.status == "indexed").all()

        for paper in indexed_papers:
            result = collection.get(
                where={"paper_id": str(paper.id)},
                include=["documents", "metadatas"],
            )
            ids = result.get("ids") or []
            if not ids:
                continue

            documents = result.get("documents") or []
            metadatas = result.get("metadatas") or []

            # Rebuild per-page text per paper so the References-heading hint works.
            page_text = defaultdict(str)
            for doc, meta in zip(documents, metadatas):
                page_text[int(meta.get("page", 1))] += "\n" + (doc or "")

            new_metadatas = []
            for doc, meta in zip(documents, metadatas):
                page = int(meta.get("page", 1))
                chunk_type = classify_chunk(doc or "", page_text[page])
                new_metadatas.append({
                    "paper_id": str(meta.get("paper_id", paper.id)),
                    "chunk_id": int(meta.get("chunk_id", 0)),
                    "page": page,
                    "chunk_type": chunk_type,
                })
                if chunk_type == "references":
                    stats["references_chunks"] += 1

            collection.update(ids=ids, metadatas=new_metadatas)
            stats["papers"] += 1
            stats["chunks_updated"] += len(ids)
            logger.info(f"Re-tagged {len(ids)} chunks for paper {paper.id} ({paper.title or paper.filename}).")

        logger.info(f"Reindex complete: {stats}")
        return stats
    finally:
        db.close()


if __name__ == "__main__":
    reindex_chunk_types()
