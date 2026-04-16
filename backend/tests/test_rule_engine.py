"""Tests for the packing rule engine."""
import pytest
from datetime import date
from unittest.mock import MagicMock

from app.services.rule_engine import generate_packing_list, classify_weather, _eval_quantity
from app.models.trip import Trip, AccommodationType, TravelMethod


def make_trip(
    days: int = 7,
    accommodation: AccommodationType = AccommodationType.hotel,
    travel_method: TravelMethod = TravelMethod.flight,
    travelers: int = 1,
) -> Trip:
    trip = MagicMock(spec=Trip)
    trip.duration_days = days
    trip.accommodation = accommodation
    trip.travel_method = travel_method
    trip.travelers = travelers
    return trip


class TestClassifyWeather:
    def test_hot_weather(self):
        conditions = classify_weather(30.0, False, False)
        assert "hot" in conditions

    def test_cold_weather(self):
        conditions = classify_weather(2.0, False, False)
        assert "cold" in conditions

    def test_rain(self):
        conditions = classify_weather(15.0, True, False)
        assert "rain" in conditions

    def test_snow(self):
        conditions = classify_weather(-5.0, False, True)
        assert "snow" in conditions
        assert "cold" in conditions

    def test_cool(self):
        conditions = classify_weather(10.0, False, False)
        assert "cool" in conditions

    def test_mild_no_conditions(self):
        conditions = classify_weather(22.0, False, False)
        assert "hot" not in conditions
        assert "cold" not in conditions


class TestQuantityFormula:
    def test_fixed_quantity(self):
        assert _eval_quantity("1", 7, 2) == 1

    def test_days_formula(self):
        assert _eval_quantity("days", 5, 1) == 5

    def test_days_plus_one(self):
        assert _eval_quantity("days+1", 5, 1) == 6

    def test_days_divided(self):
        result = _eval_quantity("days//2 + 1", 7, 1)
        assert result == 4

    def test_minimum_one(self):
        result = _eval_quantity("days//10", 1, 1)
        assert result >= 1


class TestGeneratePackingList:
    def test_always_items_present(self):
        trip = make_trip()
        items = generate_packing_list(trip)
        names = [i.item_name for i in items]
        assert "Passport or ID" in names
        assert "Phone charger" in names
        assert "Toothbrush" in names

    def test_flight_items_added(self):
        trip = make_trip(travel_method=TravelMethod.flight)
        items = generate_packing_list(trip)
        names = [i.item_name for i in items]
        assert "Travel pillow" in names
        assert "Luggage locks (TSA-approved)" in names

    def test_road_trip_items_added(self):
        trip = make_trip(travel_method=TravelMethod.road_trip)
        items = generate_packing_list(trip)
        names = [i.item_name for i in items]
        assert "Car charger / USB adapter" in names

    def test_hostel_items_added(self):
        trip = make_trip(accommodation=AccommodationType.hostel)
        items = generate_packing_list(trip)
        names = [i.item_name for i in items]
        assert "Padlock for locker" in names
        assert "Earplugs" in names

    def test_rain_items_added(self):
        trip = make_trip()
        items = generate_packing_list(trip, weather_conditions=["rain"])
        names = [i.item_name for i in items]
        assert "Waterproof rain jacket" in names
        assert "Compact travel umbrella" in names

    def test_hiking_activity_items_added(self):
        trip = make_trip()
        items = generate_packing_list(trip, selected_activity_types=["hiking"])
        names = [i.item_name for i in items]
        assert "Hiking boots" in names
        assert "Bug spray / insect repellent" in names

    def test_beach_activity_items_added(self):
        trip = make_trip()
        items = generate_packing_list(trip, selected_activity_types=["beach"])
        names = [i.item_name for i in items]
        assert "Swimsuit" in names
        assert "Beach towel" in names
        assert "Sunscreen SPF 50+" in names

    def test_no_duplicate_items(self):
        trip = make_trip()
        items = generate_packing_list(trip, weather_conditions=["hot"], selected_activity_types=["beach"])
        names = [i.item_name.lower() for i in items]
        assert len(names) == len(set(names)), "Duplicate items found"

    def test_duration_based_quantities(self):
        trip = make_trip(days=5)
        items = generate_packing_list(trip)
        socks = next((i for i in items if i.item_name == "Socks"), None)
        assert socks is not None
        assert socks.quantity == 6  # days+1 = 6

    def test_camping_accommodation_items(self):
        trip = make_trip(accommodation=AccommodationType.camping)
        items = generate_packing_list(trip)
        names = [i.item_name for i in items]
        assert "Tent" in names
        assert "Sleeping bag" in names

    def test_essential_items_flagged(self):
        trip = make_trip()
        items = generate_packing_list(trip)
        essentials = [i for i in items if i.essential]
        assert len(essentials) > 0
        essential_names = [i.item_name for i in essentials]
        assert "Passport or ID" in essential_names
