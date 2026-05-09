import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.db.database import engine, Base
from app.routers import (
    users_router, trips_router, packing_router,
    activities_router, weather_router,
)

# Import all models so SQLAlchemy registers them for create_all
import app.models  # noqa: F401

logger = logging.getLogger(__name__)

# ── Rate limiter (shared across routers) ──────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

DEFAULT_SECRET_KEYS = {
    "",
    "dev_secret_key_change_in_production",
    "dev_secret_change_in_production",
    "change_me_in_production",
    "PLACEHOLDER_secret_key_64chars",
}


def _validate_production_safety(config=settings) -> None:
    if not config.is_production:
        return

    if config.secret_key in DEFAULT_SECRET_KEYS or config.secret_key.startswith("PLACEHOLDER_"):
        raise RuntimeError("SECRET_KEY must be changed from the default before running in production.")

    if "packer_secret" in config.database_url:
        logger.warning("DATABASE_URL appears to use the default dev password — change this in production.")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=()"
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    _validate_production_safety(settings)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="DestinationPacker API",
    description="Smart travel packing list generator",
    version="1.0.0",
    lifespan=lifespan,
    # Disable interactive docs in production
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
)

# Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security headers
app.add_middleware(SecurityHeadersMiddleware)

# CORS — restrict origins in production
_cors_origins = (
    ["*"] if not settings.is_production
    else [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(users_router, prefix="/api")
app.include_router(trips_router, prefix="/api")
app.include_router(packing_router, prefix="/api")
app.include_router(activities_router, prefix="/api")
app.include_router(weather_router, prefix="/api")


@app.get("/health")
async def health():
    import httpx
    from sqlalchemy import text
    from app.db.database import AsyncSessionLocal

    db_ok = False
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            db_ok = True
    except Exception:
        pass

    ollama_ok = False
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            r = await client.get(f"{settings.ollama_base_url}/api/tags")
            ollama_ok = r.status_code == 200
    except Exception:
        pass

    ai_provider = f"ollama/{settings.ollama_model}" if ollama_ok else (
        "openrouter" if settings.use_openrouter else (
            "claude" if settings.use_claude else "rule_engine"
        )
    )
    return {
        "status": "ok" if db_ok else "degraded",
        "version": "1.0.0",
        "db": "ok" if db_ok else "error",
        "ai_provider": ai_provider,
    }
