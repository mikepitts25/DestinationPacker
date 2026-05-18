# DestinationPacker

Smart travel packing list generator for Expo mobile. The app now runs without a VPS backend: Expo talks directly to Supabase for auth/data, Open-Meteo for forecasts, and Supabase Edge Functions for cached third-party APIs and optional AI.

## Current Architecture

| Layer | Technology |
| --- | --- |
| Mobile app | Expo React Native |
| Auth | Supabase Auth |
| Database | Supabase Postgres with Row Level Security |
| Destination search | `places-search` Supabase Edge Function -> Nominatim, cached in `api_cache` |
| Activities | `activities-search` Supabase Edge Function -> Overpass, cached in `api_cache` |
| Weather | Open-Meteo direct from the app |
| Free packing generation | Local TypeScript rule engine in `mobile/lib/packing/ruleEngine.ts` |
| Premium AI | `ai-packing` Supabase Edge Function -> Gemini, failure-safe fallback to rules |

The old `backend/` FastAPI app remains in the repo as reference during migration, but the mobile app should not require FastAPI, Docker Compose, Valkey, Ollama, or a VPS to run.

## Mobile Setup

```bash
cd mobile
cp .env.example .env
npm install
npm start
```

Set these public Expo variables in `mobile/.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Only the Supabase anon key belongs in the mobile app. Do not put service-role keys, Gemini keys, or provider secrets in Expo public env vars.

## Supabase Setup

Apply the database schema and RLS policies:

```bash
supabase db push
```

Or paste `supabase/migrations/0001_initial_schema.sql` into the Supabase SQL editor.

Deploy Edge Functions:

```bash
supabase functions deploy places-search
supabase functions deploy activities-search
supabase functions deploy ai-packing
```

Configure secrets:

```bash
supabase secrets set GEMINI_API_KEY=your-gemini-key
supabase secrets set GEMINI_MODEL=gemini-2.5-flash-lite
supabase secrets set OSM_CONTACT_EMAIL=you@example.com
```

Optional provider overrides:

```bash
supabase secrets set NOMINATIM_URL=https://nominatim.openstreetmap.org
supabase secrets set NOMINATIM_USER_AGENT="DestinationPacker/1.0 (you@example.com)"
supabase secrets set OVERPASS_URL=https://overpass-api.de/api/interpreter
```

## Verification

```bash
cd mobile
npm run type-check
npm test -- --watchAll=false
```

Rule-engine tests cover the deterministic free packing path: essentials, weather rules, activity rules, duration/traveler quantities, and duplicate merging.

Manual smoke test after Supabase setup:

1. Sign up and confirm email if confirmation is enabled.
2. Log in.
3. Create a trip.
4. Search/select a destination.
5. Generate a packing list.
6. Check/uncheck an item.
7. Add/delete a custom item.
8. Fetch activities.
9. Select an activity and confirm activity-linked packing items update.
10. View weather; far-future trips should show an unavailable forecast message instead of fake precision.
