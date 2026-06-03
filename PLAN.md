# DestinationPacker Migration Plan

## Target State

DestinationPacker is an Expo React Native app that runs without a VPS backend. The mobile client uses Supabase Auth and Supabase Postgres directly for user-owned data, and uses Supabase Edge Functions only where private keys, provider policy, or shared caching are needed.

| Area | Target |
| --- | --- |
| Auth | Supabase Auth |
| Data | Supabase Postgres with Row Level Security |
| Packing generation | Local TypeScript rule engine for the reliable default |
| Premium AI | Gemini through a Supabase Edge Function, merged into deterministic rules |
| Weather | Open-Meteo direct from the app, no fake long-range forecasts |
| Destination search | `places-search` Edge Function proxying Nominatim with cache |
| Activity search | `activities-search` Edge Function proxying Overpass with cache and fallback |
| Secrets | Supabase secrets only, never Expo public env vars |

The legacy `backend/` FastAPI app can remain as reference during migration, but the mobile app should not need FastAPI, Docker Compose, Valkey, Ollama, or a VPS.

## Implemented Locally

- `mobile/lib/supabase.ts` creates the Supabase client from `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- `mobile/services/api.ts` now uses Supabase for auth, trips, packing items, activities, profiles, places, and weather-facing APIs.
- `mobile/lib/packing/ruleEngine.ts` ports the deterministic packing rules from Python to TypeScript.
- `mobile/lib/packing/__tests__/ruleEngine.test.ts` covers essentials, weather rules, activity rules, quantity scaling, and duplicate merging.
- `supabase/migrations/20260519064054_initial_schema.sql` creates profiles, trips, packing items, trip activities, trip shares, cache, triggers, and RLS policies.
- `supabase/functions/places-search` proxies and caches Nominatim.
- `supabase/functions/activities-search` proxies and caches Overpass and returns fallbacks on provider failure.
- `supabase/functions/ai-packing` calls Gemini with strict JSON parsing and graceful failure.
- `scripts/setup-backend.sh` was removed because the mobile app no longer needs the local backend bootstrap path.

## Security Notes

- The mobile app only receives the Supabase anon key.
- `api_cache` is RLS-enabled with no anonymous client policies; Edge Functions use service-role credentials for cache reads/writes.
- User data policies restrict trips, packing items, activities, and shares to owning users.
- Profile subscription changes are blocked for normal authenticated users by a database trigger. Premium status must be changed by trusted server-side code or a payment integration using service-role credentials.

## Remaining Setup

1. Repair Docker Desktop locally if Supabase local development is needed.
2. Run `supabase login` and `supabase link --project-ref <ref>` on the machine with credentials.
3. Apply the migration with `supabase db push` or paste the SQL into Supabase SQL editor.
4. Set Edge Function secrets:

```bash
supabase secrets set GEMINI_API_KEY=your-gemini-key
supabase secrets set GEMINI_MODEL=gemini-2.5-flash-lite
supabase secrets set OSM_CONTACT_EMAIL=you@example.com
supabase secrets set NOMINATIM_USER_AGENT="DestinationPacker/1.0 (you@example.com)"
supabase secrets set OVERPASS_USER_AGENT="DestinationPacker/1.0 (you@example.com)"
```

5. Deploy functions:

```bash
supabase functions deploy places-search
supabase functions deploy activities-search
supabase functions deploy ai-packing
```

6. Put public mobile env vars in `mobile/.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Verification Checklist

- `cd mobile && npm run type-check`
- `cd mobile && npm test -- --watchAll=false`
- `deno fmt --check supabase/functions/*/index.ts`
- `deno check supabase/functions/*/index.ts`
- `deno lint supabase/functions/*/index.ts`
- `supabase db lint --local` after Docker is repaired
- Manual app smoke test: sign up, login, create trip, destination autocomplete, generate packing list, check item, add/delete custom item, fetch/select activities, view weather, regenerate while preserving user-added items.

## Future Work

- Add RevenueCat or another app-store payment integration and update `profiles.subscription` only from trusted server-side code.
- Add profile preferences to the rule engine input.
- Add user-facing handling for email-confirmation-required signup flows.
- Add integration tests for Edge Function response normalization once Supabase can run locally or against a linked project.
