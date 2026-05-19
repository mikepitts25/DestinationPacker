# DestinationPacker Handoff

Current date: 2026-05-19
Repo: `/Users/mike/AppIdeas/DestinationPacker`
Branch: `main`
Remote Supabase project: `qugwlnxdlzeymxratwkg`
Remote Supabase URL: `https://qugwlnxdlzeymxratwkg.supabase.co`

## Current State

- Expo SDK 54 mobile app is on a Supabase standalone architecture.
- Local Supabase is running and local migrations through `0004_advisor_cleanup.sql` have been applied.
- A LAN Expo server was started for Expo Go at `exp://192.168.1.187:8082`.
- Existing localhost Expo server on `8081` was left untouched.
- Untracked items intentionally left alone: `.claude/` and `packer.pen`.

## Recent App Changes

- Packing quantities now distinguish shared vs per-traveler items.
  - Examples: two travelers get two passports, toothbrushes, chargers, swimsuits, etc.
  - Shared items like toothpaste and reservations remain one group item.
- Weather forecasts now show:
  - Source: Open-Meteo
  - Last updated time
  - Manual `Update` button backed by React Query `refetch()`
- Activity suggestions now include local food/souvenir/trinket ideas.
  - Includes Berlin, Budapest/Hungary, Sri Lanka, and other country-level suggestions.
  - Suggestions are normal `dining` or `souvenirs` activities.
- Activity cards are provider-ready for ratings/review counts.
  - UI shows rating only if provider data exists.
  - Current OpenStreetMap provider does not provide ratings.
- Remote `ai-packing` was smoke-tested after setting `GEMINI_API_KEY`.
  - Result: HTTP 200, provider `gemini`, 18 items returned for a Berlin sample trip.
- Packing list UX now includes:
  - hide packed items,
  - category-level pack/unpack,
  - item quantity +/- controls,
  - undo restore after deleting an item.
- Trip detail now has an `Advisor` tab with foods to try, souvenirs, customs, and practical notes.

## Remote Supabase Work Completed

Migrations applied remotely:

- `initial_schema`
- `trip_travelers_and_interests`
- `activity_ratings`
- `advisor_cleanup`

Edge Functions deployed remotely and active with `verify_jwt: true`:

- `activities-search`
- `places-search`
- `ai-packing`

Supabase advisors after cleanup:

- Security advisors: no lints.
- Performance advisors: only `unused_index` info notices. These are expected on a fresh database and should not be acted on until real query history exists.
- Supabase plugin re-checked remote migrations and Edge Functions on 2026-05-19; they still match this handoff.

## Local Migrations

Files now present:

- `supabase/migrations/0001_initial_schema.sql`
- `supabase/migrations/0002_trip_travelers_and_interests.sql`
- `supabase/migrations/0003_activity_ratings.sql`
- `supabase/migrations/0004_advisor_cleanup.sql`

`0004_advisor_cleanup.sql`:

- Revokes direct public/anon/authenticated execution on security-definer functions.
- Adds a service-role-only policy for `api_cache`.
- Recreates RLS policies with `(select auth.uid())` for Supabase advisor performance guidance.

## Verification Run

From `mobile/`:

- `npm test` passed: 7 suites, 34 tests.
- `npm run type-check` passed.
- `npm run lint` passed after adding Expo ESLint config.
- `npm audit fix` was run without `--force`; remaining audit notices are Expo/Jest transitive advisories where npm suggests breaking downgrades.

## Important Remaining Setup

1. Set optional remote Edge Function secrets.
   - Required for AI packing:
     - `GEMINI_API_KEY` is set remotely.
   - Optional:
     - `GEMINI_MODEL`
     - `OSM_CONTACT_EMAIL`
     - `NOMINATIM_USER_AGENT`
     - `OVERPASS_USER_AGENT`
     - `NOMINATIM_URL`
     - `OVERPASS_URL`

2. Update production/TestFlight environment profiles.
   - Local ignored `mobile/.env` now points at the remote project using the Supabase publishable key.
   - `mobile/eas.json` now has `development`, `preview`, and `production` profiles pointing at the remote Supabase project.
   - `mobile/.env.local.example` documents local Supabase values; `mobile/.env.example` documents remote Expo Go values.
   - `mobile/app.json` no longer has a placeholder EAS project ID; run `npx eas-cli init` before the first EAS build so EAS can add the real UUID.

3. Configure Supabase Auth settings in the dashboard.
   - Confirm email settings.
   - Set redirect URLs for app deep links and any web/dev URLs needed.

4. Manually test the full Expo Go flow.
   - Signup/login.
   - Create a trip.
   - Pick date range.
   - Set traveler counts.
   - Select interests.
   - Generate packing list.
   - Check multi-traveler quantities.
   - Check weather source/update button.
   - Fetch activities.
   - Confirm local food/souvenir suggestions appear.
   - Select activities and verify packing list updates.

5. Re-run verification after any new changes.
   - `npm test`
   - `npm run type-check`
   - `npm run lint`

## Potential Next Product Work

- Expand Trip Advisor coverage with more destination-specific customs and practical notes.
- Add richer traveler profiles beyond male/female counts.
- Add real ratings provider integration.
  - Google Places or Tripadvisor would need API keys, provider terms review, and Edge Function changes.
- Add deeper packing list UX improvements:
  - drag/reorder custom items,
  - edit item names/categories,
  - bulk delete custom items.
- Add a production/TestFlight environment profile so local and remote Supabase URLs are not manually swapped.
  - Initial `mobile/eas.json` profile is now present; remaining work is creating/linking the EAS project ID.

## Known Caveats

- `ai-packing` has `GEMINI_API_KEY` configured in Supabase secrets and passed a direct remote Edge Function smoke test. Full in-app packing generation still needs Expo Go/TestFlight verification with a signed-in user.
- Current activity provider is OpenStreetMap/Overpass, so activity ratings are usually null.
- The remote project was treated as fresh because the connector reported no existing migrations/functions before deployment.
- Do not assume remote auth/email settings are production-ready until checked in the Supabase dashboard.
- Supabase plugin can read remote migrations, Edge Functions, project URL, and publishable keys. No callable plugin tool is currently exposed here for Edge Function secrets or Auth dashboard settings.
- Supabase CLI 2.100.0 and 2.100.1-beta.3 reject newer `sbp_v0_...` access tokens before contacting Supabase, but the Supabase Management API accepts them. Edge Function secrets can be managed directly through `https://api.supabase.com/v1/projects/qugwlnxdlzeymxratwkg/secrets`.
