"""Test fixtures.

The app is built on PostgreSQL features (JSONB, enums), so the tests run against a real
database rather than a substitute. A throwaway database is created for the session and dropped
afterwards. If no server is reachable, the database-backed tests skip rather than fail, so the
pure-logic tests still run anywhere.
"""

import asyncio
import os
import tempfile
from collections.abc import AsyncIterator
from pathlib import Path

import pytest

# Settings are read at import time, so the environment has to be set before the app is imported.
_STORAGE = tempfile.mkdtemp(prefix="mabat-tests-")
os.environ["MABAT_STORAGE_ROOT"] = _STORAGE
os.environ["MABAT_SECRET_KEY"] = "test-secret-long-enough-for-hmac-sha256"
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://mabat:change-me@localhost:5432/mabat")

BASE_URL = os.environ["DATABASE_URL"]
TEST_DATABASE = "mabat_test"
TEST_URL = BASE_URL.rsplit("/", 1)[0] + "/" + TEST_DATABASE
os.environ["DATABASE_URL"] = TEST_URL


async def _server_available() -> bool:
    import asyncpg

    dsn = BASE_URL.replace("postgresql+asyncpg://", "postgresql://").rsplit("/", 1)[0] + "/postgres"
    try:
        connection = await asyncio.wait_for(asyncpg.connect(dsn), timeout=5)
    except Exception:
        return False
    await connection.close()
    return True


async def _recreate_database() -> None:
    """Drop and recreate the throwaway database so every run starts from nothing."""
    import asyncpg

    dsn = BASE_URL.replace("postgresql+asyncpg://", "postgresql://").rsplit("/", 1)[0] + "/postgres"
    connection = await asyncpg.connect(dsn)
    try:
        await connection.execute(f'DROP DATABASE IF EXISTS "{TEST_DATABASE}" WITH (FORCE)')
        await connection.execute(f'CREATE DATABASE "{TEST_DATABASE}"')
    except asyncpg.InsufficientPrivilegeError:
        # Never fall back to the configured database: that is someone's working data.
        pytest.skip(
            f"the database role may not create databases. "
            f"Run: ALTER ROLE <user> CREATEDB;  (or create {TEST_DATABASE} by hand)"
        )
    finally:
        await connection.close()


@pytest.fixture(scope="session")
def database() -> bool:
    """True when a throwaway database is ready; skips the test otherwise."""
    if not asyncio.run(_server_available()):
        pytest.skip("no PostgreSQL server reachable")
    asyncio.run(_recreate_database())

    import app.models  # noqa: F401  registers the tables
    from app.db.base import Base
    from app.db.session import engine

    async def create() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        # Each test runs in its own event loop, and a pooled connection belongs to the loop that
        # opened it. Disposing here keeps a connection from this setup loop out of the pool.
        await engine.dispose()

    asyncio.run(create())
    return True


@pytest.fixture
async def client(database: bool) -> AsyncIterator["httpx.AsyncClient"]:  # noqa: F821
    """An HTTP client wired straight to the app, with a signed-in editor."""
    import httpx

    from app.db.session import SessionLocal
    from app.main import app
    from app.services import users as user_service

    async with SessionLocal() as db:
        if not await user_service.get_by_username(db, "editor"):
            await user_service.create_user(db, "editor", "Editor", "password")

    from app.db.session import engine

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://tests/api") as http:
        await http.post("/auth/login", json={"username": "editor", "password": "password"})
        yield http

    await engine.dispose()


@pytest.fixture
async def guest_client(database: bool) -> AsyncIterator["httpx.AsyncClient"]:  # noqa: F821
    """A client holding a guest session: read everything, change nothing."""
    import httpx

    from app.db.session import engine
    from app.main import app

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://tests/api") as http:
        await http.post("/auth/guest")
        yield http

    await engine.dispose()


@pytest.fixture
async def anonymous_client(database: bool) -> AsyncIterator["httpx.AsyncClient"]:  # noqa: F821
    """A client with no session at all."""
    import httpx

    from app.db.session import engine
    from app.main import app

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://tests/api") as http:
        yield http

    await engine.dispose()


@pytest.fixture
def storage_root() -> Path:
    return Path(_STORAGE)
