"""Integration tests for trips and packing API endpoints."""
import pytest
from httpx import AsyncClient
from datetime import date, timedelta

from app.models.user import User


def auth_headers(user: User) -> dict:
    return {"Authorization": f"Bearer test:{user.email}"}


@pytest.mark.asyncio
class TestTripsAPI:
    async def test_create_trip(self, client: AsyncClient, free_user: User):
        response = await client.post(
            "/api/trips/",
            json={
                "destination": "Paris, France",
                "start_date": str(date.today() + timedelta(days=30)),
                "end_date": str(date.today() + timedelta(days=37)),
                "accommodation": "hotel",
                "travel_method": "flight",
                "travelers": 2,
            },
            headers=auth_headers(free_user),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["destination"] == "Paris, France"
        assert data["duration_days"] == 8
        assert data["travelers"] == 2

    async def test_list_trips_empty(self, client: AsyncClient, free_user: User):
        response = await client.get("/api/trips/", headers=auth_headers(free_user))
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_free_tier_trip_limit(self, client: AsyncClient, free_user: User):
        """Free users cannot create more than 3 trips."""
        trip_data = {
            "destination": "Test City",
            "start_date": str(date.today() + timedelta(days=10)),
            "end_date": str(date.today() + timedelta(days=14)),
            "accommodation": "hotel",
            "travel_method": "flight",
            "travelers": 1,
        }
        # Create 3 trips (already created 1 in test_create_trip, but fixtures are isolated per test)
        for _ in range(3):
            resp = await client.post("/api/trips/", json=trip_data, headers=auth_headers(free_user))
            assert resp.status_code in (201, 402)

        # The 4th should fail
        fourth = await client.post("/api/trips/", json=trip_data, headers=auth_headers(free_user))
        if fourth.status_code == 402:
            assert "Premium" in fourth.json()["detail"]

    async def test_premium_unlimited_trips(self, client: AsyncClient, premium_user: User):
        """Premium users can create more than 3 trips."""
        trip_data = {
            "destination": "Tokyo, Japan",
            "start_date": str(date.today() + timedelta(days=60)),
            "end_date": str(date.today() + timedelta(days=67)),
            "accommodation": "hotel",
            "travel_method": "flight",
            "travelers": 1,
        }
        for _ in range(5):
            resp = await client.post("/api/trips/", json=trip_data, headers=auth_headers(premium_user))
            assert resp.status_code == 201

    async def test_get_trip_not_found(self, client: AsyncClient, free_user: User):
        response = await client.get(
            "/api/trips/00000000-0000-0000-0000-000000000000",
            headers=auth_headers(free_user),
        )
        assert response.status_code == 404

    async def test_delete_trip(self, client: AsyncClient, free_user: User):
        # Create a trip first
        create = await client.post(
            "/api/trips/",
            json={
                "destination": "Berlin, Germany",
                "start_date": str(date.today() + timedelta(days=20)),
                "end_date": str(date.today() + timedelta(days=25)),
                "accommodation": "hostel",
                "travel_method": "flight",
                "travelers": 1,
            },
            headers=auth_headers(free_user),
        )
        assert create.status_code == 201
        trip_id = create.json()["id"]

        # Delete it
        delete = await client.delete(f"/api/trips/{trip_id}", headers=auth_headers(free_user))
        assert delete.status_code == 204

        # Verify gone
        get = await client.get(f"/api/trips/{trip_id}", headers=auth_headers(free_user))
        assert get.status_code == 404


@pytest.mark.asyncio
class TestPackingAPI:
    async def _create_trip(self, client: AsyncClient, user: User) -> str:
        response = await client.post(
            "/api/trips/",
            json={
                "destination": "Barcelona, Spain",
                "latitude": 41.3851,
                "longitude": 2.1734,
                "start_date": str(date.today() + timedelta(days=45)),
                "end_date": str(date.today() + timedelta(days=52)),
                "accommodation": "airbnb",
                "travel_method": "flight",
                "travelers": 1,
            },
            headers=auth_headers(user),
        )
        return response.json()["id"]

    async def test_generate_packing_list(self, client: AsyncClient, free_user: User):
        trip_id = await self._create_trip(client, free_user)
        response = await client.post(
            f"/api/trips/{trip_id}/packing/generate",
            headers=auth_headers(free_user),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_items"] > 0
        assert len(data["items"]) > 0
        assert len(data["categories"]) > 0

    async def test_toggle_packing_item(self, client: AsyncClient, free_user: User):
        trip_id = await self._create_trip(client, free_user)

        # Generate list first
        await client.post(
            f"/api/trips/{trip_id}/packing/generate",
            headers=auth_headers(free_user),
        )

        # Get an item
        list_resp = await client.get(
            f"/api/trips/{trip_id}/packing/",
            headers=auth_headers(free_user),
        )
        items = list_resp.json()["items"]
        assert len(items) > 0
        item_id = items[0]["id"]

        # Mark as packed
        patch = await client.patch(
            f"/api/trips/{trip_id}/packing/{item_id}",
            json={"packed": True},
            headers=auth_headers(free_user),
        )
        assert patch.status_code == 200
        assert patch.json()["packed"] is True

    async def test_add_custom_item(self, client: AsyncClient, free_user: User):
        trip_id = await self._create_trip(client, free_user)
        response = await client.post(
            f"/api/trips/{trip_id}/packing/",
            json={"category": "Misc", "item_name": "My special item", "quantity": 1, "essential": False},
            headers=auth_headers(free_user),
        )
        assert response.status_code == 201
        assert response.json()["item_name"] == "My special item"
        assert response.json()["source"] == "user_added"
