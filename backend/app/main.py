"""FastAPI application entrypoint."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.db.session import SessionLocal
from app.services import projects as project_service
from app.services import users as user_service

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("mabat")


async def _ensure_initial_editor() -> None:
    settings = get_settings()
    if not (settings.initial_editor_username and settings.initial_editor_password):
        return
    async with SessionLocal() as db:
        if await user_service.count_users(db) > 0:
            return
        await user_service.create_user(
            db,
            settings.initial_editor_username,
            settings.initial_editor_username.title(),
            settings.initial_editor_password,
        )
        log.info("Created initial editor '%s'", settings.initial_editor_username)


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    settings.projects_root.mkdir(parents=True, exist_ok=True)
    await _ensure_initial_editor()
    async with SessionLocal() as db:
        interrupted = await project_service.fail_interrupted_processing(db)
    if interrupted:
        log.warning("Marked %d interrupted conversion(s) as failed", interrupted)
    yield


app = FastAPI(title="Mabat API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)


@app.get("/api/health", tags=["meta"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
