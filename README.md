# DestinationPacker

Smart travel packing list generator — create personalized packing lists based on your destination, weather, activities, and travel style.

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Python 3.12+

### Local Development

```bash
# 1. Start backend services (Postgres + Redis + API)
docker-compose up

# 2. Install mobile dependencies
cd mobile && npm install

# 3. Start Expo dev server
npm start
```

The API runs at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

## Project Structure

```
DestinationPacker/
├── backend/          # FastAPI (Python) backend
│   ├── app/
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic request/response
│   │   ├── routers/       # API route handlers
│   │   ├── services/      # Business logic
│   │   │   ├── rule_engine.py   # Free tier packing logic
│   │   │   ├── ai_service.py    # Claude AI integration
│   │   │   ├── weather_service.py
│   │   │   └── places_service.py
│   │   └── middleware/    # Auth (Firebase JWT)
│   └── tests/
├── mobile/           # React Native (Expo) app
│   ├── app/          # Expo Router screens
│   │   ├── (auth)/        # Login screen
│   │   ├── (tabs)/        # Home + Profile
│   │   └── trip/[id]/     # Trip detail (Packing, Activities, Weather tabs)
│   ├── hooks/             # React Query hooks
│   ├── services/          # API client
│   ├── stores/            # Zustand auth store
│   └── types/             # TypeScript types
└── docker-compose.yml
```

## Environment Setup

Copy `.env.example` to `.env` in the `backend/` directory and fill in your API keys:

```bash
cp backend/.env.example backend/.env
```

Required keys:
- `ANTHROPIC_API_KEY` — for AI-powered packing (premium users)
- `OPENWEATHER_API_KEY` — for weather forecasts
- `GOOGLE_PLACES_API_KEY` — for destination autocomplete + activities
- `FIREBASE_PROJECT_ID` + `FIREBASE_SERVICE_ACCOUNT_JSON` — for auth

## Running Tests

```bash
# Backend
cd backend && pip install -r requirements.txt && pytest -v

# Mobile
cd mobile && npm test
```

## Architecture

- **Free tier**: Rule-based packing engine (130+ rules covering weather, activities, travel method, accommodation, duration)
- **Premium tier**: Claude AI generates personalized lists + activity suggestions. Also includes: ad-free, unlimited trips, collaboration, export
- **Monetization**: Google AdMob (free tier ads) + RevenueCat (subscriptions — $3.99/mo or $29.99/yr)

See [PLAN.md](PLAN.md) for the full architecture document.
