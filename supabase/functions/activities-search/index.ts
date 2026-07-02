import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const overpassUrl = Deno.env.get("OVERPASS_URL") ??
  "https://overpass-api.de/api/interpreter";
const contactEmail = Deno.env.get("OSM_CONTACT_EMAIL") ??
  "support@destinationpacker.app";
const userAgent = Deno.env.get("OVERPASS_USER_AGENT") ??
  `DestinationPacker/1.0 (${contactEmail})`;
const googlePlacesEnabled =
  (Deno.env.get("ENABLE_GOOGLE_PLACES") ?? "").toLowerCase() === "true";
const googlePlacesApiKey = googlePlacesEnabled
  ? Deno.env.get("GOOGLE_PLACES_API_KEY") ?? ""
  : "";
const admin = createClient(supabaseUrl, serviceRoleKey);

type OverpassElement = {
  id?: unknown;
  type?: unknown;
  lat?: unknown;
  lon?: unknown;
  center?: { lat?: unknown; lon?: unknown };
  tags?: Record<string, string>;
};

type ActivitySuggestion = {
  activity_name: string;
  activity_type: string;
  description: string | null;
  source: string;
  external_id: string | null;
  photo_url: string | null;
  rating: number | null;
  review_count: number | null;
  rating_source: string | null;
  distance_from_center_km: number | null;
};

type TripContext = {
  start_date?: string;
  end_date?: string;
  duration_days?: number;
  travel_method?: string;
  accommodation?: string;
  travelers?: number;
};

type GooglePlace = {
  id?: unknown;
  displayName?: { text?: unknown };
  formattedAddress?: unknown;
  primaryType?: unknown;
  rating?: unknown;
  userRatingCount?: unknown;
  googleMapsUri?: unknown;
  location?: { latitude?: unknown; longitude?: unknown };
};

const interestActivityTypes: Record<string, string[]> = {
  hiking: ["outdoor"],
  cycling: ["outdoor", "sports"],
  surfing: ["water", "beach"],
  skiing_snowboarding: ["snow", "sports"],
  scuba_diving: ["water"],
  rock_climbing: ["outdoor", "adventure"],
  museums: ["cultural"],
  art_galleries: ["cultural"],
  historical_sites: ["cultural"],
  architecture: ["cultural"],
  local_markets: ["shopping", "souvenirs"],
  fine_dining: ["dining"],
  street_food: ["dining"],
  wine_tasting: ["dining"],
  craft_beer: ["nightlife", "dining"],
  nightclubs: ["nightlife"],
  live_music: ["nightlife", "cultural"],
  spa_wellness: ["wellness"],
  beach_pool: ["beach", "water"],
  yoga_retreats: ["wellness"],
  theme_parks: ["family", "outdoor"],
  zoos_aquariums: ["family", "outdoor"],
  kid_friendly: ["family"],
  extreme_sports: ["adventure", "sports"],
  safari: ["adventure", "outdoor"],
  backpacking: ["outdoor", "adventure"],
};

const allowedActivityTypes = new Set([
  "outdoor",
  "water",
  "cultural",
  "nightlife",
  "dining",
  "sports",
  "beach",
  "snow",
  "business",
  "wellness",
  "shopping",
  "souvenirs",
  "family",
  "adventure",
]);

const coreTripActivityTypes = new Set(["cultural", "dining"]);

const genericNamePatterns = [
  /^explore .+ city center$/i,
  /^visit local museums$/i,
  /^try local cuisine$/i,
  /^day hike or nature walk$/i,
  /^local markets and shopping$/i,
  /^browse local markets/i,
  /^book a notable restaurant$/i,
  /^book one .+(food|craft|market|restaurant|session|class|tour)/i,
  /^.+ notable restaurant reservation$/i,
  /^.+ regional wine tasting$/i,
  /^.+ market tasting as the food anchor$/i,
  /^.+ street-food, bakery, or market-stall crawl$/i,
  /^adventure activity$/i,
  /^family-friendly attraction$/i,
  /^spa, wellness, or fitness session$/i,
];

const blockedPlacePatterns = [
  /\bcinema\b/i,
  /\bcinemaxx\b/i,
  /\bfilmtheater\b/i,
  /\bfilmpalast\b/i,
  /\bmovie theater\b/i,
];

async function readCache(cacheKey: string) {
  const { data } = await admin
    .from("api_cache")
    .select("payload,expires_at")
    .eq("cache_key", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  return data?.payload ?? null;
}

async function writeCache(
  cacheKey: string,
  payload: unknown,
  ttlSeconds: number,
) {
  await admin.from("api_cache").upsert({
    cache_key: cacheKey,
    payload,
    expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
  });
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.includes("```")) return trimmed;

  const block = trimmed.split("```")[1] ?? trimmed;
  return block.startsWith("json") ? block.slice(4).trim() : block.trim();
}

function normalizedName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function isGenericName(name: string) {
  const normalized = normalizedName(name);
  return genericNamePatterns.some((pattern) => pattern.test(normalized));
}

function destinationParts(destination: string) {
  return destination
    .split(",")
    .map((part) => normalizedName(part))
    .filter((part) => part.length > 2);
}

function isDestinationLabel(name: string, destination: string) {
  return destinationParts(destination).includes(normalizedName(name));
}

function isBlockedPlace(name: string, description = "") {
  const searchable = `${name} ${description}`;
  return blockedPlacePatterns.some((pattern) => pattern.test(searchable));
}

function isUserFacingActivityName(name: string, destination: string, description = "") {
  return !isGenericName(name) &&
    !isDestinationLabel(name, destination) &&
    !isBlockedPlace(name, description);
}

function classifyTags(tags: Record<string, string>): string {
  const tourism = tags.tourism ?? "";
  const leisure = tags.leisure ?? "";
  const amenity = tags.amenity ?? "";
  const historic = tags.historic ?? "";
  const natural = tags.natural ?? "";

  if (historic) return "cultural";
  if (
    ["museum", "gallery", "artwork", "attraction", "viewpoint"].includes(
      tourism,
    )
  ) return "cultural";
  if (["zoo", "theme_park", "aquarium"].includes(tourism)) return "family";
  if (["park", "garden", "nature_reserve"].includes(leisure)) return "outdoor";
  if (leisure === "beach_resort" || natural === "beach") return "beach";
  if (["sports_centre", "stadium", "water_park"].includes(leisure)) {
    return "sports";
  }
  if (natural === "hot_spring") return "wellness";
  if (["cave_entrance", "peak"].includes(natural)) return "outdoor";
  if (["restaurant", "cafe", "food_court"].includes(amenity)) return "dining";
  if (["bar", "pub", "nightclub"].includes(amenity)) return "nightlife";
  if (amenity === "marketplace") return "shopping";
  if (amenity === "place_of_worship" || tags.building === "cathedral") {
    return "cultural";
  }
  if (amenity === "theatre") return "cultural";
  return "cultural";
}

function distanceKm(fromLat: number, fromLon: number, toLat: number, toLon: number) {
  const earthKm = 6371;
  const dLat = (toLat - fromLat) * Math.PI / 180;
  const dLon = (toLon - fromLon) * Math.PI / 180;
  const lat1 = fromLat * Math.PI / 180;
  const lat2 = toLat * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function elementCoordinates(element: OverpassElement) {
  const lat = Number(element.lat ?? element.center?.lat);
  const lon = Number(element.lon ?? element.center?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function normalizeInterests(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((interest): interest is string => typeof interest === "string")
    .map((interest) => interest.toLowerCase())
    .filter((interest) => interest in interestActivityTypes);
}

function normalizeTripContext(value: unknown): TripContext {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  const durationDays = Number(record.duration_days);
  const travelers = Number(record.travelers);

  return {
    start_date: typeof record.start_date === "string" ? record.start_date : undefined,
    end_date: typeof record.end_date === "string" ? record.end_date : undefined,
    duration_days: Number.isFinite(durationDays) ? durationDays : undefined,
    travel_method: typeof record.travel_method === "string" ? record.travel_method : undefined,
    accommodation: typeof record.accommodation === "string" ? record.accommodation : undefined,
    travelers: Number.isFinite(travelers) ? travelers : undefined,
  };
}

function activityMatchesInterests(activityType: string, interests: string[]) {
  if (interests.length === 0) return true;
  if (coreTripActivityTypes.has(activityType)) return true;
  return interests.some((interest) =>
    interestActivityTypes[interest]?.includes(activityType)
  );
}

type LocalGuideSuggestion = {
  keyword: string;
  activity_name: string;
  activity_type: string;
  description: string;
  external_id: string;
};

const localGuideSuggestions: LocalGuideSuggestion[] = [
  {
    keyword: "lisbon",
    activity_name: "Time Out Market Lisboa",
    activity_type: "dining",
    description:
      "Food market inside Mercado da Ribeira with many Lisbon food counters, bars, and shops; good after a flight because it stays flexible.",
    external_id: "local:lisbon:time-out-market-lisboa",
  },
  {
    keyword: "lisbon",
    activity_name: "Garrafeira Alfaia",
    activity_type: "dining",
    description:
      "Portuguese wine bar and shop for wine, cheese, and small plates; fits a wine-focused evening without a generic restaurant search.",
    external_id: "local:lisbon:garrafeira-alfaia",
  },
  {
    keyword: "lisbon",
    activity_name: "Dois Corvos Marvila Taproom",
    activity_type: "dining",
    description:
      "Lisbon craft beer taproom from Dois Corvos; useful for travelers who asked for beer and want a named local stop.",
    external_id: "local:lisbon:dois-corvos-marvila-taproom",
  },
  {
    keyword: "lisbon",
    activity_name: "Praia de Carcavelos",
    activity_type: "beach",
    description:
      "Popular Lisbon-coast beach reached by train from Cais do Sodre; pack swimwear, sunscreen, sandals, and a light towel.",
    external_id: "local:lisbon:praia-de-carcavelos",
  },
  {
    keyword: "lisbon",
    activity_name: "LX Market at LX Factory",
    activity_type: "shopping",
    description:
      "Market at LX Factory for browsing local vendors, snacks, and small gifts; check the Sunday schedule and bring a reusable bag.",
    external_id: "local:lisbon:lx-market-lx-factory",
  },
  {
    keyword: "lisbon",
    activity_name: "Park and National Palace of Pena",
    activity_type: "outdoor",
    description:
      "Sintra park and palace with steep walking routes and viewpoints; book timed entry and pack walking shoes and water.",
    external_id: "local:lisbon:park-national-palace-pena",
  },
  {
    keyword: "lisbon",
    activity_name: "Mercado de Campo de Ourique",
    activity_type: "dining",
    description:
      "Neighborhood market and food hall with prepared food, wine, cocktails, and traditional market stalls.",
    external_id: "local:lisbon:mercado-de-campo-de-ourique",
  },
];

function localGuideActivities(destination: string, interests: string[] = []): ActivitySuggestion[] {
  const normalizedDestination = normalizedName(destination);
  return localGuideSuggestions.flatMap((suggestion): ActivitySuggestion[] => {
    if (!normalizedDestination.includes(suggestion.keyword)) return [];
    if (!activityMatchesInterests(suggestion.activity_type, interests)) return [];
    return [{
      activity_name: suggestion.activity_name,
      activity_type: suggestion.activity_type,
      description: suggestion.description,
      source: "local_guide",
      external_id: suggestion.external_id,
      photo_url: null,
      rating: null,
      review_count: null,
      rating_source: null,
      distance_from_center_km: null,
    }];
  });
}

function fallbackActivities(destination: string, interests: string[] = []): ActivitySuggestion[] {
  return localGuideActivities(destination, interests);
}

function suggestedActivityTypes(interests: string[]) {
  const selected = new Set<string>();
  for (const interest of interests) {
    for (const type of interestActivityTypes[interest] ?? []) {
      selected.add(type);
    }
  }
  return Array.from(selected);
}

function buildAiPrompt(
  destination: string,
  interests: string[],
  osmActivities: ActivitySuggestion[],
  context: TripContext = {},
) {
  const interestText = interests.length > 0 ? interests.join(", ") : "general sightseeing";
  const typeText = suggestedActivityTypes(interests).join(", ") || "mixed";
  const nearbyNames = osmActivities.slice(0, 12).map((activity) => ({
    name: activity.activity_name,
    type: activity.activity_type,
    what_it_is: activity.description,
  }));
  const contextLines = [
    context.start_date && context.end_date ? `Dates: ${context.start_date} to ${context.end_date}` : null,
    Number.isFinite(context.duration_days) ? `Trip length: ${context.duration_days} days` : null,
    context.travel_method ? `Arrival method: ${context.travel_method}` : null,
    context.accommodation ? `Accommodation: ${context.accommodation}` : null,
    Number.isFinite(context.travelers) ? `Travelers: ${context.travelers}` : null,
  ].filter(Boolean).join("\n");

  return `You are a sharp local travel editor for DestinationPacker. Return strict JSON only.

Create 16 to 18 destination-specific trip suggestions for ${destination}.

${contextLines ? `${contextLines}\n` : ""}Traveler interests: ${interestText}
Useful activity type mix: ${typeText}
Nearby map results you may include if they are worth visiting: ${JSON.stringify(nearbyNames)}

The list must feel concrete and useful, not generic. Every item must be a real named place, a named venue, a named market, a named beach/trail/park, or a destination-specific buyable item.

Include a balanced mix when it fits the interests:
- Named food markets, restaurants, wine bars, breweries, taprooms, tastings, or food halls.
- Named beaches, parks, hikes, viewpoints, palaces, ruins, historic districts, landmarks, or cultural places.
- Named markets, independent shopping areas, and destination-specific things to buy. For buyable items, prefix activity_name with "Buy: ".
- Hands-on experiences only when the activity_name names the provider, venue, class, market, or place where it happens.

Coverage requirements:
- Include at least 4 named sights or places to see, such as landmarks, viewpoints, historic sites, gardens, parks, beaches, museums, architecture, or neighborhoods.
- Include at least 4 named places to eat or drink, such as restaurants, food halls, markets with food counters, cafes, wine bars, breweries, taprooms, or tasting rooms.
- Include at least 2 lower-friction activities or markets that can fill open time without needing a full-day commitment.
- If traveler interests omit culture or food, still include named sights and named food/drink places so the itinerary is usable.

Rules:
- Do not return generic names like "Visit local museums", "Try local cuisine", "Book one hands-on food session", "Local markets and shopping", or "Explore city center".
- Do not suggest the destination, country, or region itself as an activity.
- Do not include cinemas, movie theaters, or ordinary shopping malls.
- Descriptions must say what the place is, why it fits the traveler interests, and one practical packing or planning cue.
- Do not invent ratings, review counts, awards, street addresses, phone numbers, prices, hours, or booking claims.
- If you cannot explain what a place is, omit it.
- If you cannot name a credible food, wine, beer, beach, hiking, or market venue, omit that category instead of returning generic advice.

Return a JSON array only. Each object must be:
{
  "activity_name": "specific name",
  "activity_type": "outdoor|water|cultural|nightlife|dining|sports|beach|snow|business|wellness|shopping|souvenirs|family|adventure",
  "what_it_is": "short factual phrase explaining the place or item",
  "why_it_fits": "short reason tied to the traveler interests",
  "logistics": "short planning note, or empty string if unknown",
  "packing_hooks": ["one or two relevant packing cues"],
  "description": "one compact sentence combining what it is, why it fits, and the strongest planning or packing cue"
}`;
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function compactAiDescription(record: Record<string, unknown>) {
  const description = typeof record.description === "string" ? record.description.trim() : "";
  if (description) return description;

  const parts = [
    typeof record.what_it_is === "string" ? record.what_it_is.trim() : "",
    typeof record.why_it_fits === "string" ? record.why_it_fits.trim() : "",
    typeof record.logistics === "string" ? record.logistics.trim() : "",
  ].filter(Boolean);
  const packingHooks = stringList(record.packing_hooks);
  if (packingHooks.length > 0) {
    parts.push(`Pack: ${packingHooks.slice(0, 2).join(", ")}.`);
  }

  return parts.join(" ");
}

function normalizeAiActivities(
  destination: string,
  value: unknown,
): ActivitySuggestion[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  return value.flatMap((item: unknown): ActivitySuggestion[] => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const rawName = typeof record.activity_name === "string" ? record.activity_name.trim() : "";
    const rawType = typeof record.activity_type === "string" ? record.activity_type.trim() : "cultural";
    const rawDescription = compactAiDescription(record);
    if (!rawName || !isUserFacingActivityName(rawName, destination, rawDescription)) return [];
    if (!allowedActivityTypes.has(rawType)) return [];

    const key = normalizedName(rawName);
    if (seen.has(key)) return [];
    seen.add(key);

    return [{
      activity_name: rawName.slice(0, 140),
      activity_type: rawType,
      description: rawDescription ? rawDescription.slice(0, 360) : null,
      source: "ai_curated",
      external_id: null,
      photo_url: null,
      rating: null,
      review_count: null,
      rating_source: null,
      distance_from_center_km: null,
    }];
  }).slice(0, 18);
}

async function generateAiActivities(
  destination: string,
  interests: string[],
  osmActivities: ActivitySuggestion[],
  context: TripContext = {},
): Promise<ActivitySuggestion[]> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return [];

  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-3.1-flash-lite";
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  try {
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildAiPrompt(destination, interests, osmActivities, context) }] }],
        generationConfig: {
          temperature: 0.65,
          responseMimeType: "application/json",
        },
      }),
    }, 12000);

    if (!res.ok) return [];

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") return [];

    return normalizeAiActivities(destination, JSON.parse(extractJson(text)));
  } catch {
    return [];
  }
}

function shouldSearchDining(interests: string[]) {
  return interests.length === 0 || interests.some((interest) =>
    ["fine_dining", "street_food", "wine_tasting", "craft_beer"].includes(interest)
  );
}

function shouldSearchNightlife(interests: string[]) {
  return interests.length === 0 || interests.some((interest) =>
    ["craft_beer", "nightclubs", "live_music"].includes(interest)
  );
}

async function searchGooglePlacesByType(
  destination: string,
  lat: number,
  lon: number,
  includedType: "restaurant" | "bar",
): Promise<ActivitySuggestion[]> {
  if (!googlePlacesApiKey) return [];

  const textQuery = includedType === "bar"
    ? `highly rated bars in ${destination}`
    : `highly rated restaurants in ${destination}`;

  try {
    const res = await fetchWithTimeout("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": googlePlacesApiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.primaryType,places.rating,places.userRatingCount,places.googleMapsUri,places.location",
      },
      body: JSON.stringify({
        textQuery,
        includedType,
        strictTypeFiltering: true,
        minRating: 4.5,
        pageSize: 5,
        rankPreference: "RELEVANCE",
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lon },
            radius: 5000,
          },
        },
      }),
    }, 8000);

    if (!res.ok) return [];

    const data = await res.json();
    const places = Array.isArray(data?.places) ? data.places as GooglePlace[] : [];

    return places.flatMap((place): ActivitySuggestion[] => {
      const name = typeof place.displayName?.text === "string" ? place.displayName.text.trim() : "";
      const rating = Number(place.rating);
      const reviewCount = Number(place.userRatingCount);
      const latitude = Number(place.location?.latitude);
      const longitude = Number(place.location?.longitude);
      if (!name || !Number.isFinite(rating) || rating < 4.5) return [];

      const distance = Number.isFinite(latitude) && Number.isFinite(longitude)
        ? Math.round(distanceKm(lat, lon, latitude, longitude) * 10) / 10
        : null;
      const reviewText = Number.isFinite(reviewCount) && reviewCount > 0
        ? `${Math.round(reviewCount).toLocaleString("en-US")} Google reviews`
        : "Google review signal";

      return [{
        activity_name: name,
        activity_type: includedType === "bar" ? "nightlife" : "dining",
        description:
          `${name} is a highly rated ${includedType} near ${destination} with ${rating.toFixed(1)} stars from ${reviewText}.`,
        source: "google_places",
        external_id: typeof place.id === "string" ? `google:${place.id}` : null,
        photo_url: null,
        rating,
        review_count: Number.isFinite(reviewCount) && reviewCount > 0 ? Math.round(reviewCount) : null,
        rating_source: "Google",
        distance_from_center_km: distance,
      }];
    });
  } catch {
    return [];
  }
}

async function searchReviewedFoodAndDrink(
  destination: string,
  lat: number,
  lon: number,
  interests: string[],
) {
  const searches: Promise<ActivitySuggestion[]>[] = [];
  if (shouldSearchDining(interests)) {
    searches.push(searchGooglePlacesByType(destination, lat, lon, "restaurant"));
  }
  if (shouldSearchNightlife(interests)) {
    searches.push(searchGooglePlacesByType(destination, lat, lon, "bar"));
  }

  if (searches.length === 0) return [];
  return (await Promise.all(searches)).flat();
}

function mergeActivities(
  destination: string,
  interests: string[],
  reviewedActivities: ActivitySuggestion[],
  aiActivities: ActivitySuggestion[],
  osmActivities: ActivitySuggestion[],
) {
  const seen = new Set<string>();
  const merged: ActivitySuggestion[] = [];

  for (const activity of [
    ...reviewedActivities,
    ...localGuideActivities(destination, interests),
    ...aiActivities,
    ...osmActivities,
    ...fallbackActivities(destination, interests),
  ]) {
    const key = normalizedName(activity.activity_name);
    if (
      !key ||
      seen.has(key) ||
      !isUserFacingActivityName(activity.activity_name, destination, activity.description ?? "")
    ) continue;
    if (!activityMatchesInterests(activity.activity_type, interests)) continue;
    seen.add(key);
    merged.push(activity);
    if (merged.length >= 18) break;
  }

  return merged.length > 0 ? merged : fallbackActivities(destination, interests).slice(0, 8);
}

function buildDescription(name: string, tags: Record<string, string>) {
  const rawDescription = tags["description:en"] || tags.description;
  if (rawDescription) return rawDescription;

  const type = tags.tourism || tags.historic || tags.leisure || tags.amenity ||
    tags.natural || tags.building || "point of interest";
  const spacedType = type.replaceAll("_", " ");
  return `${name} is a ${spacedType} you can visit while you are in the area.`;
}

async function searchActivities(
  destination: string,
  lat: number,
  lon: number,
  interests: string[],
  context: TripContext = {},
) {
  const interestKey = interests.length > 0 ? [...interests].sort().join(",") : "all";
  const contextKey = [
    context.duration_days ?? "",
    context.travel_method ?? "",
    context.accommodation ?? "",
  ].join(":");
  const cacheKey = `activities:v6:${destination.toLowerCase()}:${lat.toFixed(2)}:${
    lon.toFixed(2)
  }:${interestKey}:${contextKey}`;
  const cached = await readCache(cacheKey);
  if (cached) return cached;

  const query = `
    [out:json][timeout:20];
    (
      nwr["tourism"~"attraction|museum|gallery|artwork|viewpoint|zoo|theme_park|aquarium"](around:5000,${lat},${lon});
      nwr["leisure"~"park|garden|beach_resort|nature_reserve|sports_centre|water_park|stadium"](around:5000,${lat},${lon});
      nwr["amenity"~"theatre|marketplace|place_of_worship|restaurant|cafe|food_court|bar|pub|nightclub"](around:4000,${lat},${lon});
      nwr["historic"~"castle|monument|memorial|ruins|archaeological_site|fort"](around:5000,${lat},${lon});
      nwr["building"="cathedral"](around:5000,${lat},${lon});
      nwr["natural"~"beach|cave_entrance|hot_spring|peak"](around:7000,${lat},${lon});
    );
    out center 40;
  `;

  let res: Response;
  try {
    res = await fetchWithTimeout(overpassUrl, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": userAgent,
      },
      body: new URLSearchParams({ data: query }),
    }, 15000);
  } catch {
    const reviewedActivities = await searchReviewedFoodAndDrink(destination, lat, lon, interests);
    const aiActivities = await generateAiActivities(destination, interests, [], context);
    const fallback = mergeActivities(destination, interests, reviewedActivities, aiActivities, []);
    await writeCache(cacheKey, fallback, 7 * 24 * 60 * 60);
    return fallback;
  }

  if (!res.ok) {
    const reviewedActivities = await searchReviewedFoodAndDrink(destination, lat, lon, interests);
    const aiActivities = await generateAiActivities(destination, interests, [], context);
    const fallback = mergeActivities(destination, interests, reviewedActivities, aiActivities, []);
    await writeCache(cacheKey, fallback, 7 * 24 * 60 * 60);
    return fallback;
  }

  const data = await res.json();
  if (typeof data?.remark === "string" && data.remark.includes("timed out")) {
    const reviewedActivities = await searchReviewedFoodAndDrink(destination, lat, lon, interests);
    const aiActivities = await generateAiActivities(destination, interests, [], context);
    const fallback = mergeActivities(destination, interests, reviewedActivities, aiActivities, []);
    await writeCache(cacheKey, fallback, 7 * 24 * 60 * 60);
    return fallback;
  }

  const elements = Array.isArray(data?.elements)
    ? data.elements as OverpassElement[]
    : [];
  const seen = new Set<string>();
  const osmActivities = elements.flatMap((element: OverpassElement) => {
    const tags = element.tags ?? {};
    const name = tags["name:en"] || tags.name;
    if (!name || seen.has(String(name).toLowerCase())) return [];

    const activityType = classifyTags(tags);
    if (!activityMatchesInterests(activityType, interests)) return [];

    const coordinates = elementCoordinates(element);
    const distance = coordinates ? distanceKm(lat, lon, coordinates.lat, coordinates.lon) : null;
    const description = buildDescription(String(name), tags);
    if (!isUserFacingActivityName(String(name), destination, description)) return [];
    seen.add(String(name).toLowerCase());

    return [{
      activity_name: String(name),
      activity_type: activityType,
      description,
      source: "openstreetmap",
      external_id: `osm:${element.type ?? "nwr"}:${element.id}`,
      photo_url: null,
      rating: null,
      review_count: null,
      rating_source: null,
      distance_from_center_km: distance === null ? null : Math.round(distance * 10) / 10,
    }];
  }).sort((a, b) => {
    if (a.distance_from_center_km === null) return 1;
    if (b.distance_from_center_km === null) return -1;
    return a.distance_from_center_km - b.distance_from_center_km;
  }).slice(0, 18);

  const reviewedActivities = await searchReviewedFoodAndDrink(destination, lat, lon, interests);
  const aiActivities = await generateAiActivities(destination, interests, osmActivities, context);
  const payload = mergeActivities(destination, interests, reviewedActivities, aiActivities, osmActivities);
  await writeCache(cacheKey, payload, 14 * 24 * 60 * 60);
  return payload;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const destination = String(body.destination ?? "").trim();
    const lat = Number(body.lat);
    const lon = Number(body.lon);
    const interests = normalizeInterests(body.interests);
    const context = normalizeTripContext(body.trip);

    if (!destination || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return Response.json(
        { error: "destination, lat, and lon are required" },
        { status: 400, headers: corsHeaders },
      );
    }

    const activities = await searchActivities(destination, lat, lon, interests, context);
    return Response.json({ activities }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({
      activities: fallbackActivities("this destination"),
      error: error instanceof Error ? error.message : "Unknown error",
    }, { headers: corsHeaders });
  }
});
