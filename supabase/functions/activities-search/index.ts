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

const genericNamePatterns = [
  /^explore .+ city center$/i,
  /^visit local museums$/i,
  /^try local cuisine$/i,
  /^day hike or nature walk$/i,
  /^local markets and shopping$/i,
  /^browse local markets/i,
  /^book a notable restaurant$/i,
  /^adventure activity$/i,
  /^family-friendly attraction$/i,
  /^spa, wellness, or fitness session$/i,
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
  if (["theatre", "cinema"].includes(amenity)) return "cultural";
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

function activityMatchesInterests(activityType: string, interests: string[]) {
  if (interests.length === 0) return true;
  return interests.some((interest) =>
    interestActivityTypes[interest]?.includes(activityType)
  );
}

function fallbackActivities(destination: string, interests: string[] = []): ActivitySuggestion[] {
  const activities: ActivitySuggestion[] = [
    {
      activity_name: `${destination} old town, landmark, or historic building route`,
      activity_type: "cultural",
      description:
        "Build a sightseeing route around older buildings, monuments, churches, castles, ruins, or preserved streets.",
      source: "suggested",
      external_id: null,
      photo_url: null,
      rating: null,
      review_count: null,
      rating_source: null,
      distance_from_center_km: null,
    },
    {
      activity_name: `${destination} museum or specialist collection`,
      activity_type: "cultural",
      description:
        "Prioritize museums with a strong local story, not just the largest building on the map.",
      source: "suggested",
      external_id: null,
      photo_url: null,
      rating: null,
      review_count: null,
      rating_source: null,
      distance_from_center_km: null,
    },
    {
      activity_name: `${destination} cooking class, tasting, or food market walk`,
      activity_type: "dining",
      description:
        "Look for a hands-on class or tasting tied to local ingredients, drinks, chocolate, spices, or regional dishes.",
      source: "suggested",
      external_id: null,
      photo_url: null,
      rating: null,
      review_count: null,
      rating_source: null,
      distance_from_center_km: null,
    },
    {
      activity_name: `${destination} local market and independent shops`,
      activity_type: "shopping",
      description:
        "Browse markets and small shops for practical gifts, food souvenirs, crafts, and regional products.",
      source: "suggested",
      external_id: null,
      photo_url: null,
      rating: null,
      review_count: null,
      rating_source: null,
      distance_from_center_km: null,
    },
    {
      activity_name: `${destination} park, garden, viewpoint, or waterfront break`,
      activity_type: "outdoor",
      description:
        "Add a lower-key outdoor stop between heavier museum, meal, and sightseeing plans.",
      source: "suggested",
      external_id: null,
      photo_url: null,
      rating: null,
      review_count: null,
      rating_source: null,
      distance_from_center_km: null,
    },
    {
      activity_name: `${destination} live music, wine bar, or evening venue`,
      activity_type: "nightlife",
      description:
        "Choose a specific evening plan that reflects the destination instead of a generic night out.",
      source: "suggested",
      external_id: null,
      photo_url: null,
      rating: null,
      review_count: null,
      rating_source: null,
      distance_from_center_km: null,
    },
  ];

  const filtered = activities.filter((activity) =>
    activityMatchesInterests(activity.activity_type, interests)
  );
  return filtered.length > 0 ? filtered : activities.slice(0, 5);
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
) {
  const interestText = interests.length > 0 ? interests.join(", ") : "general sightseeing";
  const typeText = suggestedActivityTypes(interests).join(", ") || "mixed";
  const nearbyNames = osmActivities.slice(0, 12).map((activity) => ({
    name: activity.activity_name,
    type: activity.activity_type,
  }));

  return `You are a sharp local travel editor for DestinationPacker. Return strict JSON only.

Create 14 to 18 destination-specific trip suggestions for ${destination}.

Traveler interests: ${interestText}
Useful activity type mix: ${typeText}
Nearby map results you may include if they are worth visiting: ${JSON.stringify(nearbyNames)}

The list must feel concrete and useful, not generic. Include a balanced mix of:
- Named museums, castles, old buildings, viewpoints, ruins, historic districts, landmarks, or cultural places.
- Hands-on local experiences such as cooking classes, chocolate workshops, wine tastings, tea ceremonies, craft studios, market food tours, or similar experiences when they fit ${destination}.
- Local foods, drinks, markets, independent shops, and destination-specific things to buy. For buyable items, prefix activity_name with "Buy: ".
- Outdoor, family, nightlife, wellness, beach, or adventure suggestions only when they fit the destination or requested interests.

Rules:
- Prefer actual named places or named destination-specific experiences.
- Do not return generic names like "Visit local museums", "Try local cuisine", "Local markets and shopping", or "Explore city center".
- Keep old sightseeing attractions in the mix, but make them specific.
- Descriptions should explain why this belongs in ${destination}, not how travel works in general.
- Do not invent street addresses, phone numbers, prices, hours, or booking claims.

Return a JSON array only. Each object must be:
{
  "activity_name": "specific name",
  "activity_type": "outdoor|water|cultural|nightlife|dining|sports|beach|snow|business|wellness|shopping|souvenirs|family|adventure",
  "description": "one useful sentence"
}`;
}

function normalizeAiActivities(value: unknown): ActivitySuggestion[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  return value.flatMap((item: unknown): ActivitySuggestion[] => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const rawName = typeof record.activity_name === "string" ? record.activity_name.trim() : "";
    const rawType = typeof record.activity_type === "string" ? record.activity_type.trim() : "cultural";
    const rawDescription = typeof record.description === "string" ? record.description.trim() : "";
    if (!rawName || isGenericName(rawName)) return [];
    if (!allowedActivityTypes.has(rawType)) return [];

    const key = normalizedName(rawName);
    if (seen.has(key)) return [];
    seen.add(key);

    return [{
      activity_name: rawName.slice(0, 140),
      activity_type: rawType,
      description: rawDescription ? rawDescription.slice(0, 280) : null,
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
): Promise<ActivitySuggestion[]> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return [];

  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash-lite";
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildAiPrompt(destination, interests, osmActivities) }] }],
      generationConfig: {
        temperature: 0.65,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) return [];

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") return [];

  try {
    return normalizeAiActivities(JSON.parse(extractJson(text)));
  } catch {
    return [];
  }
}

function mergeActivities(
  destination: string,
  interests: string[],
  aiActivities: ActivitySuggestion[],
  osmActivities: ActivitySuggestion[],
) {
  const seen = new Set<string>();
  const merged: ActivitySuggestion[] = [];

  for (const activity of [...aiActivities, ...osmActivities, ...fallbackActivities(destination, interests)]) {
    const key = normalizedName(activity.activity_name);
    if (!key || seen.has(key) || isGenericName(activity.activity_name)) continue;
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
) {
  const interestKey = interests.length > 0 ? [...interests].sort().join(",") : "all";
  const cacheKey = `activities:v2:${destination.toLowerCase()}:${lat.toFixed(2)}:${
    lon.toFixed(2)
  }:${interestKey}`;
  const cached = await readCache(cacheKey);
  if (cached) return cached;

  const query = `
    [out:json][timeout:20];
    (
      nwr["tourism"~"attraction|museum|gallery|artwork|viewpoint|zoo|theme_park|aquarium"](around:5000,${lat},${lon});
      nwr["leisure"~"park|garden|beach_resort|nature_reserve|sports_centre|water_park|stadium"](around:5000,${lat},${lon});
      nwr["amenity"~"theatre|cinema|marketplace|place_of_worship|restaurant|cafe|food_court|bar|pub|nightclub"](around:4000,${lat},${lon});
      nwr["historic"~"castle|monument|memorial|ruins|archaeological_site|fort"](around:5000,${lat},${lon});
      nwr["building"="cathedral"](around:5000,${lat},${lon});
      nwr["natural"~"beach|cave_entrance|hot_spring|peak"](around:7000,${lat},${lon});
    );
    out center 40;
  `;

  const res = await fetch(overpassUrl, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "User-Agent": userAgent,
    },
    body: new URLSearchParams({ data: query }),
  });

  if (!res.ok) {
    const aiActivities = await generateAiActivities(destination, interests, []);
    const fallback = mergeActivities(destination, interests, aiActivities, []);
    await writeCache(cacheKey, fallback, 7 * 24 * 60 * 60);
    return fallback;
  }

  const data = await res.json();
  if (typeof data?.remark === "string" && data.remark.includes("timed out")) {
    const aiActivities = await generateAiActivities(destination, interests, []);
    const fallback = mergeActivities(destination, interests, aiActivities, []);
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
    seen.add(String(name).toLowerCase());

    const activityType = classifyTags(tags);
    if (!activityMatchesInterests(activityType, interests)) return [];

    const coordinates = elementCoordinates(element);
    const distance = coordinates ? distanceKm(lat, lon, coordinates.lat, coordinates.lon) : null;

    return [{
      activity_name: String(name),
      activity_type: activityType,
      description: buildDescription(String(name), tags),
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

  const aiActivities = await generateAiActivities(destination, interests, osmActivities);
  const payload = mergeActivities(destination, interests, aiActivities, osmActivities);
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

    if (!destination || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return Response.json(
        { error: "destination, lat, and lon are required" },
        { status: 400, headers: corsHeaders },
      );
    }

    const activities = await searchActivities(destination, lat, lon, interests);
    return Response.json({ activities }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({
      activities: fallbackActivities("this destination"),
      error: error instanceof Error ? error.message : "Unknown error",
    }, { headers: corsHeaders });
  }
});
