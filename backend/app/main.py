import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import papers, query, export, graph
from app.services.vector.vector_store import vector_store_service

# Configure unified logger
logging.basicConfig(
    level=logging.INFO if settings.DEBUG_MODE else logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("researchgpt.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB and verify vectors
    logger.info("Initializing ResearchGPT backend services...")
    init_db()
    
    # Warmup / verify vector collection
    try:
        col = vector_store_service.get_collection()
        doc_count = col.count()
        logger.info(f"Connected to ChromaDB '{vector_store_service.collection_name}' with {doc_count} chunks indexed.")
    except Exception as e:
        logger.warning(f"Vector store verification warning: {e}")

    logger.info("ResearchGPT Backend startup complete and ready for queries.")
    yield
    # Shutdown
    logger.info("ResearchGPT Backend shutting down cleanly.")

app = FastAPI(
    title="ResearchGPT Studio API",
    description="Full-stack AI workspace for deep research paper synthesis, literature reviews, grounded QA, and gap analysis with strict citation verification.",
    version="2.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend (default port 3000)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(papers.router)
app.include_router(query.router)
app.include_router(export.router)
app.include_router(graph.router)

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
