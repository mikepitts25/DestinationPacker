#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# DestinationPacker — Backend Startup Script
# ──────────────────────────────────────────────────────────────────────────────
# Usage:
#   ./start.sh          — start everything (DB, Valkey, Ollama model, API)
#   ./start.sh --dev    — same but with hot-reload
#   ./start.sh --api    — API only (assumes DB/Valkey already running)
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }
info() { echo -e "${BLUE}[→]${NC} $1"; }

# ─── .env file ────────────────────────────────────────────────────────────────

if [ ! -f "$BACKEND_DIR/.env" ]; then
    info "Creating .env from .env.example..."
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    log ".env created. Edit $BACKEND_DIR/.env to customize settings."
fi

# ─── Python venv ──────────────────────────────────────────────────────────────

setup_venv() {
    if [ ! -d "$BACKEND_DIR/.venv" ]; then
        info "Creating Python virtual environment..."
        python3 -m venv "$BACKEND_DIR/.venv"
        log "Virtual environment created."
    fi

    # shellcheck disable=SC1091
    source "$BACKEND_DIR/.venv/bin/activate"

    info "Installing Python dependencies..."
    pip install -q -r "$BACKEND_DIR/requirements.txt"
    log "Dependencies installed."
}

# ─── Docker services ──────────────────────────────────────────────────────────

start_docker_services() {
    if ! command -v docker &> /dev/null; then
        err "Docker is not installed. Install Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi

    info "Starting PostgreSQL + Valkey via Docker Compose..."
    docker compose -f "$ROOT_DIR/docker-compose.yml" up -d db valkey
    log "Database and cache are running."

    # Wait for Postgres to be ready
    info "Waiting for PostgreSQL to be ready..."
    local retries=0
    until docker compose -f "$ROOT_DIR/docker-compose.yml" exec -T db pg_isready -U packer -d destinationpacker > /dev/null 2>&1; do
        retries=$((retries + 1))
        if [ $retries -gt 30 ]; then
            err "PostgreSQL did not start in time."
            exit 1
        fi
        sleep 1
    done
    log "PostgreSQL is ready."
}

# ─── Ollama ───────────────────────────────────────────────────────────────────

setup_ollama() {
    # Source .env to get OLLAMA_MODEL
    set -a
    # shellcheck disable=SC1091
    source "$BACKEND_DIR/.env" 2>/dev/null || true
    set +a

    local MODEL="${OLLAMA_MODEL:-llama3.1:8b}"

    # Check if Ollama is running locally
    if command -v ollama &> /dev/null; then
        info "Ollama CLI detected. Checking if model '$MODEL' is available..."

        if ! ollama list 2>/dev/null | grep -q "$MODEL"; then
            info "Pulling Ollama model '$MODEL' (this may take a while on first run)..."
            ollama pull "$MODEL"
            log "Model '$MODEL' pulled successfully."
        else
            log "Model '$MODEL' is already available."
        fi

        # Start Ollama serve if not already running
        if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
            info "Starting Ollama server..."
            ollama serve &
            sleep 2
            log "Ollama server started."
        else
            log "Ollama server is already running."
        fi
    else
        # Fall back to Docker Ollama
        info "Ollama CLI not found. Starting Ollama via Docker..."
        docker compose -f "$ROOT_DIR/docker-compose.yml" up -d ollama

        # Wait for Ollama to be ready
        local retries=0
        until curl -s http://localhost:11434/api/tags > /dev/null 2>&1; do
            retries=$((retries + 1))
            if [ $retries -gt 60 ]; then
                warn "Ollama did not start. AI features will fall back to rule engine."
                return
            fi
            sleep 2
        done
        log "Ollama Docker container is running."

        # Pull model if needed
        if ! curl -s http://localhost:11434/api/tags | grep -q "$MODEL"; then
            info "Pulling model '$MODEL' via Docker Ollama (this may take a while)..."
            docker compose -f "$ROOT_DIR/docker-compose.yml" exec ollama ollama pull "$MODEL"
            log "Model '$MODEL' ready."
        fi
    fi
}

# ─── Database migrations ─────────────────────────────────────────────────────

run_migrations() {
    cd "$BACKEND_DIR"
    info "Running database migrations..."
    python -c "
import asyncio
from app.db.database import engine, Base
import app.models  # register all models

async def create():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    print('Tables created/verified.')

asyncio.run(create())
"
    log "Database tables are ready."
}

# ─── Start API ────────────────────────────────────────────────────────────────

start_api() {
    cd "$BACKEND_DIR"

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  🧳 DestinationPacker API"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  API:      http://localhost:8000"
    echo "  Docs:     http://localhost:8000/docs"
    echo "  Health:   http://localhost:8000/health"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    info "Running database migrations..."
    alembic upgrade head

    if [[ "${1:-}" == "--dev" ]]; then
        uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    else
        uvicorn app.main:app --host 0.0.0.0 --port 8000
    fi
}

# ─── Main ─────────────────────────────────────────────────────────────────────

main() {
    echo ""
    echo "🧳 DestinationPacker — Backend Setup"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    local mode="${1:-}"

    setup_venv

    if [[ "$mode" != "--api" ]]; then
        start_docker_services
        setup_ollama
    fi

    run_migrations
    start_api "$mode"
}

main "$@"
