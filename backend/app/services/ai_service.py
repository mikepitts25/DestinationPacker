"""
AI service for premium packing list generation and activity suggestions.

Provider chain (tries in order, uses first that succeeds):
1. OpenRouter free models (if OPENROUTER_API_KEY is set)
2. Ollama (free, self-hosted LLM)
3. Claude API (if ANTHROPIC_API_KEY is set)
"""
import logging
import json
import httpx
from app.config import settings
from app.models.trip import Trip
from app.services.rule_engine import PackingRecommendation

logger = logging.getLogger(__name__)


def _extract_json(text: str) -> str:
    """Extract JSON from a response that may be wrapped in markdown code blocks."""
    text = text.strip()
    if "```" in text:
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    return text


async def _ollama_generate(prompt: str, max_tokens: int = 2048) -> str | None:
    """Send a prompt to Ollama and return the response text."""
    url = f"{settings.ollama_base_url}/api/generate"
    payload = {
        "model": settings.ollama_model,
        "prompt": prompt,
        "stream": False,
        "options": {"num_predict": max_tokens, "temperature": 0.7},
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            return resp.json().get("response", "")
        except httpx.HTTPError:
            return None


async def _openrouter_generate(prompt: str, max_tokens: int = 2048) -> str | None:
    """Send a prompt to OpenRouter (free models). OpenAI-compatible API."""
    if not settings.use_openrouter:
        return None

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.openrouter_model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
        "temperature": 0.7,
    }
    async with httpx.AsyncClient(timeout=90.0) as client:
        try:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            logger.info("OpenRouter response received (model: %s)", settings.openrouter_model)
            return content.strip()
        except (httpx.HTTPError, KeyError, IndexError) as e:
            logger.warning("OpenRouter request failed: %s", e)
            return None


async def _claude_generate(prompt: str, max_tokens: int = 2048) -> str | None:
    """Send a prompt to Claude API (only if key is configured)."""
    if not settings.use_claude:
        return None

    import anthropic
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text.strip()


async def _generate(prompt: str, max_tokens: int = 2048) -> str | None:
    """
    Try providers in order: OpenRouter (free models) -> Ollama (local) -> Claude (paid).
    Returns the first successful response.
    """
    result = await _openrouter_generate(prompt, max_tokens)
    if result:
        return result
    result = await _ollama_generate(prompt, max_tokens)
    if result:
        return result
    return await _claude_generate(prompt, max_tokens)


async def generate_ai_packing_list(
    trip: Trip,
    weather_summary: str,
    selected_activities: list[str],
) -> list[PackingRecommendation]:
    """
    Use AI to generate a smart packing list for premium users.
    Tries Ollama first, then Claude as fallback.
    """
    prompt = f"""You are a travel packing expert. Generate a comprehensive packing list for this trip.

Trip Details:
- Destination: {trip.destination}
- Duration: {trip.duration_days} days ({trip.start_date} to {trip.end_date})
- Travel method: {trip.travel_method.value}
- Accommodation: {trip.accommodation.value}
- Number of travelers: {trip.travelers}
- Weather: {weather_summary}
- Planned activities: {', '.join(selected_activities) if selected_activities else 'general sightseeing'}

Generate a detailed packing list. Consider:
1. Local cultural norms and customs for {trip.destination}
2. Practical needs based on weather and activities
3. Travel method specific items (e.g., TSA rules for flights)
4. Accommodation specific needs
5. Any destination-specific items unique to {trip.destination}

Respond with ONLY a valid JSON array. Each item must have these exact fields:
- "category": string (e.g., "Clothing", "Electronics", "Documents", "Toiletries", "Health", "Gear", "Misc")
- "item_name": string
- "quantity": integer
- "essential": boolean

Example format:
[
  {{"category": "Clothing", "item_name": "Lightweight jacket", "quantity": 1, "essential": true}},
  {{"category": "Electronics", "item_name": "Universal power adapter", "quantity": 1, "essential": true}}
]

Return 25-45 items covering all necessary categories. Prioritize practical, specific items over generic ones.
IMPORTANT: Return ONLY the JSON array, no other text."""

    text = await _generate(prompt)
    if not text:
        return []

    try:
        text = _extract_json(text)
        items_data: list[dict] = json.loads(text)
        return [
            PackingRecommendation(
                category=item["category"],
                item_name=item["item_name"],
                quantity=item.get("quantity", 1),
                essential=item.get("essential", False),
                source="ai",
            )
            for item in items_data
        ]
    except (json.JSONDecodeError, KeyError):
        return []


async def generate_ai_activities(
    destination: str,
    start_date: str,
    duration_days: int,
    user_interests: list[str] | None = None,
) -> list[dict]:
    """
    Use AI to suggest activities and things to do at the destination.
    Returns a list of activity dicts for premium users.
    """
    interests_str = ", ".join(user_interests) if user_interests else "general travel"

    prompt = f"""You are a local travel expert. Suggest activities and things to do for a traveler visiting {destination}.

Trip context:
- Destination: {destination}
- Starting: {start_date}
- Duration: {duration_days} days
- Traveler interests: {interests_str}

Suggest 15-18 activities. Include a mix of:
- Must-see landmarks and attractions
- Local experiences and hidden gems
- Dining and food experiences
- Outdoor/nature activities (if applicable)
- Cultural experiences
- 2-4 local souvenirs/products to buy that are typical of {destination} (e.g., coffee beans in Colombia, olive oil in Italy, silk in Thailand). For souvenirs use activity_type "souvenirs" and prefix the name with "Buy: ".

Respond with ONLY a valid JSON array. Each item must have:
- "activity_name": string (specific name — for souvenirs, prefix with "Buy: ")
- "activity_type": one of: "outdoor", "water", "cultural", "nightlife", "dining", "sports", "beach", "snow", "wellness", "shopping", "souvenirs"
- "description": string (1-2 sentences. For souvenirs, explain what makes it special and where to buy it.)

Example:
[
  {{
    "activity_name": "Senso-ji Temple at Dawn",
    "activity_type": "cultural",
    "description": "Visit Tokyo's oldest temple before the crowds arrive for a serene, spiritual experience."
  }},
  {{
    "activity_name": "Buy: Japanese whisky",
    "activity_type": "souvenirs",
    "description": "World-award-winning whisky from Suntory or Nikka — often cheaper in Japan. Try distillery-exclusive bottles."
  }}
]

IMPORTANT: Return ONLY the JSON array, no other text."""

    text = await _generate(prompt)
    if not text:
        return []

    try:
        text = _extract_json(text)
        return json.loads(text)
    except json.JSONDecodeError:
        return []


async def get_activity_packing_additions(
    destination: str,
    activity_name: str,
    activity_type: str,
    existing_items: list[str],
) -> list[PackingRecommendation]:
    """
    When a user selects an activity, ask AI if any additional items are needed
    beyond what the rule engine already added.
    """
    existing_str = ", ".join(existing_items[:30]) if existing_items else "none yet"

    prompt = f"""A traveler to {destination} has selected the activity: "{activity_name}" ({activity_type}).

They already have these items in their packing list: {existing_str}

What additional items, if any, should they pack specifically for "{activity_name}" at {destination} that aren't already covered?
Only suggest items that are genuinely specific to this activity and location — don't repeat existing items.

Respond with ONLY a valid JSON array (can be empty [] if nothing new is needed):
[
  {{"category": "Gear", "item_name": "Specific item", "quantity": 1, "essential": true}}
]

Maximum 5 new items. Categories: "Clothing", "Electronics", "Documents", "Toiletries", "Health", "Gear", "Misc".
IMPORTANT: Return ONLY the JSON array, no other text."""

    text = await _generate(prompt, max_tokens=512)
    if not text:
        return []

    try:
        text = _extract_json(text)
        items_data = json.loads(text)
        return [
            PackingRecommendation(
                category=item["category"],
                item_name=item["item_name"],
                quantity=item.get("quantity", 1),
                essential=item.get("essential", False),
                source="ai",
                activity_type=activity_type,
            )
            for item in items_data
        ]
    except (json.JSONDecodeError, KeyError):
        return []
