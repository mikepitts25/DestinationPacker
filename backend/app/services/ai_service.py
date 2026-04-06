"""
Claude AI service for premium packing list generation and activity suggestions.
"""
import json
from app.config import settings
from app.models.trip import Trip
from app.services.rule_engine import PackingRecommendation


async def generate_ai_packing_list(
    trip: Trip,
    weather_summary: str,
    selected_activities: list[str],
) -> list[PackingRecommendation]:
    """
    Use Claude to generate a smart packing list for premium users.
    Falls back to an empty list if the API key is not configured.
    """
    if not settings.anthropic_api_key:
        return []

    import anthropic

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

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

Return 25-45 items covering all necessary categories. Prioritize practical, specific items over generic ones."""

    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip()
    # Extract JSON array if wrapped in markdown code blocks
    if "```" in text:
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

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


async def generate_ai_activities(
    destination: str,
    start_date: str,
    duration_days: int,
    user_interests: list[str] | None = None,
) -> list[dict]:
    """
    Use Claude to suggest activities and things to do at the destination.
    Returns a list of activity dicts for premium users.
    """
    if not settings.anthropic_api_key:
        return []

    import anthropic

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    interests_str = ", ".join(user_interests) if user_interests else "general travel"

    prompt = f"""You are a local travel expert. Suggest activities and things to do for a traveler visiting {destination}.

Trip context:
- Destination: {destination}
- Starting: {start_date}
- Duration: {duration_days} days
- Traveler interests: {interests_str}

Suggest 12-15 activities. Include a mix of:
- Must-see landmarks and attractions
- Local experiences and hidden gems
- Dining and food experiences
- Outdoor/nature activities (if applicable)
- Cultural experiences

Respond with ONLY a valid JSON array. Each item must have:
- "activity_name": string (specific name)
- "activity_type": one of: "outdoor", "water", "cultural", "nightlife", "dining", "sports", "beach", "snow", "wellness", "shopping"
- "description": string (1-2 sentences about why it's worth doing)
- "is_premium": boolean (mark as true for 3-4 unique/curated suggestions)

Example:
[
  {{
    "activity_name": "Senso-ji Temple at Dawn",
    "activity_type": "cultural",
    "description": "Visit Tokyo's oldest temple before the crowds arrive for a serene, spiritual experience.",
    "is_premium": false
  }}
]"""

    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip()
    if "```" in text:
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    return json.loads(text)


async def get_activity_packing_additions(
    destination: str,
    activity_name: str,
    activity_type: str,
    existing_items: list[str],
) -> list[PackingRecommendation]:
    """
    When a user selects an activity, ask Claude if any additional items are needed
    beyond what the rule engine already added.
    """
    if not settings.anthropic_api_key:
        return []

    import anthropic

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    existing_str = ", ".join(existing_items[:30]) if existing_items else "none yet"

    prompt = f"""A traveler to {destination} has selected the activity: "{activity_name}" ({activity_type}).

They already have these items in their packing list: {existing_str}

What additional items, if any, should they pack specifically for "{activity_name}" at {destination} that aren't already covered?
Only suggest items that are genuinely specific to this activity and location — don't repeat existing items.

Respond with ONLY a valid JSON array (can be empty [] if nothing new is needed):
[
  {{"category": "Gear", "item_name": "Specific item", "quantity": 1, "essential": true}}
]

Maximum 5 new items. Categories: "Clothing", "Electronics", "Documents", "Toiletries", "Health", "Gear", "Misc"."""

    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip()
    if "```" in text:
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

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
