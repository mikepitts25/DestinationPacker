"""
Places service — uses Nominatim (OpenStreetMap geocoding) + Overpass API for POIs.
Both are free, open-source, and require no API key.

Nominatim usage policy: max 1 request/sec, include a User-Agent.
https://nominatim.org/release-docs/latest/api/Overview/
"""
import httpx

USER_AGENT = "DestinationPacker/1.0 (travel packing app)"
NOMINATIM_URL = "https://nominatim.openstreetmap.org"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"


async def autocomplete_destination(query: str) -> list[dict]:
    """
    Use Nominatim to geocode/search for destinations.
    Returns a list of {place_id, description}.
    """
    url = f"{NOMINATIM_URL}/search"
    params = {
        "q": query,
        "format": "jsonv2",
        "addressdetails": 1,
        "limit": 8,
        "featuretype": "city",
    }
    headers = {"User-Agent": USER_AGENT}

    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPError:
            return []

    results = []
    for item in data:
        results.append({
            "place_id": str(item.get("osm_id", item.get("place_id", ""))),
            "description": item.get("display_name", ""),
        })
    return results


async def get_place_details(place_id: str) -> dict | None:
    """
    Fetch lat/lon and country code for a Nominatim place.
    Uses Nominatim lookup by OSM ID (or search if needed).
    """
    # Try lookup first (for OSM IDs)
    url = f"{NOMINATIM_URL}/lookup"
    params = {
        "osm_ids": f"R{place_id},W{place_id},N{place_id}",
        "format": "jsonv2",
        "addressdetails": 1,
    }
    headers = {"User-Agent": USER_AGENT}

    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPError:
            return None

    if not data:
        # Fallback: search by place_id as a query
        url = f"{NOMINATIM_URL}/search"
        params = {"q": place_id, "format": "jsonv2", "addressdetails": 1, "limit": 1}
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                resp = await client.get(url, params=params, headers=headers)
                data = resp.json()
            except httpx.HTTPError:
                return None

    if not data:
        return None

    item = data[0]
    address = item.get("address", {})
    country_code = address.get("country_code", "").upper()

    return {
        "name": item.get("name") or item.get("display_name", "").split(",")[0],
        "lat": float(item.get("lat", 0)),
        "lon": float(item.get("lon", 0)),
        "country_code": country_code or None,
    }


async def get_nearby_activities(lat: float, lon: float, destination: str) -> list[dict]:
    """
    Fetch nearby points of interest using the Overpass API (OpenStreetMap).
    Queries for tourism, leisure, and amenity nodes near the coordinates.
    """
    # Overpass QL query: find tourism, leisure, and notable amenities within 10km
    query = f"""
    [out:json][timeout:10];
    (
      node["tourism"~"attraction|museum|artwork|viewpoint|zoo|theme_park"](around:10000,{lat},{lon});
      node["leisure"~"park|garden|beach_resort|nature_reserve|sports_centre"](around:10000,{lat},{lon});
      node["amenity"~"restaurant|nightclub|theatre|cinema"](around:8000,{lat},{lon});
    );
    out body 20;
    """

    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            resp = await client.post(OVERPASS_URL, data={"data": query})
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPError:
            return _get_fallback_activities(destination)

    elements = data.get("elements", [])
    if not elements:
        return _get_fallback_activities(destination)

    all_activities = []
    seen_names: set[str] = set()

    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name", "")
        if not name or name.lower() in seen_names:
            continue
        seen_names.add(name.lower())

        activity_type = _classify_osm_tags(tags)
        description = tags.get("description", tags.get("tourism", tags.get("leisure", tags.get("amenity", ""))))

        all_activities.append({
            "activity_name": name,
            "activity_type": activity_type,
            "description": description.capitalize() if description else f"Explore {name}",
            "source": "openstreetmap",
            "external_id": f"osm:{el.get('id', '')}",
            "photo_url": None,  # OSM doesn't provide photos directly
        })

    return all_activities[:15] or _get_fallback_activities(destination)


def _classify_osm_tags(tags: dict) -> str:
    """Map OSM tags to our activity types."""
    tourism = tags.get("tourism", "")
    leisure = tags.get("leisure", "")
    amenity = tags.get("amenity", "")

    if tourism in ("museum", "artwork"):
        return "cultural"
    if tourism in ("attraction", "viewpoint"):
        return "cultural"
    if tourism in ("zoo", "theme_park"):
        return "outdoor"
    if leisure in ("park", "garden", "nature_reserve"):
        return "outdoor"
    if leisure == "beach_resort":
        return "beach"
    if leisure == "sports_centre":
        return "sports"
    if amenity == "restaurant":
        return "dining"
    if amenity == "nightclub":
        return "nightlife"
    if amenity in ("theatre", "cinema"):
        return "cultural"

    return "cultural"  # default


def _get_fallback_activities(destination: str) -> list[dict]:
    """Generic activity suggestions when APIs fail or return nothing."""
    return [
        {"activity_name": f"Explore {destination} city center", "activity_type": "cultural", "description": "Walk around and discover local neighborhoods.", "source": "suggested", "external_id": None, "photo_url": None},
        {"activity_name": "Visit local museums", "activity_type": "cultural", "description": "Explore history, art, and culture.", "source": "suggested", "external_id": None, "photo_url": None},
        {"activity_name": "Try local cuisine", "activity_type": "dining", "description": "Sample authentic local food and restaurants.", "source": "suggested", "external_id": None, "photo_url": None},
        {"activity_name": "Day hike or nature walk", "activity_type": "outdoor", "description": "Discover the natural surroundings.", "source": "suggested", "external_id": None, "photo_url": None},
        {"activity_name": "Local markets and shopping", "activity_type": "shopping", "description": "Browse local markets for souvenirs and goods.", "source": "suggested", "external_id": None, "photo_url": None},
    ]
