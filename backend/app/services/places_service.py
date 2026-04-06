"""
Google Places service for destination autocomplete and activity suggestions.
"""
import httpx
from app.config import settings


async def autocomplete_destination(query: str) -> list[dict]:
    """
    Use Google Places Autocomplete to suggest destinations.
    Returns a list of {place_id, description, lat, lon}.
    """
    if not settings.google_places_api_key:
        return []

    url = "https://maps.googleapis.com/maps/api/place/autocomplete/json"
    params = {
        "input": query,
        "types": "(cities)",
        "key": settings.google_places_api_key,
    }

    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    results = []
    for prediction in data.get("predictions", [])[:8]:
        results.append({
            "place_id": prediction["place_id"],
            "description": prediction["description"],
        })
    return results


async def get_place_details(place_id: str) -> dict | None:
    """
    Fetch lat/lon and country code for a place_id.
    """
    if not settings.google_places_api_key:
        return None

    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "fields": "geometry,address_components,name",
        "key": settings.google_places_api_key,
    }

    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    result = data.get("result", {})
    if not result:
        return None

    location = result.get("geometry", {}).get("location", {})
    country_code = None
    for component in result.get("address_components", []):
        if "country" in component["types"]:
            country_code = component["short_name"]
            break

    return {
        "name": result.get("name"),
        "lat": location.get("lat"),
        "lon": location.get("lng"),
        "country_code": country_code,
    }


async def get_nearby_activities(lat: float, lon: float, destination: str) -> list[dict]:
    """
    Fetch nearby tourist attractions using Google Places Nearby Search.
    Returns list of activity suggestions.
    """
    if not settings.google_places_api_key:
        return _get_fallback_activities(destination)

    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    activity_types = [
        ("tourist_attraction", "cultural"),
        ("museum", "cultural"),
        ("park", "outdoor"),
        ("amusement_park", "outdoor"),
        ("beach", "beach"),
        ("restaurant", "dining"),
        ("night_club", "nightlife"),
        ("spa", "wellness"),
        ("stadium", "sports"),
    ]

    all_activities = []
    seen_names: set[str] = set()

    async with httpx.AsyncClient(timeout=10.0) as client:
        for place_type, activity_type in activity_types[:4]:  # Limit API calls
            params = {
                "location": f"{lat},{lon}",
                "radius": 10000,
                "type": place_type,
                "key": settings.google_places_api_key,
            }
            try:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()

                for place in data.get("results", [])[:3]:
                    name = place.get("name", "")
                    if name and name not in seen_names:
                        seen_names.add(name)
                        photo_ref = None
                        if place.get("photos"):
                            photo_ref = place["photos"][0].get("photo_reference")

                        photo_url = None
                        if photo_ref:
                            photo_url = (
                                f"https://maps.googleapis.com/maps/api/place/photo"
                                f"?maxwidth=400&photo_reference={photo_ref}"
                                f"&key={settings.google_places_api_key}"
                            )

                        all_activities.append({
                            "activity_name": name,
                            "activity_type": activity_type,
                            "description": place.get("vicinity", ""),
                            "source": "google_places",
                            "external_id": place.get("place_id"),
                            "photo_url": photo_url,
                        })
            except httpx.HTTPError:
                continue

    return all_activities or _get_fallback_activities(destination)


def _get_fallback_activities(destination: str) -> list[dict]:
    """Generic activity suggestions when APIs are not configured."""
    return [
        {"activity_name": f"Explore {destination} city center", "activity_type": "cultural", "description": "Walk around and discover local neighborhoods.", "source": "suggested", "external_id": None, "photo_url": None},
        {"activity_name": "Visit local museums", "activity_type": "cultural", "description": "Explore history, art, and culture.", "source": "suggested", "external_id": None, "photo_url": None},
        {"activity_name": "Try local cuisine", "activity_type": "dining", "description": "Sample authentic local food and restaurants.", "source": "suggested", "external_id": None, "photo_url": None},
        {"activity_name": "Day hike or nature walk", "activity_type": "outdoor", "description": "Discover the natural surroundings.", "source": "suggested", "external_id": None, "photo_url": None},
        {"activity_name": "Local markets and shopping", "activity_type": "shopping", "description": "Browse local markets for souvenirs and goods.", "source": "suggested", "external_id": None, "photo_url": None},
    ]
