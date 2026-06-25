import os
from typing import List, Dict, Any
import chromadb
from chromadb.api.models.Collection import Collection
from app.config import settings

class VectorStoreService:
    """
    Modular ChromaDB PersistentClient service managing research paper vector storage.
    """
    def __init__(self):
        self.persist_path = getattr(settings, "CHROMA_DB_DIR", "./storage/chroma_db")
        os.makedirs(self.persist_path, exist_ok=True)
        self.client = chromadb.PersistentClient(path=self.persist_path)
        self.collection_name = "research_papers"

    def get_collection(self) -> Collection:
        """
        Retrieves or initializes the research_papers ChromaDB collection.
        """
        return self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"}
        )

    def add_document(self, paper_id: str, embedded_chunks: List[Dict[str, Any]]) -> int:
        """
        Accepts paper_id and embedded chunks produced by embedding_service.py.
        Stores embedding vectors, chunk text, page number, paper_id, and chunk_id.
        Returns the count of inserted records.
        """
        if not embedded_chunks:
            return 0

        collection = self.get_collection()

        ids = []
        embeddings = []
        documents = []
        metadatas = []

        for chunk in embedded_chunks:
            c_id = chunk.get("chunk_id", 1)
            page = chunk.get("page", 1)
            text = chunk.get("text", "")
            vec = chunk.get("embedding", [])

            if not text or not vec:
                continue

            unique_id = f"{paper_id}_chunk_{c_id}"

            ids.append(unique_id)
            embeddings.append(vec)
            documents.append(text)
            metadatas.append({
                "paper_id": str(paper_id),
                "chunk_id": int(c_id),
                "page": int(page)
            })

        if ids:
            collection.upsert(
                ids=ids,
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas
            )
            return len(ids)
        return 0

    def delete_document(self, paper_id: str) -> bool:
        """
        Removes all stored vectors associated with the given paper_id.
        """
        try:
            collection = self.get_collection()
            collection.delete(where={"paper_id": str(paper_id)})
            return True
        except Exception as e:
            print(f"Exception deleting vector chunks for {paper_id}: {e}")
            return False

    def reset_collection(self) -> bool:
        """
        Drops and re-creates the research_papers collection.
        """
        try:
            self.client.delete_collection(name=self.collection_name)
            self.get_collection()
            return True
        except Exception as e:
            print(f"Exception resetting ChromaDB collection: {e}")
            return False

# Global service instance
vector_store_service = VectorStoreService()
