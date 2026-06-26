from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from app.database import Base, engine
from app.routers import papers, query
from app.services.vector.vector_store import vector_store_service
from app.services.vector.retriever import retrieve_relevant_chunks

# Create SQLite database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ResearchGPT API",
    description="AI-Powered Research Intelligence Platform MVP",
    version="1.0.0"
)

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Standardized Exception Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "data": None
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    error_msg = errors[0].get("msg", "Validation error") if errors else "Invalid request payload"
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": f"Validation Failed: {error_msg}",
            "data": errors
        }
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": f"Internal Server Error: {str(exc)}",
            "data": None
        }
    )

# Register routers
app.include_router(papers.router)
app.include_router(query.router)

@app.get("/")
def root():
    return {
        "success": True,
        "message": "ResearchGPT Backend API is Operational.",
        "data": {"status": "running"}
    }

@app.get("/health")
def health():
    return {
        "success": True,
        "message": "System health check passed.",
        "data": {"status": "healthy"}
    }

@app.get("/debug/vector-count", tags=["debug"])
def debug_vector_count():
    """
    Temporary debugging endpoint returning the total indexed chunks count in ChromaDB.
    """
    collection = vector_store_service.get_collection()
    return {
        "success": True,
        "message": "Retrieved vector collection document count.",
        "data": {
            "collection": vector_store_service.collection_name,
            "documents": collection.count()
        }
    }

class DebugSearchRequest(BaseModel):
    query: str

@app.post("/debug/search", tags=["debug"])
def debug_search(req: DebugSearchRequest):
    """
    Temporary development endpoint for testing semantic search retrieval.
    """
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty.")
        
    chunks = retrieve_relevant_chunks(req.query, top_k=5)
    return {
        "success": True,
        "message": "Debug search completed successfully.",
        "data": {
            "query": req.query,
            "results": chunks
        }
    }
