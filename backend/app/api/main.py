from fastapi import APIRouter

from app.api.routes import communities, friends, interests, items, login, private, search, users, utils
from app.core.config import settings

api_router = APIRouter()
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)
api_router.include_router(communities.router, prefix="/communities", tags=["communities"])
api_router.include_router(friends.router, prefix="/friends", tags=["friends"])
api_router.include_router(search.router)
api_router.include_router(interests.router)


if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
