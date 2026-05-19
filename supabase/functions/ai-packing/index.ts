const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type AiItem = {
  category: string;
  item_name: string;
  quantity: number;
  essential: boolean;
  traveler_type: "male" | "female" | "child" | "pet" | "shared";
};

type JsonObject = Record<string, unknown>;

type AiPackingInput = {
  trip?: JsonObject;
  weather_summary?: unknown;
  weather_conditions?: unknown;
  selected_activities?: unknown;
  user_notes?: unknown;
};

const allowedCategories = new Set([
  "Clothing",
  "Electronics",
  "Documents",
  "Toiletries",
  "Health",
  "Gear",
  "Misc",
  "Footwear",
]);

const allowedTravelerTypes = new Set(["male", "female", "child", "pet", "shared"]);

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.includes("```")) return trimmed;

  const block = trimmed.split("```")[1] ?? trimmed;
  return block.startsWith("json") ? block.slice(4).trim() : block.trim();
}

function normalizeItems(value: unknown): AiItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item: unknown) => {
    if (
      !item || typeof item !== "object" ||
      typeof (item as JsonObject).category !== "string" ||
      typeof (item as JsonObject).item_name !== "string"
    ) return [];
    const itemObject = item as JsonObject;
    const categoryValue = itemObject.category as string;
    const itemName = itemObject.item_name as string;
    const category = allowedCategories.has(categoryValue)
      ? categoryValue
      : "Misc";
    return [{
      category,
      item_name: itemName.slice(0, 120),
      quantity: Math.max(1, Math.min(99, Number(itemObject.quantity) || 1)),
      essential: Boolean(itemObject.essential),
      traveler_type: allowedTravelerTypes.has(String(itemObject.traveler_type))
        ? itemObject.traveler_type as AiItem["traveler_type"]
        : "shared",
    }];
  }).slice(0, 45);
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function buildPrompt(input: AiPackingInput): string {
  const trip = input.trip ?? {};
  const legs = Array.isArray(trip.legs)
    ? trip.legs.map((leg: unknown) => {
      if (!leg || typeof leg !== "object") return null;
      const legObject = leg as JsonObject;
      return {
        destination: stringValue(legObject.destination, "unknown"),
        dates: `${stringValue(legObject.start_date, "unknown")} to ${
          stringValue(legObject.end_date, "unknown")
        }`,
        travel_method: stringValue(legObject.travel_method, "unknown"),
        accommodation: stringValue(legObject.accommodation, "unknown"),
      };
    }).filter(Boolean)
    : [];
  const activities = Array.isArray(input.selected_activities)
    ? input.selected_activities.map((activity: unknown) => {
      if (!activity || typeof activity !== "object") return null;
      const activityObject = activity as JsonObject;
      return activityObject.activity_name ?? activityObject.activity_type;
    }).filter((activity): activity is string => typeof activity === "string")
    : [];
  const weatherConditions = Array.isArray(input.weather_conditions)
    ? input.weather_conditions.filter((condition): condition is string =>
      typeof condition === "string"
    )
    : [];

  return `You are a travel packing expert. Return strict JSON only.

Generate practical packing suggestions that augment a deterministic packing rule engine. Do not repeat obvious universal items unless the destination context changes the recommendation.

Trip:
- Destination: ${stringValue(trip.destination, "unknown")}
- Dates: ${stringValue(trip.start_date, "unknown")} to ${
    stringValue(trip.end_date, "unknown")
  }
- Duration days: ${String(trip.duration_days ?? "unknown")}
- Travelers: ${String(trip.travelers ?? 1)}
- Adult male travelers: ${String(trip.male_travelers ?? 0)}
- Adult female travelers: ${String(trip.female_travelers ?? 0)}
- Children: ${String(trip.children ?? 0)}
- Pets: ${String(trip.pets ?? 0)}
- Accommodation: ${stringValue(trip.accommodation, "unknown")}
- Travel method: ${stringValue(trip.travel_method, "unknown")}
- Laundry available: ${trip.has_laundry_access ? "yes, assume about 7 days of clothing and laundry mid-trip" : "no"}
- Legs: ${legs.length > 0 ? JSON.stringify(legs) : "single destination"}
- User notes: ${stringValue(input.user_notes ?? trip.notes, "none")}
- Weather summary: ${stringValue(input.weather_summary, "Weather unavailable")}
- Weather condition tags: ${weatherConditions.join(", ") || "none"}
- Selected activities: ${activities.join(", ") || "general sightseeing"}

Return a JSON array of 5 to 20 objects. Each object must have:
{"category":"Clothing|Electronics|Documents|Toiletries|Health|Gear|Misc|Footwear","item_name":"specific item","quantity":1,"essential":false,"traveler_type":"male|female|child|pet|shared"}

Use traveler_type "male" or "female" only for adult gender-specific items, "child" for child-specific items, "pet" for pet-specific items, and "shared" for group items. Factor user notes directly, for example formal events, mobility constraints, medical needs, children, pets, camping legs, and laundry access.

Focus on destination-specific, weather-specific, activity-specific, cultural, or logistical items.`;
}

async function callGemini(prompt: string) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return {
      items: [],
      provider: "none",
      error: "GEMINI_API_KEY is not configured",
    };
  }

  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash-lite";
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    return {
      items: [],
      provider: "gemini",
      error: `Gemini error ${res.status}`,
    };
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    return { items: [], provider: "gemini", error: "Gemini returned no text" };
  }

  try {
    return {
      items: normalizeItems(JSON.parse(extractJson(text))),
      provider: "gemini",
    };
  } catch {
    return {
      items: [],
      provider: "gemini",
      error: "Gemini returned invalid JSON",
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const input = await req.json();
    const result = await callGemini(buildPrompt(input));
    return Response.json(result, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      {
        items: [],
        provider: "gemini",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { headers: corsHeaders },
    );
  }
});
