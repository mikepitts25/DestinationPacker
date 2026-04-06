"""
Rule-based packing list engine (free tier).
Evaluates a trip's context against a set of rules to produce packing items.
"""
from dataclasses import dataclass
from app.models.trip import Trip, AccommodationType, TravelMethod


@dataclass
class PackingRecommendation:
    category: str
    item_name: str
    quantity: int
    essential: bool
    source: str = "rule_engine"
    activity_type: str | None = None


def _eval_quantity(formula: str, days: int, travelers: int) -> int:
    """Evaluate a quantity formula given trip duration and traveler count."""
    try:
        result = eval(formula, {"__builtins__": {}}, {"days": days, "travelers": travelers})
        return max(1, int(result))
    except Exception:
        return 1


# ---------------------------------------------------------------------------
# Rule definitions
# Each rule: (trigger_type, trigger_value, category, item_name, qty_formula, essential)
# ---------------------------------------------------------------------------

ALWAYS_RULES: list[tuple[str, str, int, bool]] = [
    # (category, item_name, qty_formula_or_int, essential)
    ("Documents", "Passport or ID", 1, True),
    ("Documents", "Travel insurance info", 1, True),
    ("Documents", "Reservation confirmations", 1, True),
    ("Electronics", "Phone charger", 1, True),
    ("Electronics", "Portable battery bank", 1, False),
    ("Toiletries", "Toothbrush", 1, True),
    ("Toiletries", "Toothpaste", 1, True),
    ("Toiletries", "Deodorant", 1, True),
    ("Toiletries", "Shampoo & conditioner", 1, False),
    ("Toiletries", "Body wash / soap", 1, False),
    ("Toiletries", "Face wash", 1, False),
    ("Health", "Prescription medications", 1, True),
    ("Health", "Pain reliever (ibuprofen/acetaminophen)", 1, False),
    ("Health", "Antacids", 1, False),
    ("Health", "Band-aids", 1, False),
    ("Clothing", "Comfortable walking shoes", 1, True),
    ("Clothing", "Pajamas / sleepwear", 1, False),
    ("Misc", "Reusable water bottle", 1, False),
    ("Misc", "Small day bag / backpack", 1, False),
]

# duration_days -> items based on trip length
DURATION_RULES: list[tuple[int, str, str, str, bool]] = [
    # (min_days, category, item_name, qty_formula, essential)
    (1, "Clothing", "Underwear", "days+1", True),
    (1, "Clothing", "Socks", "days+1", True),
    (1, "Clothing", "T-shirts / tops", "days", False),
    (1, "Clothing", "Pants / shorts", "days//2 + 1", False),
    (4, "Toiletries", "Laundry detergent sheets", 1, False),
    (7, "Misc", "Packing cubes", 1, False),
    (7, "Misc", "Travel-size laundry soap", 1, False),
]

# Weather-based rules: (weather_condition, category, item_name, qty, essential)
WEATHER_RULES: dict[str, list[tuple[str, str, int, bool]]] = {
    "rain": [
        ("Clothing", "Waterproof rain jacket", 1, True),
        ("Clothing", "Waterproof shoes / boots", 1, False),
        ("Misc", "Compact travel umbrella", 1, False),
        ("Clothing", "Quick-dry pants", 1, False),
    ],
    "hot": [  # avg > 27°C / 80°F
        ("Toiletries", "Sunscreen SPF 50+", 1, True),
        ("Clothing", "Sunglasses", 1, True),
        ("Clothing", "Sun hat / cap", 1, False),
        ("Clothing", "Breathable shorts", 2, False),
        ("Clothing", "Sandals / flip flops", 1, False),
        ("Misc", "Electrolyte packets", 3, False),
        ("Misc", "Reusable water bottle", 1, True),
    ],
    "cold": [  # avg < 5°C / 41°F
        ("Clothing", "Heavy winter coat", 1, True),
        ("Clothing", "Thermal / base layers", 2, True),
        ("Clothing", "Warm gloves", 1, True),
        ("Clothing", "Knit hat / beanie", 1, True),
        ("Clothing", "Wool or thermal socks", 3, False),
        ("Clothing", "Winter boots", 1, False),
        ("Clothing", "Scarf", 1, False),
    ],
    "cool": [  # avg 5–15°C / 41–59°F
        ("Clothing", "Light jacket or fleece", 1, True),
        ("Clothing", "Layering long-sleeve shirts", 2, False),
        ("Clothing", "Light gloves", 1, False),
    ],
    "snow": [
        ("Clothing", "Snow boots", 1, True),
        ("Clothing", "Waterproof winter coat", 1, True),
        ("Clothing", "Thermal base layers", 2, True),
        ("Clothing", "Warm gloves / mittens", 1, True),
        ("Clothing", "Neck gaiter / balaclava", 1, False),
    ],
}

# Activity-based rules
ACTIVITY_RULES: dict[str, list[tuple[str, str, int, bool]]] = {
    "hiking": [
        ("Footwear", "Hiking boots", 1, True),
        ("Clothing", "Moisture-wicking hiking socks", 3, True),
        ("Clothing", "Quick-dry hiking pants", 1, False),
        ("Gear", "Daypack / hiking backpack", 1, False),
        ("Gear", "Trekking poles", 1, False),
        ("Health", "Blister pads", 1, False),
        ("Health", "Bug spray / insect repellent", 1, True),
        ("Toiletries", "Sunscreen SPF 50+", 1, True),
        ("Misc", "Trail snacks (bars, nuts)", 3, False),
        ("Misc", "Headlamp + extra batteries", 1, False),
        ("Health", "First aid kit", 1, True),
    ],
    "beach": [
        ("Clothing", "Swimsuit", 2, True),
        ("Clothing", "Beach cover-up", 1, False),
        ("Misc", "Beach towel", 1, True),
        ("Toiletries", "Sunscreen SPF 50+", 1, True),
        ("Clothing", "Flip flops / sandals", 1, True),
        ("Clothing", "Sunglasses", 1, True),
        ("Clothing", "Sun hat", 1, False),
        ("Misc", "Waterproof bag / dry bag", 1, False),
    ],
    "water": [  # water sports
        ("Clothing", "Swimsuit", 2, True),
        ("Clothing", "Rash guard", 1, False),
        ("Clothing", "Water shoes", 1, False),
        ("Toiletries", "Reef-safe sunscreen", 1, True),
        ("Misc", "Waterproof phone case", 1, False),
        ("Misc", "Dry bag", 1, False),
    ],
    "snow": [  # ski/snowboard
        ("Gear", "Ski / snowboard gear (or plan to rent)", 1, True),
        ("Clothing", "Ski goggles", 1, True),
        ("Clothing", "Ski helmet (or rent)", 1, True),
        ("Clothing", "Ski jacket", 1, True),
        ("Clothing", "Ski pants / bibs", 1, True),
        ("Clothing", "Moisture-wicking base layers", 2, True),
        ("Clothing", "Ski socks", 3, True),
        ("Clothing", "Warm gloves / mittens", 1, True),
        ("Misc", "Hand warmers", 4, False),
        ("Toiletries", "Lip balm with SPF", 1, False),
        ("Toiletries", "High SPF sunscreen (sun reflects off snow)", 1, True),
    ],
    "camping": [
        ("Gear", "Tent (or confirm campsite has one)", 1, True),
        ("Gear", "Sleeping bag (appropriate temperature rating)", 1, True),
        ("Gear", "Sleeping pad / inflatable mat", 1, False),
        ("Gear", "Camp stove + fuel", 1, False),
        ("Gear", "Camp cookware set", 1, False),
        ("Gear", "Headlamp + extra batteries", 1, True),
        ("Gear", "Multi-tool / pocket knife", 1, False),
        ("Clothing", "Warm fleece jacket", 1, True),
        ("Clothing", "Rain jacket", 1, True),
        ("Health", "Bug spray", 1, True),
        ("Toiletries", "Biodegradable soap", 1, False),
        ("Misc", "Camp chairs (if backpacking: skip)", 1, False),
        ("Misc", "Matches / lighter", 2, True),
        ("Misc", "Bear canister (check local rules)", 1, False),
    ],
    "cultural": [
        ("Clothing", "Modest / respectful attire (cover shoulders & knees)", 2, True),
        ("Clothing", "Comfortable walking shoes", 1, True),
        ("Misc", "Reusable tote bag for souvenirs", 1, False),
        ("Documents", "Guidebook or offline maps", 1, False),
    ],
    "nightlife": [
        ("Clothing", "Going-out outfit", 2, True),
        ("Clothing", "Dress shoes / heels", 1, False),
        ("Misc", "Small clutch / evening bag", 1, False),
        ("Health", "Earplugs (for light sleepers)", 1, False),
    ],
    "business": [
        ("Clothing", "Business attire (shirts, trousers/skirt)", 3, True),
        ("Clothing", "Dress shoes", 1, True),
        ("Clothing", "Blazer / sport coat", 1, True),
        ("Electronics", "Laptop + charger", 1, True),
        ("Electronics", "USB-C hub / adapters", 1, False),
        ("Documents", "Business cards", 20, False),
        ("Documents", "Presentation materials", 1, False),
        ("Misc", "Professional padfolio / notebook", 1, False),
    ],
    "wellness": [
        ("Clothing", "Workout clothes", 3, False),
        ("Clothing", "Running shoes", 1, False),
        ("Gear", "Resistance bands", 1, False),
        ("Misc", "Foam roller / massage ball", 1, False),
        ("Misc", "Yoga mat (or confirm availability)", 1, False),
    ],
    "outdoor": [  # general outdoor
        ("Clothing", "Moisture-wicking athletic wear", 2, False),
        ("Toiletries", "Sunscreen SPF 30+", 1, True),
        ("Clothing", "Sun hat / cap", 1, False),
        ("Health", "Bug spray", 1, False),
    ],
    "dining": [
        ("Clothing", "Smart casual outfit", 2, False),
        ("Documents", "Restaurant reservation confirmations", 1, False),
    ],
}

# Travel method rules
TRAVEL_METHOD_RULES: dict[str, list[tuple[str, str, int, bool]]] = {
    "flight": [
        ("Clothing", "Comfortable travel outfit (layers)", 1, True),
        ("Misc", "Luggage locks (TSA-approved)", 2, False),
        ("Misc", "Travel pillow", 1, False),
        ("Electronics", "Noise-cancelling headphones / earbuds", 1, False),
        ("Health", "Compression socks (for long flights)", 1, False),
        ("Documents", "Printed boarding passes (backup)", 1, False),
        ("Misc", "Snacks for airport / flight", 3, False),
        ("Electronics", "Power adapter / voltage converter", 1, False),
    ],
    "road_trip": [
        ("Electronics", "Car phone mount", 1, False),
        ("Electronics", "Car charger / USB adapter", 1, True),
        ("Misc", "Road trip snacks", 5, False),
        ("Misc", "Reusable water bottles", 2, False),
        ("Misc", "Car emergency kit (check if you have one)", 1, True),
        ("Misc", "Paper maps / atlas (backup)", 1, False),
        ("Clothing", "Comfortable driving shoes", 1, False),
    ],
    "train": [
        ("Misc", "Travel pillow", 1, False),
        ("Electronics", "Headphones / earbuds", 1, False),
        ("Misc", "Snacks for journey", 3, False),
        ("Documents", "Printed tickets (backup)", 1, False),
    ],
    "cruise": [
        ("Clothing", "Formal / cocktail outfit (for formal nights)", 2, True),
        ("Clothing", "Swimsuit", 2, True),
        ("Health", "Sea-sickness bands / Dramamine", 1, False),
        ("Documents", "Cruise card / booking documents", 1, True),
        ("Misc", "Power strip (without surge protector — check cruise rules)", 1, False),
    ],
    "backpacking": [
        ("Gear", "Backpack (40–60L)", 1, True),
        ("Gear", "Packing cubes / compression sacks", 3, True),
        ("Misc", "Padlock for hostel lockers", 1, True),
        ("Clothing", "Quick-dry microfiber towel", 1, True),
        ("Health", "Water purification tablets or filter", 1, False),
        ("Electronics", "Universal power adapter", 1, True),
        ("Misc", "Ziplock bags (various sizes)", 5, False),
    ],
}

# Accommodation rules
ACCOMMODATION_RULES: dict[str, list[tuple[str, str, int, bool]]] = {
    "hostel": [
        ("Misc", "Padlock for locker", 1, True),
        ("Clothing", "Flip flops (for shared showers)", 1, True),
        ("Misc", "Earplugs", 2, True),
        ("Misc", "Eye mask", 1, False),
        ("Misc", "Combination lock", 1, False),
        ("Misc", "Microfiber towel (hostels often don't provide)", 1, True),
    ],
    "camping": [
        ("Gear", "Tent", 1, True),
        ("Gear", "Sleeping bag", 1, True),
        ("Gear", "Sleeping pad", 1, True),
        ("Misc", "Lantern / camp light", 1, True),
        ("Misc", "Matches or lighter", 2, True),
    ],
    "airbnb": [
        ("Misc", "Check-in instructions / lockbox code", 1, True),
    ],
    "cruise": [
        ("Clothing", "Formal outfit (check cruise line dress code)", 1, True),
        ("Misc", "Magnetic hooks for cabin walls", 4, False),
    ],
}


def generate_packing_list(
    trip: Trip,
    weather_conditions: list[str] | None = None,
    selected_activity_types: list[str] | None = None,
) -> list[PackingRecommendation]:
    """
    Generate a packing list for a trip using the rule engine.

    Args:
        trip: The trip model instance
        weather_conditions: List of conditions e.g. ['rain', 'hot']
        selected_activity_types: List of activity types e.g. ['hiking', 'beach']

    Returns:
        List of PackingRecommendation objects (deduplicated by item_name)
    """
    days = trip.duration_days
    travelers = trip.travelers
    recommendations: dict[str, PackingRecommendation] = {}

    def add(category: str, item_name: str, quantity: int, essential: bool, source: str = "rule_engine", activity_type: str | None = None):
        key = item_name.lower()
        if key not in recommendations:
            recommendations[key] = PackingRecommendation(
                category=category,
                item_name=item_name,
                quantity=quantity,
                essential=essential,
                source=source,
                activity_type=activity_type,
            )

    # Always rules
    for category, item_name, qty, essential in ALWAYS_RULES:
        add(category, item_name, qty, essential)

    # Duration rules
    for min_days, category, item_name, formula, essential in DURATION_RULES:
        if days >= min_days:
            qty = _eval_quantity(str(formula), days, travelers)
            add(category, item_name, qty, essential)

    # Weather rules
    if weather_conditions:
        for condition in weather_conditions:
            for category, item_name, qty, essential in WEATHER_RULES.get(condition, []):
                add(category, item_name, qty, essential, source="rule_engine")

    # Activity rules
    if selected_activity_types:
        for activity_type in selected_activity_types:
            for category, item_name, qty, essential in ACTIVITY_RULES.get(activity_type, []):
                add(category, item_name, qty, essential, source="activity", activity_type=activity_type)

    # Travel method rules
    method_key = trip.travel_method.value
    for category, item_name, qty, essential in TRAVEL_METHOD_RULES.get(method_key, []):
        add(category, item_name, qty, essential)

    # Accommodation rules
    acc_key = trip.accommodation.value
    for category, item_name, qty, essential in ACCOMMODATION_RULES.get(acc_key, []):
        add(category, item_name, qty, essential)

    return list(recommendations.values())


def classify_weather(avg_temp_celsius: float, has_rain: bool, has_snow: bool) -> list[str]:
    """Convert weather data into condition tags for the rule engine."""
    conditions = []
    if has_snow:
        conditions.append("snow")
    elif has_rain:
        conditions.append("rain")

    if avg_temp_celsius > 27:
        conditions.append("hot")
    elif avg_temp_celsius < 5:
        conditions.append("cold")
    elif avg_temp_celsius < 15:
        conditions.append("cool")

    return conditions
