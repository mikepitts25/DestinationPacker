# DestinationPacker

Smart travel packing list generator — create personalized packing lists based on your destination, weather, activities, and travel style.

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.12+
- Node.js 20+
- (Optional) [Ollama](https://ollama.com) installed locally for faster AI

### One-Command Backend Start

```bash
cd backend
./start.sh --dev
```

This will:
1. Create a `.env` from the example (if needed)
2. Set up a Python virtual environment and install deps
3. Start PostgreSQL + Valkey via Docker Compose
4. Pull the Ollama LLM model (first run only — ~4GB for llama3.1:8b)
5. Run database migrations
6. Start the API with hot-reload at `http://localhost:8000`

### Or start everything via Docker Compose

```bash
docker-compose up
```

### Mobile App

```bash
cd mobile && npm install && npm start
```

The API docs are at `http://localhost:8000/docs`.

## FOSS Stack — Zero Recurring Costs

| Layer | Technology | License / Cost |
|-------|-----------|---------------|
| Auth | **Self-hosted bcrypt + JWT** | Zero — no external service |
| AI | **Ollama** (Llama 3.1, Mistral, etc.) | Zero — runs locally |
| Weather | **Open-Meteo** | Free, no API key needed |
| Geocoding | **Nominatim** (OpenStreetMap) | Free, no API key needed |
| Places/POIs | **Overpass API** (OpenStreetMap) | Free, no API key needed |
| Cache | **Valkey** (Redis FOSS fork) | Apache 2.0 |
| Database | **PostgreSQL** | PostgreSQL License (FOSS) |
| Backend | **FastAPI** (Python) | MIT |
| Mobile | **React Native** (Expo) | MIT |

**Optional paid add-ons** (only if you want them):
- `ANTHROPIC_API_KEY` — Claude API as AI fallback (set in `.env`, leave empty for Ollama-only)
- RevenueCat — mobile subscription management (free until $2.5M revenue)
- Google AdMob — ads for free tier users

## Project Structure

```
DestinationPacker/
├── backend/          # FastAPI (Python) backend
│   ├── start.sh      # One-command startup script
│   ├── app/
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic request/response
│   │   ├── routers/       # API route handlers
│   │   ├── services/      # Business logic
│   │   │   ├── rule_engine.py   # Free tier packing (130+ rules)
│   │   │   ├── ai_service.py    # Ollama + Claude fallback
│   │   │   ├── weather_service.py  # Open-Meteo
│   │   │   └── places_service.py   # Nominatim + Overpass
│   │   └── middleware/    # Auth (bcrypt + JWT)
│   └── tests/
├── mobile/           # React Native (Expo) app
│   ├── app/          # Expo Router screens
│   │   ├── (auth)/        # Email/password login
│   │   ├── (tabs)/        # Home + Profile
│   │   └── trip/[id]/     # Trip detail (Packing, Activities, Weather tabs)
│   ├── hooks/             # React Query hooks
│   ├── services/          # API client
│   ├── stores/            # Zustand auth store
│   └── types/             # TypeScript types
└── docker-compose.yml     # Postgres + Valkey + Ollama + API
```

## Environment Setup

```bash
cp backend/.env.example backend/.env
```

The only thing you might want to change is:
- `SECRET_KEY` — set a strong random string for production
- `OLLAMA_MODEL` — default is `llama3.1:8b`, change to `mistral:7b` or any Ollama-supported model
- `ANTHROPIC_API_KEY` — optional, for Claude as AI fallback

## Running Tests

```bash
# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
pytest -v

# Mobile
cd mobile && npm test
```

## Architecture

- **Free tier**: Rule-based packing engine (130+ rules) — weather, activities, travel method, accommodation, duration
- **Premium tier**: AI-powered lists (Ollama/Claude) + activity suggestions + ad-free + unlimited trips + collaboration + export
- **Monetization**: Google AdMob (free tier ads) + RevenueCat ($3.99/mo or $29.99/yr)

See [PLAN.md](PLAN.md) for the full architecture document.
