from app.routers.users import router as users_router
from app.routers.trips import router as trips_router
from app.routers.packing import router as packing_router
from app.routers.activities import router as activities_router
from app.routers.weather import router as weather_router

__all__ = [
    "users_router",
    "trips_router",
    "packing_router",
    "activities_router",
    "weather_router",
]
