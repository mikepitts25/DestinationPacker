# DestinationPacker Handoff

Current date: 2026-06-03
Repo: `/Users/mike/AppIdeas/DestinationPacker`
Branch: `main`
Remote Supabase project: `qugwlnxdlzeymxratwkg`
Remote Supabase URL: `https://qugwlnxdlzeymxratwkg.supabase.co`

## Current State

- Expo SDK 54 mobile app is on a Supabase standalone architecture.
- EAS project is linked as `@mikepitts25/destinationpacker` with project ID `469246a4-10c6-4b62-a8c9-02386dd2d7be`.
- Production/preview EAS profiles point at the remote Supabase project.
- App Store metadata is tracked in `mobile/store.config.json`, including privacy policy URL `https://colibricodellc.com/privacy-policy`.
- Premium purchase UI is disabled for v1 until StoreKit/RevenueCat is implemented.
- Untracked items intentionally left alone before the current App Store readiness work: `.claude/` and `packer.pen`.

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
- App Store readiness updates now include:
  - in-app Terms and Privacy Policy routes,
  - account deletion flow from Profile,
  - `delete-account` Supabase Edge Function,
  - no unused location/notification native permissions,
  - `ITSAppUsesNonExemptEncryption: false` export-compliance declaration,
  - EAS store metadata with privacy policy URL,
  - Expo SDK patch versions aligned with `expo-doctor`.

## Remote Supabase Work Completed

Migrations applied remotely:

- `initial_schema`
- `trip_travelers_and_interests`
- `activity_ratings`
- `advisor_cleanup`
- `multi_leg_travelers_and_segments`
- `trip_activity_destinations`

Edge Functions deployed remotely and active with `verify_jwt: true`:

- `activities-search`
- `places-search`
- `ai-packing`
- `delete-account`

Supabase advisors after cleanup:

- Security advisors: `auth_leaked_password_protection` warning remains. Supabase docs say leaked password protection is available on Pro plan and above and can be enabled in Auth password security settings.
- Performance advisors: only `unused_index` info notices. These are expected on a fresh database and should not be acted on until real query history exists.
- Supabase connector re-checked remote migrations on 2026-06-03. Supabase CLI confirmed remote Edge Functions are active, including `delete-account`.

## Local Migrations

Files now present:

- `supabase/migrations/20260519064054_initial_schema.sql`
- `supabase/migrations/20260519064103_trip_travelers_and_interests.sql`
- `supabase/migrations/20260519064105_activity_ratings.sql`
- `supabase/migrations/20260519064753_advisor_cleanup.sql`
- `supabase/migrations/20260519182238_multi_leg_travelers_and_segments.sql`
- `supabase/migrations/20260521150528_trip_activity_destinations.sql`

`20260519064753_advisor_cleanup.sql`:

- Revokes direct public/anon/authenticated execution on security-definer functions.
- Adds a service-role-only policy for `api_cache`.
- Recreates RLS policies with `(select auth.uid())` for Supabase advisor performance guidance.

## Verification Run

From `mobile/`:

- `npm test` passed: 19 suites, 63 tests.
- `npm run type-check` passed.
- `npm run lint` passed.
- `npx expo-doctor` passed: 18/18 checks.
- `npx eas-cli metadata:lint --profile production` passed.
- `deno fmt --check`, `deno lint`, and `deno check` passed for `supabase/functions/delete-account/index.ts`.
- `npx supabase functions deploy delete-account --project-ref qugwlnxdlzeymxratwkg` deployed successfully.
- `npx eas-cli build --platform ios --profile production --non-interactive --freeze-credentials --no-wait` failed before creating a build because iOS credentials are not set up. Re-run interactively to configure Apple credentials.
- Remaining `npm audit --omit=dev` notices are Expo transitive advisories where npm suggests a breaking Expo upgrade.

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

2. Configure iOS credentials for EAS Build.
   - Non-interactive production iOS build now reaches credential setup and fails with: `Credentials are not set up. Run this command again in interactive mode.`
   - Run from `mobile/`: `npm run credentials:ios`
   - Then start the TestFlight/App Store build: `npm run build:production:ios`

3. Configure Supabase Auth settings in the dashboard.
   - Confirm email settings.
   - Set redirect URLs for app deep links and any web/dev URLs needed.
   - Enable leaked password protection if the project is on Supabase Pro or above.

4. Manually test the full TestFlight flow.
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
   - Delete account from Profile and confirm the user returns to sign-in.

5. Re-run verification after any new changes.
   - `cd mobile && npm run verify:release`

## Potential Next Product Work

- Expand Trip Advisor coverage with more destination-specific customs and practical notes.
- Add richer traveler profiles beyond male/female counts.
- Add real ratings provider integration.
  - Google Places or Tripadvisor would need API keys, provider terms review, and Edge Function changes.
- Add deeper packing list UX improvements:
  - drag/reorder custom items,
  - edit item names/categories,
  - bulk delete custom items.
- Add RevenueCat or another app-store payment integration and update `profiles.subscription` only from trusted server-side code.
- Re-enable Premium purchase UI only after StoreKit/RevenueCat purchase, restore, and webhook handling are implemented.
- Add actual departure reminders after implementing notification permission request and scheduling flow.

## Known Caveats

- `ai-packing` has `GEMINI_API_KEY` configured in Supabase secrets and passed a direct remote Edge Function smoke test. Full in-app packing generation still needs Expo Go/TestFlight verification with a signed-in user.
- Current activity provider is OpenStreetMap/Overpass, so activity ratings are usually null.
- The remote project was treated as fresh because the connector reported no existing migrations/functions before deployment.
- Do not assume remote auth/email settings are production-ready until checked in the Supabase dashboard.
- Supabase plugin can read remote migrations, Edge Functions, project URL, and publishable keys. No callable plugin tool is currently exposed here for Edge Function secrets or Auth dashboard settings.
- Supabase CLI deploy worked for `delete-account`, but there is no `SUPABASE_ACCESS_TOKEN` in this shell for direct Management API auth-setting changes.
- The EAS build warning `Unknown option "watcher.unstable_workerThreads"` appears to come from upstream tooling; no matching config exists in this repo outside `node_modules`.
