import os
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    OPENROUTER_API_KEY: str = Field(..., description="OpenRouter API Key loaded from .env")
    LLM_PROVIDER: str = "openrouter"
    LLM_MODEL: str = "openai/gpt-oss-120b"
    LLM_TEMPERATURE: float = 0.2
    LLM_MAX_TOKENS: int = 4096
    LLM_TOP_P: float = 0.95
    LLM_TIMEOUT: int = 60
    OPENROUTER_SITE_URL: str = "http://localhost:3000"
    OPENROUTER_SITE_NAME: str = "ResearchGPT"

    STORAGE_DIR: str = "./storage"
    DATABASE_URL: str = "sqlite:///./storage/research.db"
    CHROMA_DB_DIR: str = "./storage/chroma_db"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    
    # Diagnostics / Development flag
    DEBUG_MODE: bool = True

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure storage directories exist
os.makedirs(settings.STORAGE_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.STORAGE_DIR, "uploads"), exist_ok=True)
os.makedirs(settings.CHROMA_DB_DIR, exist_ok=True)
