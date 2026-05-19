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

function fallbackActivities(destination: string, interests: string[] = []) {
  const activities = [
    {
      activity_name: `Explore ${destination} city center`,
      activity_type: "cultural",
      description: "Walk around and discover local neighborhoods.",
      source: "suggested",
      external_id: null,
      photo_url: null,
      rating: null,
      review_count: null,
      rating_source: null,
      distance_from_center_km: null,
    },
    {
      activity_name: "Visit local museums",
      activity_type: "cultural",
      description: "Explore history, art, and culture.",
      source: "suggested",
      external_id: null,
      photo_url: null,
      rating: null,
      review_count: null,
      rating_source: null,
      distance_from_center_km: null,
    },
    {
      activity_name: "Try local cuisine",
      activity_type: "dining",
      description: "Sample authentic local food and restaurants.",
      source: "suggested",
      external_id: null,
      photo_url: null,
      rating: null,
      review_count: null,
      rating_source: null,
      distance_from_center_km: null,
    },
    {
      activity_name: "Day hike or nature walk",
      activity_type: "outdoor",
      description: "Discover the natural surroundings.",
      source: "suggested",
      external_id: null,
      photo_url: null,
      rating: null,
      review_count: null,
      rating_source: null,
      distance_from_center_km: null,
    },
    {
      activity_name: "Beach or waterfront time",
      activity_type: "beach",
      description:
        "Spend time by the water if the destination has a beach, lake, riverfront, or pool area.",
      source: "suggested",
      external_id: null,
      photo_url: null,
      rating: null,
      review_count: null,
      rating_source: null,
      distance_from_center_km: null,
    },
    {
      activity_name: "Evening drinks or club night",
      activity_type: "nightlife",
      description:
        "Plan a night out at a bar, lounge, live music venue, or club.",
      source: "suggested",
      external_id: null,
      photo_url: null,
      rating: null,
      review_count: null,
      rating_source: null,
      distance_from_center_km: null,
    },
    {
      activity_name: "Spa, wellness, or fitness session",
      activity_type: "wellness",
      description:
        "Look for a spa, yoga class, gym session, or wellness activity nearby.",
      source: "suggested",
      external_id: null,
      photo_url: null,
      rating: null,
      review_count: null,
      rating_source: null,
      distance_from_center_km: null,
    },
    {
      activity_name: "Local markets and shopping",
      activity_type: "shopping",
      description: "Browse local markets for souvenirs and goods.",
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
  const interestKey = interests.length > 0 ? interests.sort().join(",") : "all";
  const cacheKey = `activities:${destination.toLowerCase()}:${lat.toFixed(2)}:${
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

  if (!res.ok) return fallbackActivities(destination, interests);

  const data = await res.json();
  if (typeof data?.remark === "string" && data.remark.includes("timed out")) {
    return fallbackActivities(destination, interests);
  }

  const elements = Array.isArray(data?.elements)
    ? data.elements as OverpassElement[]
    : [];
  const seen = new Set<string>();
  const activities = elements.flatMap((element: OverpassElement) => {
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

  const payload = activities.length > 0
    ? activities
    : fallbackActivities(destination, interests);
  await writeCache(cacheKey, payload, 7 * 24 * 60 * 60);
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
