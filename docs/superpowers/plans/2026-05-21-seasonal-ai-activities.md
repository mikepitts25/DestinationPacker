# Seasonal AI Activities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable seasonal Supabase activity catalog so any destination trip reuses fresh concrete AI activity suggestions by season and interest before generating new ones.

**Architecture:** Keep `trip_activities` as per-trip state and add a service-role-managed `activity_catalog` table for reusable discoveries. The `activities-search` Edge Function will normalize request context, read catalog coverage, use Overpass only for named provider results, call Gemini only for stale or missing seasonal interest coverage, store validated discoveries, and return concrete activities for the mobile app to copy into trip rows.

**Tech Stack:** Supabase Postgres migrations and RLS, Supabase Deno Edge Functions, Gemini JSON generation, Overpass, Expo React Native TypeScript, Jest, Deno test/check/lint.

---

## File Map

- Create `supabase/migrations/20260521193000_seasonal_activity_catalog.sql` for the reusable catalog schema, indexes, RLS, and service-role-only policy.
- Create `supabase/functions/activities-search/catalog.ts` for pure destination, season, interest coverage, validation, dedupe, and ranking helpers.
- Create `supabase/functions/activities-search/catalog.test.ts` for Deno unit coverage of the catalog helpers.
- Modify `supabase/functions/activities-search/index.ts` to look up catalog rows, generate missing AI coverage, persist accepted rows, and return only concrete suggestions.
- Create `mobile/lib/activities/searchPayload.ts` for the mobile-to-Edge-Function activity request shape.
- Create `mobile/lib/activities/__tests__/searchPayload.test.ts` for the seasonal activity request payload.
- Modify `mobile/services/api.ts` to send seasonal trip context to `activities-search` and keep per-trip insertion unchanged.
- Modify `mobile/lib/activities/suggestions.ts` and `mobile/lib/activities/__tests__/suggestions.test.ts` so successful concrete provider results are not padded with generic nightlife, dining, or shopping filler.
- Modify `README.md` and `PLAN.md` to describe the new AI-backed activity lookup path, migration/function deployment, and verification commands.

### Task 1: Add the Seasonal Catalog Schema

**Files:**
- Create: `supabase/migrations/20260521193000_seasonal_activity_catalog.sql`

- [ ] **Step 1: Write the migration**

Create the table and indexes with this migration:

```sql
create table if not exists public.activity_catalog (
  id uuid primary key default gen_random_uuid(),
  destination_key text not null,
  destination_name text not null,
  country_code text,
  latitude double precision,
  longitude double precision,
  season text not null check (season in ('spring', 'summer', 'fall', 'winter')),
  activity_name text not null,
  activity_type text not null
    check (activity_type in (
      'outdoor', 'water', 'cultural', 'nightlife', 'dining', 'sports',
      'beach', 'snow', 'business', 'wellness', 'shopping', 'souvenirs',
      'family', 'adventure'
    )),
  interest_tags text[] not null default '{}'::text[],
  description text not null,
  source text not null default 'ai',
  source_ref text,
  external_id text,
  generation_version text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (destination_key, season, generation_version, activity_name)
);

create index if not exists activity_catalog_lookup_idx
  on public.activity_catalog(destination_key, season, generation_version, expires_at);
create index if not exists activity_catalog_interest_tags_idx
  on public.activity_catalog using gin(interest_tags);
create index if not exists activity_catalog_expires_at_idx
  on public.activity_catalog(expires_at);

alter table public.activity_catalog enable row level security;

drop policy if exists "activity_catalog_service_role_only" on public.activity_catalog;
create policy "activity_catalog_service_role_only"
on public.activity_catalog
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
```

- [ ] **Step 2: Verify the migration is isolated**

Run:

```bash
git diff -- supabase/migrations/20260521193000_seasonal_activity_catalog.sql
```

Expected: the diff contains only the new reusable catalog schema and no edits to existing trip tables.

- [ ] **Step 3: Commit the schema**

```bash
git add supabase/migrations/20260521193000_seasonal_activity_catalog.sql
git commit -m "Add seasonal activity catalog schema"
```

### Task 2: Add Pure Catalog Helpers With Deno Tests

**Files:**
- Create: `supabase/functions/activities-search/catalog.ts`
- Create: `supabase/functions/activities-search/catalog.test.ts`

- [ ] **Step 1: Write failing helper tests**

Create `catalog.test.ts` with tests that define the expected lookup primitives:

```ts
import { assertEquals } from "jsr:@std/assert@1";
import {
  catalogCoverage,
  normalizeCatalogActivity,
  seasonForDate,
  destinationKey,
} from "./catalog.ts";

Deno.test("seasonForDate maps trip dates into seasonal catalog buckets", () => {
  assertEquals(seasonForDate("2026-01-14"), "winter");
  assertEquals(seasonForDate("2026-04-14"), "spring");
  assertEquals(seasonForDate("2026-07-14"), "summer");
  assertEquals(seasonForDate("2026-10-14"), "fall");
});

Deno.test("destinationKey separates similarly named destinations by country", () => {
  assertEquals(destinationKey("Berlin, Germany", "DE"), "berlin-germany:de");
  assertEquals(destinationKey("Berlin, United States", "US"), "berlin-united-states:us");
});

Deno.test("catalogCoverage reports missing requested interests", () => {
  const coverage = catalogCoverage([
    { activity_name: "Museum Island", interest_tags: ["museums"] },
    { activity_name: "Markthalle Neun", interest_tags: ["street_food"] },
  ], ["museums", "street_food", "nightclubs"], 1);

  assertEquals(coverage.coveredInterests, ["museums", "street_food"]);
  assertEquals(coverage.missingInterests, ["nightclubs"]);
});

Deno.test("normalizeCatalogActivity rejects generic placeholder activities", () => {
  assertEquals(normalizeCatalogActivity({
    activity_name: "Live music venue",
    activity_type: "nightlife",
    description: "Look for clubs and small music rooms.",
    interest_tags: ["live_music"],
  }), null);
});
```

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
deno test supabase/functions/activities-search/catalog.test.ts
```

Expected: FAIL because `catalog.ts` and its exported helpers do not exist yet.

- [ ] **Step 3: Implement the minimal helper module**

Create `catalog.ts` with the shared type and pure helper surface used by the function:

```ts
export const activityInterests = new Set([
  "hiking", "cycling", "surfing", "skiing_snowboarding", "scuba_diving",
  "rock_climbing", "museums", "art_galleries", "historical_sites",
  "architecture", "local_markets", "fine_dining", "street_food",
  "wine_tasting", "craft_beer", "nightclubs", "live_music", "spa_wellness",
  "beach_pool", "yoga_retreats", "theme_parks", "zoos_aquariums",
  "kid_friendly", "extreme_sports", "safari", "backpacking",
]);

export const activityTypes = new Set([
  "outdoor", "water", "cultural", "nightlife", "dining", "sports",
  "beach", "snow", "business", "wellness", "shopping", "souvenirs",
  "family", "adventure",
]);

export type CatalogSeason = "spring" | "summer" | "fall" | "winter";
export type CatalogCandidate = {
  activity_name: string;
  activity_type: string;
  description: string;
  interest_tags: string[];
  external_id?: string | null;
  source_ref?: string | null;
};

export function seasonForDate(date: string): CatalogSeason {
  const month = Number(date.slice(5, 7));
  if ([12, 1, 2].includes(month)) return "winter";
  if ([3, 4, 5].includes(month)) return "spring";
  if ([6, 7, 8].includes(month)) return "summer";
  return "fall";
}

export function destinationKey(destination: string, countryCode?: string | null) {
  const normalized = destination.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const country = countryCode?.trim().toLowerCase();
  return country ? `${normalized}:${country}` : normalized;
}

export function catalogCoverage(
  rows: Array<Pick<CatalogCandidate, "activity_name" | "interest_tags">>,
  interests: string[],
  minimumPerInterest: number,
) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const tag of row.interest_tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  const coveredInterests = interests.filter((interest) =>
    (counts.get(interest) ?? 0) >= minimumPerInterest
  );
  return {
    coveredInterests,
    missingInterests: interests.filter((interest) => !coveredInterests.includes(interest)),
  };
}

export function normalizeCatalogActivity(value: unknown): CatalogCandidate | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const name = typeof item.activity_name === "string" ? item.activity_name.trim() : "";
  const description = typeof item.description === "string" ? item.description.trim() : "";
  const type = typeof item.activity_type === "string" ? item.activity_type : "";
  const tags = Array.isArray(item.interest_tags)
    ? item.interest_tags.filter((tag): tag is string => typeof tag === "string" && activityInterests.has(tag))
    : [];
  const generic = /^(try local cuisine|live music venue|local markets and shopping|club night)$/i.test(name) ||
    /\blook for\b/i.test(description);
  if (!name || !description || !activityTypes.has(type) || tags.length === 0 || generic) return null;
  return { activity_name: name.slice(0, 160), activity_type: type, description, interest_tags: tags };
}
```

- [ ] **Step 4: Run the helper tests to verify green**

Run:

```bash
deno test supabase/functions/activities-search/catalog.test.ts
```

Expected: PASS for season, destination key, coverage, and generic rejection tests.

- [ ] **Step 5: Commit the helpers**

```bash
git add supabase/functions/activities-search/catalog.ts supabase/functions/activities-search/catalog.test.ts
git commit -m "Add seasonal activity catalog helpers"
```

### Task 3: Make `activities-search` Cache First and AI Fill Missing Coverage

**Files:**
- Modify: `supabase/functions/activities-search/index.ts`
- Test: `supabase/functions/activities-search/catalog.test.ts`

- [ ] **Step 1: Extend tests for merge and dedupe behavior**

Add a failing test that locks the concrete-row behavior before editing the Edge Function:

```ts
import { concreteActivities } from "./catalog.ts";

Deno.test("concreteActivities dedupes names and keeps catalog rows before provider rows", () => {
  const rows = concreteActivities([
    {
      activity_name: "Markthalle Neun",
      activity_type: "dining",
      description: "A named food market.",
      interest_tags: ["street_food"],
    },
  ], [
    {
      activity_name: "markthalle neun",
      activity_type: "dining",
      description: "Duplicate provider row.",
      interest_tags: ["street_food"],
    },
    {
      activity_name: "SO36",
      activity_type: "nightlife",
      description: "A named music venue.",
      interest_tags: ["live_music"],
    },
  ]);

  assertEquals(rows.map((row) => row.activity_name), ["Markthalle Neun", "SO36"]);
});
```

- [ ] **Step 2: Run the new test to verify red**

Run:

```bash
deno test supabase/functions/activities-search/catalog.test.ts
```

Expected: FAIL because `concreteActivities` is not exported yet.

- [ ] **Step 3: Add the pure merge helper**

Add this helper to `catalog.ts`:

```ts
export function concreteActivities(...groups: CatalogCandidate[][]) {
  const seen = new Set<string>();
  return groups.flatMap((group) => group).filter((activity) => {
    const key = activity.activity_name.trim().replace(/\s+/g, " ").toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
```

- [ ] **Step 4: Run the helper test to verify green**

Run:

```bash
deno test supabase/functions/activities-search/catalog.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add catalog request context and read/write functions**

Modify `index.ts` to import the helper module and define the catalog context:

```ts
import {
  catalogCoverage,
  concreteActivities,
  destinationKey,
  normalizeCatalogActivity,
  seasonForDate,
} from "./catalog.ts";

const activityGenerationVersion = "seasonal-activities-v1";
const catalogTtlDays = 105;
const minimumCatalogRowsPerInterest = 2;

type ActivitySearchInput = {
  destination: string;
  lat: number;
  lon: number;
  countryCode: string | null;
  startDate: string;
  interests: string[];
};
```

Add service-role catalog functions next to the existing `api_cache` helpers:

```ts
async function readActivityCatalog(context: ActivitySearchInput) {
  const key = destinationKey(context.destination, context.countryCode);
  const season = seasonForDate(context.startDate);
  const { data } = await admin.from("activity_catalog")
    .select("activity_name,activity_type,description,interest_tags,external_id,source_ref")
    .eq("destination_key", key)
    .eq("season", season)
    .eq("generation_version", activityGenerationVersion)
    .gt("expires_at", new Date().toISOString())
    .overlaps("interest_tags", context.interests);
  return (data ?? []).flatMap((row) => normalizeCatalogActivity(row) ?? []);
}

async function writeActivityCatalog(context: ActivitySearchInput, rows: ReturnType<typeof normalizeCatalogActivity>[]) {
  const accepted = rows.filter((row): row is NonNullable<typeof row> => row !== null);
  if (accepted.length === 0) return;
  const expiresAt = new Date(Date.now() + catalogTtlDays * 24 * 60 * 60 * 1000).toISOString();
  await admin.from("activity_catalog").upsert(accepted.map((row) => ({
    destination_key: destinationKey(context.destination, context.countryCode),
    destination_name: context.destination,
    country_code: context.countryCode,
    latitude: context.lat,
    longitude: context.lon,
    season: seasonForDate(context.startDate),
    activity_name: row.activity_name,
    activity_type: row.activity_type,
    interest_tags: row.interest_tags,
    description: row.description,
    source: "ai",
    source_ref: row.source_ref ?? null,
    external_id: row.external_id ?? null,
    generation_version: activityGenerationVersion,
    expires_at: expiresAt,
  })), { onConflict: "destination_key,season,generation_version,activity_name" });
}
```

- [ ] **Step 6: Add Gemini generation for missing interests**

Add an `aiActivitiesForMissingInterests` function in `index.ts` using the same Gemini env vars as `ai-packing`:

```ts
async function aiActivitiesForMissingInterests(context: ActivitySearchInput, missingInterests: string[]) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey || missingInterests.length === 0) return [];
  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash-lite";
  const prompt = `Return strict JSON only.
Find concrete activities for ${context.destination} during ${seasonForDate(context.startDate)}.
Cover only these traveler interests: ${missingInterests.join(", ")}.
Each activity must be an actual named place, venue, restaurant, market, tour, landmark, or destination-specific experience. Do not return category placeholders such as "try local cuisine", "club night", or "live music venue". Do not write "look for".
Return 2 to 4 activities per interest as:
[{"activity_name":"specific name","activity_type":"cultural|nightlife|dining|shopping|souvenirs|outdoor|water|sports|beach|snow|wellness|family|adventure","description":"why this is relevant","interest_tags":["one_supported_interest"]}]`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
      }),
    },
  );
  if (!res.ok) return [];
  const payload = await res.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") return [];
  try {
    return Array.isArray(JSON.parse(text))
      ? JSON.parse(text).flatMap((row: unknown) => normalizeCatalogActivity(row) ?? [])
      : [];
  } catch {
    return [];
  }
}
```

- [ ] **Step 7: Make request handling cache first**

Replace the request body parsing and final search path so it:

```ts
const body = await req.json();
const context: ActivitySearchInput = {
  destination: String(body.destination ?? "").trim(),
  lat: Number(body.lat),
  lon: Number(body.lon),
  countryCode: typeof body.country_code === "string" ? body.country_code : null,
  startDate: typeof body.start_date === "string" ? body.start_date : new Date().toISOString().slice(0, 10),
  interests: normalizeInterests(body.interests),
};

const catalogRows = await readActivityCatalog(context);
const coverage = catalogCoverage(catalogRows, context.interests, minimumCatalogRowsPerInterest);
const aiRows = await aiActivitiesForMissingInterests(context, coverage.missingInterests);
await writeActivityCatalog(context, aiRows);
const overpassRows = await searchActivities(context.destination, context.lat, context.lon, context.interests);
const activities = concreteActivities(catalogRows, aiRows, overpassRows)
  .slice(0, 18)
  .map((activity) => ({
    ...activity,
    source: activity.external_id ? "openstreetmap" : "ai",
    photo_url: null,
    rating: null,
    review_count: null,
    rating_source: null,
    distance_from_center_km: null,
  }));
return Response.json({ activities }, { headers: corsHeaders });
```

Update the Overpass fallback branch so a provider failure returns `[]` instead of generic fallback cards whenever the AI/catalog path is active.

- [ ] **Step 8: Verify the Edge Function**

Run:

```bash
deno test supabase/functions/activities-search/catalog.test.ts
deno fmt --check supabase/functions/activities-search/index.ts supabase/functions/activities-search/catalog.ts supabase/functions/activities-search/catalog.test.ts
deno check supabase/functions/activities-search/index.ts
deno lint supabase/functions/activities-search/index.ts supabase/functions/activities-search/catalog.ts supabase/functions/activities-search/catalog.test.ts
```

Expected: every command exits 0.

- [ ] **Step 9: Commit the cache-first Edge Function**

```bash
git add supabase/functions/activities-search/index.ts supabase/functions/activities-search/catalog.ts supabase/functions/activities-search/catalog.test.ts
git commit -m "Generate seasonal activity catalog entries"
```

### Task 4: Send Trip Season Context From Mobile

**Files:**
- Create: `mobile/lib/activities/searchPayload.ts`
- Create: `mobile/lib/activities/__tests__/searchPayload.test.ts`
- Modify: `mobile/services/api.ts`

- [ ] **Step 1: Write the failing request-shape test seam**

Create `mobile/lib/activities/__tests__/searchPayload.test.ts` with this focused request-shape test:

```ts
import { activitySearchPayload } from '@/lib/activities/searchPayload';

it('sends destination season context to the activity Edge Function', () => {
  expect(activitySearchPayload({
    destination: 'Berlin, Germany',
    latitude: 52.52,
    longitude: 13.405,
    country_code: 'DE',
    start_date: '2026-07-10',
  }, ['nightclubs', 'street_food'])).toEqual({
    destination: 'Berlin, Germany',
    lat: 52.52,
    lon: 13.405,
    country_code: 'DE',
    start_date: '2026-07-10',
    interests: ['nightclubs', 'street_food'],
  });
});
```

- [ ] **Step 2: Run the mobile test to verify red**

Run:

```bash
cd mobile && npm test -- --runTestsByPath lib/activities/__tests__/searchPayload.test.ts
```

Expected: FAIL because `activitySearchPayload` does not exist.

- [ ] **Step 3: Add the payload helper and use it**

Create `mobile/lib/activities/searchPayload.ts`:

```ts
import type { ActivityInterest, TripLeg } from '@/types';

type ActivityDestination = Pick<
  TripLeg,
  'destination' | 'latitude' | 'longitude' | 'country_code' | 'start_date'
>;

export function activitySearchPayload(destination: ActivityDestination, interests: ActivityInterest[]) {
  return {
    destination: destination.destination,
    lat: destination.latitude,
    lon: destination.longitude,
    country_code: destination.country_code ?? null,
    start_date: destination.start_date,
    interests,
  };
}
```

Update `mobile/services/api.ts` to call:

```ts
body: activitySearchPayload(destination, interests),
```

instead of the current inline body object.

- [ ] **Step 4: Run the payload test to verify green**

Run:

```bash
cd mobile && npm test -- --runTestsByPath lib/activities/__tests__/searchPayload.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the mobile request context**

```bash
git add mobile/services/api.ts mobile/lib/activities/searchPayload.ts mobile/lib/activities/__tests__/searchPayload.test.ts
git commit -m "Send seasonal activity search context"
```

### Task 5: Remove Generic Completion From Concrete Activity Results

**Files:**
- Modify: `mobile/lib/activities/suggestions.ts`
- Modify: `mobile/lib/activities/__tests__/suggestions.test.ts`

- [ ] **Step 1: Replace the current completion expectation with a failing concrete-result test**

Add this test before changing `completeActivitySuggestions`:

```ts
it('does not pad concrete activity results with generic nightlife dining or shopping suggestions', () => {
  const activities = completeActivitySuggestions([
    suggestion('Museum Island', 'cultural', 'osm:node:1'),
    suggestion('SO36', 'nightlife', 'ai:so36'),
    suggestion('Markthalle Neun', 'dining', 'ai:markthalle'),
  ], 'Berlin, Germany', ['museums', 'live_music', 'street_food', 'local_markets']);

  expect(activities.map((activity) => activity.activity_name)).not.toEqual(
    expect.arrayContaining(['Live music venue', 'Try local cuisine', 'Local markets and shopping']),
  );
});
```

- [ ] **Step 2: Run the suggestions test to verify red**

Run:

```bash
cd mobile && npm test -- --runTestsByPath lib/activities/__tests__/suggestions.test.ts
```

Expected: FAIL because `completeActivitySuggestions` still adds generic interest seeds to provider results.

- [ ] **Step 3: Narrow completion behavior**

Update `completeActivitySuggestions` so non-empty provider results are filtered and diversified directly:

```ts
export function completeActivitySuggestions(
  providerActivities: ActivitySuggestion[],
  destination: string,
  interests: ActivityInterest[] = [],
): ActivitySuggestion[] {
  const selectedTypes = activityTypesForInterests(interests);
  const provider = providerActivities.filter((activity) =>
    matchesSelectedTypes(activity.activity_type, selectedTypes)
  );

  if (provider.length > 0) {
    return diversifyActivitySuggestions(provider, interests);
  }

  return diversifyActivitySuggestions(
    fallbackActivitiesForDestination(destination, interests),
    interests,
  );
}
```

Keep a fallback-only test for no-provider-results behavior so offline/failure trips still return the remaining product fallback contract until the UI gets a dedicated retry state.

- [ ] **Step 4: Run the suggestions tests to verify green**

Run:

```bash
cd mobile && npm test -- --runTestsByPath lib/activities/__tests__/suggestions.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the mobile completion change**

```bash
git add mobile/lib/activities/suggestions.ts mobile/lib/activities/__tests__/suggestions.test.ts
git commit -m "Stop padding concrete activity suggestions"
```

### Task 6: Document and Verify the New Activity Path

**Files:**
- Modify: `README.md`
- Modify: `PLAN.md`

- [ ] **Step 1: Update architecture and setup docs**

Change the activity architecture rows to describe the seasonal catalog and AI fill path:

```md
| Activities | `activities-search` Supabase Edge Function -> seasonal `activity_catalog` lookup, Gemini fill for missing fresh interest coverage, Overpass named-place supplement |
```

Add the new migration/function note near Supabase setup:

```md
The activity Edge Function reads and writes reusable seasonal rows in `activity_catalog`.
Set `GEMINI_API_KEY` before deploying `activities-search` so missing seasonal interest coverage can be generated and cached.
```

Add the Edge Function test command to verification:

```bash
deno test supabase/functions/activities-search/catalog.test.ts
```

- [ ] **Step 2: Run full verification**

Run:

```bash
cd mobile && npm run type-check
cd mobile && npm test -- --watchAll=false
cd mobile && npm run lint
deno test supabase/functions/activities-search/catalog.test.ts
deno fmt --check supabase/functions/*/*.ts
deno check supabase/functions/*/index.ts
deno lint supabase/functions/*/*.ts
```

Expected: every command exits 0. If shell cwd makes repeated `cd mobile` invalid after the first command, run the mobile commands from `/Users/mike/AppIdeas/DestinationPacker/mobile` and the Deno commands from `/Users/mike/AppIdeas/DestinationPacker`.

- [ ] **Step 3: Review dirty-worktree scope before final commit**

Run:

```bash
git status --short
git diff --stat
```

Expected: the implementation changes are limited to the activity catalog migration, Edge Function activity files, mobile activity request/completion files, and docs. Existing unrelated workspace changes remain untouched.

- [ ] **Step 4: Commit docs and final verification state**

```bash
git add README.md PLAN.md
git commit -m "Document seasonal activity suggestions"
```
