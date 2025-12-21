"""
Configuration management using Pydantic Settings.
All configuration values are loaded from environment variables (.env file).
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database Configuration
    DATABASE_URL: str = "postgresql://qss_user:admin@localhost:5432/rtls_db2"

    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 3000

    # CORS Configuration
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174,http://192.168.1.204:5173/,https://hhx14gpq-5173.inc1.devtunnels.ms/"

    # Missing Person Detection Settings
    MISSING_PERSON_THRESHOLD_SECONDS: int = 300  # 5 minutes
    MISSING_PERSON_CHECK_INTERVAL_SECONDS: int = 30

    # WebSocket Configuration
    WS_HEARTBEAT_INTERVAL_SECONDS: int = 30

    # Database Connection Pool Settings
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_RECYCLE: int = 3600
    DB_POOL_PRE_PING: bool = True

    # Optional: API Key for Python service authentication
    PYTHON_SERVICE_API_KEY: str = ""

    # JWT Authentication Settings
    SECRET_KEY: str = "your-secret-key-change-in-production-min-32-chars-long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Default Admin User (created via migration)
    DEFAULT_ADMIN_EMAIL: str = "admin@rtls.com"
    DEFAULT_ADMIN_PASSWORD: str = "admin123"  # Change in production
    DEFAULT_ADMIN_NAME: str = "System Administrator"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS from comma-separated string to list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
