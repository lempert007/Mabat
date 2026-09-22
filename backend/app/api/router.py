from fastapi import APIRouter

from app.api import attachments, auth, categories, pois, projects, users

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(projects.router)
api_router.include_router(categories.router)
api_router.include_router(pois.router)
api_router.include_router(attachments.router)
