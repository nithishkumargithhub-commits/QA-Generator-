import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load .env file automatically
load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Enterprise AI QA Generator & Assessment Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security & Tokens
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-key-change-in-production-qa-gen-2026-secure-jwt")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]
    
    # Database (Supports PostgreSQL via env or absolute SQLite path for consistent local execution)
    DATABASE_URL: str = os.getenv("DATABASE_URL") or os.getenv("INTERNAL_DATABASE_URL") or "sqlite+aiosqlite:///./qa_generator.db"
    
    def get_database_url(self) -> str:
        url = self.DATABASE_URL
        if "postgresql" in url:
            return url
        # For SQLite, enforce single deterministic absolute path to avoid split DB files
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        db_file = os.path.join(backend_dir, "qa_generator.db").replace("\\", "/")
        return f"sqlite+aiosqlite:///{db_file}"

    REDIS_URL: Optional[str] = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # External AI APIs (Optional: Gemini, OpenAI, OpenRouter)
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", "")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", "")
    OPENROUTER_API_KEY: Optional[str] = os.getenv("OPENROUTER_API_KEY", "")
    
    # Default Admin Seed
    DEFAULT_ADMIN_USERNAME: str = os.getenv("DEFAULT_ADMIN_USERNAME", "admin")
    DEFAULT_ADMIN_EMAIL: str = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@qagenerator.com")
    DEFAULT_ADMIN_PASSWORD: str = os.getenv("DEFAULT_ADMIN_PASSWORD", "AdminSecret123!")
    
    # File Storage
    UPLOAD_DIR: str = os.path.join(os.getcwd(), "uploads")
    MAX_FILE_SIZE_MB: int = 50

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
