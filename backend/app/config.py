import os
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    GROQ_API_KEY: str = Field(..., description="Groq API Key loaded exclusively from .env")
    STORAGE_DIR: str = "./storage"
    DATABASE_URL: str = "sqlite:///./storage/research.db"
    CHROMA_DB_DIR: str = "./storage/chroma_db"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"

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
