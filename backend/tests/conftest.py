import os

os.environ.setdefault("ENVIRONMENT", "test")

import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.db.database import Base, get_db
from app.models.user import User, SubscriptionTier
from app.middleware.auth import hash_password

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine):
    Session = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as session:
        try:
            yield session
        finally:
            await session.rollback()
            for table in reversed(Base.metadata.sorted_tables):
                await session.execute(table.delete())
            await session.commit()


@pytest_asyncio.fixture
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def free_user(db_session) -> User:
    user = User(
        email="free@test.com",
        password_hash=hash_password("testpassword"),
        display_name="Free User",
        subscription=SubscriptionTier.free,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def premium_user(db_session) -> User:
    user = User(
        email="premium@test.com",
        password_hash=hash_password("testpassword"),
        display_name="Premium User",
        subscription=SubscriptionTier.premium,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user
