from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.database import engine, Base
from app.routers import (
    users_router, trips_router, packing_router,
    activities_router, weather_router,
)

# Import all models so SQLAlchemy registers them for create_all
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (use Alembic for production migrations)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="DestinationPacker API",
    description="Smart travel packing list generator",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if not settings.is_production else ["https://destinationpacker.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users_router, prefix="/api")
app.include_router(trips_router, prefix="/api")
app.include_router(packing_router, prefix="/api")
app.include_router(activities_router, prefix="/api")
app.include_router(weather_router, prefix="/api")


@app.get("/health")
async def health():
    import httpx
    ollama_ok = False
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            r = await client.get(f"{settings.ollama_base_url}/api/tags")
            ollama_ok = r.status_code == 200
    except Exception:
        pass

    ai_provider = f"ollama/{settings.ollama_model}" if ollama_ok else (
        "claude" if settings.use_claude else "rule_engine"
    )
    return {
        "status": "ok",
        "version": "1.0.0",
        "ai_provider": ai_provider,
        "ollama_available": ollama_ok,
    }
