from typing import List, Dict, Any, Optional
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.config import settings

_embeddings_model = None
_vector_store = None

def get_embeddings():
    global _embeddings_model
    if _embeddings_model is None:
        _embeddings_model = HuggingFaceEmbeddings(model_name=settings.EMBEDDING_MODEL)
    return _embeddings_model

def get_vector_store() -> Chroma:
    global _vector_store
    if _vector_store is None:
        _vector_store = Chroma(
            collection_name="research_papers",
            embedding_function=get_embeddings(),
            persist_directory=settings.CHROMA_DB_DIR
        )
    return _vector_store

def index_paper(paper_id: str, title: str, extracted_pages: List[Dict[str, Any]]):
    """
    Chunks extracted pages and stores them in ChromaDB with metadata.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ".", " ", ""]
    )

    texts = []
    metadatas = []

    for page in extracted_pages:
        page_num = page["page_num"]
        page_text = page["text"]
        if not page_text:
            continue

        chunks = splitter.split_text(page_text)
        for chunk in chunks:
            texts.append(chunk)
            metadatas.append({
                "paper_id": paper_id,
                "title": title or "Untitled Paper",
                "page": page_num
            })

    if texts:
        vs = get_vector_store()
        vs.add_texts(texts=texts, metadatas=metadatas)

def delete_paper_index(paper_id: str):
    """
    Deletes all vector chunks associated with a specific paper_id.
    """
    vs = get_vector_store()
    # Retrieve IDs matching filter
    collection = vs._collection
    matching = collection.get(where={"paper_id": paper_id})
    if matching and matching.get("ids"):
        collection.delete(ids=matching["ids"])

def query_vector_store(query: str, paper_ids: List[str], k: int = 6) -> List[Dict[str, Any]]:
    """
    Retrieves top-k relevant chunks filtered by paper_ids.
    """
    vs = get_vector_store()
    filter_dict = None
    if paper_ids:
        if len(paper_ids) == 1:
            filter_dict = {"paper_id": paper_ids[0]}
        else:
            filter_dict = {"paper_id": {"$in": paper_ids}}

    results = vs.similarity_search(query, k=k, filter=filter_dict)
    
    formatted_chunks = []
    for doc in results:
        formatted_chunks.append({
            "snippet": doc.page_content,
            "paper_id": doc.metadata.get("paper_id", ""),
            "title": doc.metadata.get("title", ""),
            "page": doc.metadata.get("page", 1)
        })
    return formatted_chunks
