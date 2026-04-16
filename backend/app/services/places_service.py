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

    # Append local souvenir suggestions based on destination
    souvenirs = get_souvenir_suggestions(destination)
    all_activities.extend(souvenirs)

    return all_activities[:18] or _get_fallback_activities(destination)


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
    fallback = [
        {"activity_name": f"Explore {destination} city center", "activity_type": "cultural", "description": "Walk around and discover local neighborhoods.", "source": "suggested", "external_id": None, "photo_url": None},
        {"activity_name": "Visit local museums", "activity_type": "cultural", "description": "Explore history, art, and culture.", "source": "suggested", "external_id": None, "photo_url": None},
        {"activity_name": "Try local cuisine", "activity_type": "dining", "description": "Sample authentic local food and restaurants.", "source": "suggested", "external_id": None, "photo_url": None},
        {"activity_name": "Day hike or nature walk", "activity_type": "outdoor", "description": "Discover the natural surroundings.", "source": "suggested", "external_id": None, "photo_url": None},
        {"activity_name": "Local markets and shopping", "activity_type": "shopping", "description": "Browse local markets for souvenirs and goods.", "source": "suggested", "external_id": None, "photo_url": None},
    ]
    fallback.extend(get_souvenir_suggestions(destination))
    return fallback


# ─── Souvenir Database ────────────────────────────────────────────────────────
# Maps country/region keywords to typical local souvenirs worth buying.
# Matched case-insensitively against the destination string.

_SOUVENIR_DATABASE: dict[str, list[tuple[str, str]]] = {
    # Americas
    "colombia": [
        ("Colombian coffee beans", "World-renowned single-origin coffee — buy whole beans from local fincas for the freshest taste."),
        ("Mochila Wayuu bag", "Hand-woven colorful bags made by the indigenous Wayuu people. Each takes weeks to make."),
        ("Emeralds", "Colombia produces ~70% of the world's emeralds. Buy from reputable dealers in Bogota's emerald district."),
    ],
    "mexico": [
        ("Oaxacan mezcal", "Artisanal small-batch mezcal from Oaxaca — far beyond what you'd find at home."),
        ("Talavera pottery", "Hand-painted ceramic tiles and dinnerware from Puebla, a centuries-old tradition."),
        ("Mexican vanilla extract", "Pure vanilla from Veracruz — richer and more complex than commercial brands."),
    ],
    "peru": [
        ("Alpaca wool textiles", "Incredibly soft scarves, sweaters, and blankets from Peruvian alpaca wool."),
        ("Pisco", "Peru's national spirit — bring home a bottle of quebranta or acholado pisco."),
        ("Chullo knit hat", "Colorful hand-knit ear-flap hats from the Andean highlands."),
    ],
    "brazil": [
        ("Cachaça", "Brazil's sugarcane spirit — the base of caipirinhas. Try artisanal aged varieties."),
        ("Havaianas flip-flops", "Iconic Brazilian sandals — way cheaper and more variety than abroad."),
        ("Brazilian coffee", "Some of the world's best single-origin beans, especially from Minas Gerais."),
    ],
    "argentina": [
        ("Malbec wine", "World-class reds from Mendoza — buy directly from bodegas for the best value."),
        ("Mate gourd and bombilla set", "The traditional tea-drinking kit used daily by Argentinians."),
        ("Dulce de leche", "Argentina's beloved caramel spread — artisanal versions are incredible."),
    ],
    "costa rica": [
        ("Costa Rican coffee", "High-altitude single-origin beans from Tarrazú or the Central Valley."),
        ("Handmade ox cart miniatures", "Colorful painted ox carts are a national symbol and UNESCO tradition."),
    ],
    # Europe
    "japan": [
        ("Japanese whisky", "World-award-winning whisky from Suntory or Nikka — often cheaper in Japan."),
        ("Matcha and tea sets", "Ceremonial-grade matcha powder and handmade ceramic tea bowls from Kyoto."),
        ("Tenugui cloth", "Traditional thin cotton towels with beautiful woodblock-print designs."),
        ("Japanese kitchen knife", "Hand-forged knives from Sakai or Seki — prized by chefs worldwide."),
    ],
    "france": [
        ("French wine", "Buy directly from vineyards in Bordeaux, Burgundy, or Champagne — cellar door prices."),
        ("Artisanal cheese", "Vacuum-sealed aged cheeses that travel well — Comté, Reblochon, or Roquefort."),
        ("Savon de Marseille soap", "Traditional olive oil soap from Provence — a practical luxury souvenir."),
    ],
    "italy": [
        ("Limoncello from Amalfi Coast", "Authentic lemon liqueur made from Sorrento lemons — nothing like store-bought."),
        ("Murano glass", "Hand-blown glass art from Venice's Murano island, a 700-year tradition."),
        ("Extra virgin olive oil", "Buy directly from small producers in Tuscany or Puglia."),
        ("Italian leather goods", "Florence is famous for artisan leather — bags, belts, wallets at workshop prices."),
    ],
    "spain": [
        ("Iberian jamón", "Vacuum-packed jamón ibérico — Spain's legendary cured ham."),
        ("Saffron from La Mancha", "The world's best saffron, far cheaper than at home."),
        ("Hand-painted ceramic tiles", "Azulejo-style tiles from Seville or Valencia."),
    ],
    "portugal": [
        ("Port wine", "Buy vintage port directly from cellars in Vila Nova de Gaia."),
        ("Azulejo tiles", "Hand-painted blue ceramic tiles — Portugal's iconic art form."),
        ("Cork products", "Portugal produces over half the world's cork — bags, wallets, hats."),
    ],
    "greece": [
        ("Greek olive oil", "Cold-pressed extra virgin from Crete or Kalamata — liquid gold."),
        ("Komboloi worry beads", "Traditional Greek fidget beads, often made from amber or semi-precious stones."),
        ("Ouzo or Mastiha liqueur", "Greece's signature spirits — mastiha from Chios is truly unique."),
    ],
    "turkey": [
        ("Turkish delight (lokum)", "Freshly made lokum from the Grand Bazaar — a world apart from commercial versions."),
        ("Turkish carpet or kilim", "Hand-woven rugs — negotiate in the bazaar and get a certificate of authenticity."),
        ("Turkish tea glasses and set", "Elegant tulip-shaped glasses and a çaydanlık double teapot."),
    ],
    "germany": [
        ("German beer steins", "Authentic stoneware or ceramic steins, especially from Bavaria."),
        ("Cuckoo clock from Black Forest", "Hand-carved traditional clocks — a classic German keepsake."),
        ("Christmas ornaments", "Handmade glass ornaments, especially from Nuremberg or Lauscha."),
    ],
    "netherlands": [
        ("Dutch stroopwafels", "Freshly made caramel waffle cookies — far better than packaged ones."),
        ("Delft Blue pottery", "Hand-painted blue and white ceramics, a Dutch tradition since the 1600s."),
    ],
    "uk": [
        ("Scotch whisky", "Single malt from distilleries across Scotland — distillery-exclusive bottles."),
        ("English tea collection", "Fortnum & Mason, Twinings, or specialty loose-leaf blends."),
    ],
    # Asia
    "thailand": [
        ("Thai silk", "Jim Thompson or local market silk scarves, ties, and fabric."),
        ("Thai spice set", "Dried curry pastes, lemongrass, and spice kits from Chatuchak market."),
        ("Coconut oil products", "Cold-pressed coconut oil soap, balm, and skincare from local producers."),
    ],
    "vietnam": [
        ("Vietnamese coffee and phin filter", "Robusta beans and the traditional drip brewer — make authentic cà phê sữa đá at home."),
        ("Ao dai fabric", "Custom-tailored silk fabric or a ready-made áo dài traditional dress."),
        ("Lacquerware", "Hand-painted lacquer boxes and bowls, a traditional Vietnamese craft."),
    ],
    "india": [
        ("Darjeeling or Assam tea", "Premium loose-leaf tea direct from the estates — a fraction of export prices."),
        ("Pashmina shawl", "Genuine cashmere/pashmina from Kashmir — incredibly warm and light."),
        ("Spice collection", "Cardamom, saffron, turmeric, and garam masala from spice markets."),
    ],
    "south korea": [
        ("Korean skincare products", "K-beauty essentials — sheet masks, serums, and sunscreens at local prices."),
        ("Soju varieties", "Flavored and premium soju brands not available outside Korea."),
        ("Hanbok accessories", "Traditional Korean textile accessories and ornaments."),
    ],
    "china": [
        ("Chinese tea (pu-erh, oolong, or jasmine)", "Buy directly from tea houses — aged pu-erh especially."),
        ("Silk products", "Scarves, robes, and fabric from Suzhou or Hangzhou silk markets."),
        ("Cloisonné enamelware", "Intricate metal and enamel vases, boxes, and jewelry."),
    ],
    # Africa & Middle East
    "morocco": [
        ("Argan oil", "Pure argan oil from cooperatives — cosmetic and culinary grades."),
        ("Moroccan spices from the souk", "Ras el hanout, preserved lemons, and saffron from Marrakech's spice market."),
        ("Berber rug", "Hand-woven wool rugs from Atlas Mountain villages — each one unique."),
    ],
    "egypt": [
        ("Egyptian cotton products", "Sheets, towels, and clothing in genuine long-staple Egyptian cotton."),
        ("Papyrus art", "Hand-painted papyrus scrolls with hieroglyphic designs."),
        ("Perfume oils from Khan el-Khalili", "Traditional concentrated perfume oils — no alcohol, lasts all day."),
    ],
    "south africa": [
        ("Rooibos tea", "South Africa's signature herbal tea — buy direct for the freshest quality."),
        ("Biltong and droëwors", "South African dried meats — vacuum-packed for travel."),
        ("Amarula cream liqueur", "Made from the African marula fruit — unique to southern Africa."),
    ],
    # Oceania
    "australia": [
        ("Tim Tams", "Australia's iconic chocolate biscuits — try every flavor."),
        ("Aboriginal art", "Authentic dot paintings and prints — buy from certified Indigenous-owned galleries."),
        ("Macadamia products", "Roasted macadamias, oil, and chocolates from Queensland."),
    ],
    "new zealand": [
        ("Manuka honey", "Genuine UMF-rated manuka honey — significantly cheaper than exported prices."),
        ("Pounamu (greenstone) carving", "Maori-carved jade pendants, each with spiritual significance."),
        ("Merino wool clothing", "Ultra-fine NZ merino from Icebreaker or local brands."),
    ],
    # Caribbean & Islands
    "jamaica": [
        ("Blue Mountain coffee", "One of the world's most prized coffees — buy at the source."),
        ("Jamaican rum", "Appleton Estate or Wray & Nephew — aged varieties not available elsewhere."),
        ("Jerk seasoning", "Authentic dry rub and wet marinade from local producers."),
    ],
    "cuba": [
        ("Cuban cigars", "Cohiba, Montecristo, or Partagás — buy from official La Casa del Habano shops."),
        ("Cuban rum (Havana Club)", "Aged varieties like Havana Club 7 Años — different from export versions."),
    ],
    "hawaii": [
        ("Kona coffee", "100% Kona from Big Island farms — one of the world's premier coffees."),
        ("Macadamia nut chocolates", "Hawaiian-grown macadamias dipped in local chocolate."),
        ("Hawaiian sea salt", "Red and black volcanic sea salt from Molokai."),
    ],
}


def get_souvenir_suggestions(destination: str) -> list[dict]:
    """
    Return souvenir suggestions based on the destination name.
    Matches against country/region keywords in the destination string.
    """
    dest_lower = destination.lower()
    suggestions = []

    for keyword, souvenirs in _SOUVENIR_DATABASE.items():
        if keyword in dest_lower:
            for name, description in souvenirs:
                suggestions.append({
                    "activity_name": f"Buy: {name}",
                    "activity_type": "souvenirs",
                    "description": description,
                    "source": "souvenir_guide",
                    "external_id": None,
                    "photo_url": None,
                })
            break  # Only match the first country

    # If no specific match, add a generic souvenir suggestion
    if not suggestions:
        suggestions.append({
            "activity_name": "Browse local markets for souvenirs",
            "activity_type": "souvenirs",
            "description": f"Find unique local crafts, food, and gifts typical of {destination}.",
            "source": "suggested",
            "external_id": None,
            "photo_url": None,
        })

    return suggestions
