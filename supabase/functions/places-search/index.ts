import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const nominatimUrl = Deno.env.get("NOMINATIM_URL") ??
  "https://nominatim.openstreetmap.org";
const contactEmail = Deno.env.get("OSM_CONTACT_EMAIL") ??
  "support@destinationpacker.app";
const userAgent = Deno.env.get("NOMINATIM_USER_AGENT") ??
  `DestinationPacker/1.0 (${contactEmail})`;

const admin = createClient(supabaseUrl, serviceRoleKey);

type NominatimItem = {
  osm_type?: unknown;
  osm_id?: unknown;
  place_id?: unknown;
  display_name?: unknown;
  name?: unknown;
  lat?: unknown;
  lon?: unknown;
  address?: {
    country_code?: unknown;
  };
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
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  await admin.from("api_cache").upsert({
    cache_key: cacheKey,
    payload,
    expires_at: expiresAt,
  });
}

function osmId(item: NominatimItem): string {
  const type = String(item.osm_type ?? "").toUpperCase();
  const prefix = type.startsWith("R") ? "R" : type.startsWith("W") ? "W" : "N";
  return `${prefix}${item.osm_id ?? item.place_id ?? ""}`;
}

async function autocomplete(query: string) {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) return [];

  const cacheKey = `places:autocomplete:${cleanQuery.toLowerCase()}`;
  const cached = await readCache(cacheKey);
  if (cached) return cached;

  const url = new URL(`${nominatimUrl}/search`);
  url.searchParams.set("q", cleanQuery);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "8");
  url.searchParams.set("featuretype", "city");
  url.searchParams.set("accept-language", "en");
  url.searchParams.set("email", contactEmail);

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": userAgent,
      "Accept-Language": "en",
    },
  });

  if (!res.ok) return [];

  const data = await res.json();
  if (!Array.isArray(data)) return [];

  const results = data.map((item: NominatimItem) => ({
    place_id: osmId(item),
    description: String(item.display_name ?? ""),
  }));

  await writeCache(cacheKey, results, 7 * 24 * 60 * 60);
  return results;
}

async function details(placeId: string) {
  const cleanPlaceId = placeId.trim();
  if (!cleanPlaceId) return null;

  const cacheKey = `places:details:${cleanPlaceId}`;
  const cached = await readCache(cacheKey);
  if (cached) return cached;

  const lookupIds = /^[RWN]\d+$/.test(cleanPlaceId)
    ? cleanPlaceId
    : `R${cleanPlaceId},W${cleanPlaceId},N${cleanPlaceId}`;
  const url = new URL(`${nominatimUrl}/lookup`);
  url.searchParams.set("osm_ids", lookupIds);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "en");
  url.searchParams.set("email", contactEmail);

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": userAgent,
      "Accept-Language": "en",
    },
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  const item = data[0] as NominatimItem;
  const address = item.address ?? {};
  const payload = {
    name: item.name || String(item.display_name ?? "").split(",")[0],
    lat: Number(item.lat),
    lon: Number(item.lon),
    country_code: address.country_code
      ? String(address.country_code).toUpperCase()
      : null,
  };

  await writeCache(cacheKey, payload, 30 * 24 * 60 * 60);
  return payload;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const type = body?.type;

    if (type === "autocomplete") {
      const results = await autocomplete(String(body.query ?? ""));
      return Response.json({ results }, { headers: corsHeaders });
    }

    if (type === "details") {
      const result = await details(String(body.place_id ?? ""));
      if (!result) {
        return Response.json({ error: "Place not found" }, {
          status: 404,
          headers: corsHeaders,
        });
      }
      return Response.json(result, { headers: corsHeaders });
    }

    return Response.json({ error: "Unsupported places-search type" }, {
      status: 400,
      headers: corsHeaders,
    });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500, headers: corsHeaders });
  }
});
