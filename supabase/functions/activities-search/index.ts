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
const admin = createClient(supabaseUrl, serviceRoleKey);

type OverpassElement = {
  id?: unknown;
  type?: unknown;
  tags?: Record<string, string>;
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
  if (["zoo", "theme_park", "aquarium"].includes(tourism)) return "outdoor";
  if (["park", "garden", "nature_reserve"].includes(leisure)) return "outdoor";
  if (leisure === "beach_resort" || natural === "beach") return "beach";
  if (["sports_centre", "stadium", "water_park"].includes(leisure)) {
    return "sports";
  }
  if (natural === "hot_spring") return "wellness";
  if (["cave_entrance", "peak"].includes(natural)) return "outdoor";
  if (amenity === "marketplace") return "shopping";
  if (amenity === "place_of_worship" || tags.building === "cathedral") {
    return "cultural";
  }
  if (["theatre", "cinema"].includes(amenity)) return "cultural";
  return "cultural";
}

function fallbackActivities(destination: string) {
  return [
    {
      activity_name: `Explore ${destination} city center`,
      activity_type: "cultural",
      description: "Walk around and discover local neighborhoods.",
      source: "suggested",
      external_id: null,
      photo_url: null,
    },
    {
      activity_name: "Visit local museums",
      activity_type: "cultural",
      description: "Explore history, art, and culture.",
      source: "suggested",
      external_id: null,
      photo_url: null,
    },
    {
      activity_name: "Try local cuisine",
      activity_type: "dining",
      description: "Sample authentic local food and restaurants.",
      source: "suggested",
      external_id: null,
      photo_url: null,
    },
    {
      activity_name: "Day hike or nature walk",
      activity_type: "outdoor",
      description: "Discover the natural surroundings.",
      source: "suggested",
      external_id: null,
      photo_url: null,
    },
    {
      activity_name: "Local markets and shopping",
      activity_type: "shopping",
      description: "Browse local markets for souvenirs and goods.",
      source: "suggested",
      external_id: null,
      photo_url: null,
    },
  ];
}

async function searchActivities(destination: string, lat: number, lon: number) {
  const cacheKey = `activities:${destination.toLowerCase()}:${lat.toFixed(2)}:${
    lon.toFixed(2)
  }`;
  const cached = await readCache(cacheKey);
  if (cached) return cached;

  const query = `
    [out:json][timeout:15];
    (
      nwr["tourism"~"attraction|museum|gallery|artwork|viewpoint|zoo|theme_park|aquarium"](around:12000,${lat},${lon});
      nwr["leisure"~"park|garden|beach_resort|nature_reserve|sports_centre|water_park|stadium"](around:12000,${lat},${lon});
      nwr["amenity"~"theatre|cinema|marketplace|place_of_worship"](around:10000,${lat},${lon});
      nwr["historic"~"castle|monument|memorial|ruins|archaeological_site|fort"](around:12000,${lat},${lon});
      nwr["building"="cathedral"](around:12000,${lat},${lon});
      nwr["natural"~"beach|cave_entrance|hot_spring|peak"](around:15000,${lat},${lon});
    );
    out center 40;
  `;

  const res = await fetch(overpassUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: query }),
  });

  if (!res.ok) return fallbackActivities(destination);

  const data = await res.json();
  const elements = Array.isArray(data?.elements)
    ? data.elements as OverpassElement[]
    : [];
  const seen = new Set<string>();
  const activities = elements.flatMap((element: OverpassElement) => {
    const tags = element.tags ?? {};
    const name = tags["name:en"] || tags.name;
    if (!name || seen.has(String(name).toLowerCase())) return [];
    seen.add(String(name).toLowerCase());

    const description = tags["description:en"] ||
      tags.description ||
      tags.tourism ||
      tags.historic ||
      tags.leisure ||
      tags.amenity ||
      `Explore ${name}`;

    return [{
      activity_name: String(name),
      activity_type: classifyTags(tags),
      description: String(description).charAt(0).toUpperCase() +
        String(description).slice(1),
      source: "openstreetmap",
      external_id: `osm:${element.type ?? "nwr"}:${element.id}`,
      photo_url: null,
    }];
  }).slice(0, 18);

  const payload = activities.length > 0
    ? activities
    : fallbackActivities(destination);
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

    if (!destination || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return Response.json(
        { error: "destination, lat, and lon are required" },
        { status: 400, headers: corsHeaders },
      );
    }

    const activities = await searchActivities(destination, lat, lon);
    return Response.json({ activities }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({
      activities: fallbackActivities("this destination"),
      error: error instanceof Error ? error.message : "Unknown error",
    }, { headers: corsHeaders });
  }
});
