import os
from dotenv import load_dotenv

load_dotenv()

_DEFAULT_JWT_SECRET = "sahayak-ai-dev-secret-key-change-in-prod"
_DEFAULT_ADMIN_KEY = "sahayak-admin-dev"
_DEFAULT_INTER_SERVICE_SECRET = "sahayak-inter-service-dev-secret-change-in-prod"


def _bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


class Settings:
    APP_VERSION: str = "1.2.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").strip().lower()
    IS_PRODUCTION: bool = ENVIRONMENT == "production"

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
    GEMINI_TIMEOUT_SECONDS: int = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "30"))

    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "sahayak_ai")
    MONGODB_MAX_POOL_SIZE: int = int(os.getenv("MONGODB_MAX_POOL_SIZE", "50"))

    JWT_SECRET: str = os.getenv("JWT_SECRET", _DEFAULT_JWT_SECRET)
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))

    DATA_GOV_API_KEY: str = os.getenv("DATA_GOV_API_KEY", "")
    ADMIN_API_KEY: str = os.getenv("ADMIN_API_KEY", _DEFAULT_ADMIN_KEY)
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")

    # Two-way server-to-server integration with SAHAYAK-B2B Express backend
    B2B_API_BASE_URL: str = os.getenv("B2B_API_BASE_URL", "http://localhost:4000").rstrip("/")
    INTER_SERVICE_SECRET: str = os.getenv(
        "INTER_SERVICE_SECRET", _DEFAULT_INTER_SERVICE_SECRET
    )
    SYNC_TIMEOUT_SECONDS: int = int(os.getenv("SYNC_TIMEOUT_SECONDS", "8"))

    # Anonymous shared demo session is only allowed outside production by default.
    ALLOW_DEMO_MODE: bool = _bool("ALLOW_DEMO_MODE", not IS_PRODUCTION)

    RATE_LIMIT_ENABLED: bool = _bool("RATE_LIMIT_ENABLED", True)
    RATE_LIMIT_AUTH_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_AUTH_PER_MINUTE", "20"))
    RATE_LIMIT_AI_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_AI_PER_MINUTE", "30"))
    RATE_LIMIT_DEFAULT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_DEFAULT_PER_MINUTE", "240"))
    TRUST_PROXY_HEADERS: bool = _bool("TRUST_PROXY_HEADERS", IS_PRODUCTION)

    MAX_IMAGE_MB: int = int(os.getenv("MAX_IMAGE_MB", "10"))
    MAX_DOCUMENT_MB: int = int(os.getenv("MAX_DOCUMENT_MB", "15"))
    MAX_PDF_PAGES: int = int(os.getenv("MAX_PDF_PAGES", "200"))

    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO").upper()

    CORS_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
        if origin.strip()
    ]

    def validate_for_production(self) -> list[str]:
        """Returns a list of fatal configuration problems for production deployments."""
        problems = []
        if not self.IS_PRODUCTION:
            return problems
        if self.JWT_SECRET == _DEFAULT_JWT_SECRET or len(self.JWT_SECRET) < 32:
            problems.append("JWT_SECRET must be set to a random value of at least 32 characters.")
        if self.ADMIN_API_KEY == _DEFAULT_ADMIN_KEY or len(self.ADMIN_API_KEY) < 24:
            problems.append("ADMIN_API_KEY must be set to a random value of at least 24 characters.")
        if self.INTER_SERVICE_SECRET == _DEFAULT_INTER_SERVICE_SECRET or len(self.INTER_SERVICE_SECRET) < 32:
            problems.append("INTER_SERVICE_SECRET must be set to a random value of at least 32 characters.")
        if any(o == "*" for o in self.CORS_ORIGINS):
            problems.append("CORS_ORIGINS must list explicit frontend origins (no '*').")
        if self.ALLOW_DEMO_MODE:
            problems.append("ALLOW_DEMO_MODE must be false in production.")
        return problems


settings = Settings()
