from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.database import Base, engine
from app.routers import papers
from app.services.vector.vector_store import vector_store_service
from app.services.vector.retriever import retrieve_relevant_chunks

# Create SQLite database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ResearchGPT API",
    description="AI-Powered Research Intelligence Platform MVP",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(papers.router)

# Placeholder router for Phase 2 unified query endpoint
query_placeholder_router = APIRouter(prefix="/query", tags=["query"])

@query_placeholder_router.post("")
def query_placeholder():
    return {"message": "Query endpoint placeholder - Phase 2"}

app.include_router(query_placeholder_router)

@app.get("/")
def root():
    return {"message": "ResearchGPT Backend Running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/debug/vector-count", tags=["debug"])
def debug_vector_count():
    """
    Temporary debugging endpoint returning the total indexed chunks count in ChromaDB.
    """
    collection = vector_store_service.get_collection()
    return {
        "collection": vector_store_service.collection_name,
        "documents": collection.count()
    }

class DebugSearchRequest(BaseModel):
    query: str

@app.post("/debug/search", tags=["debug"])
def debug_search(req: DebugSearchRequest):
    """
    Temporary development endpoint for testing semantic search retrieval.
    """
    chunks = retrieve_relevant_chunks(req.query, top_k=5)
    return {
        "query": req.query,
        "results": chunks
    }
