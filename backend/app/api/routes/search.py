from typing import Any

from fastapi import APIRouter
from sqlmodel import col, select

from app.api.deps import CurrentUser, SessionDep
from app.models import Community, Item, SearchResults, User

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/", response_model=SearchResults)
def search(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    q: str,
    limit: int = 10,
) -> Any:
    """
    Search for users, items, and communities.
    """
    # Search Users by public_id (exact or partial)
    user_statement = (
        select(User)
        .where(col(User.public_id).ilike(f"%{q}%"))
        .limit(limit)
    )
    users = session.exec(user_statement).all()

    # Search Items by name (partial matching)
    # If superuser, search all items. Otherwise, search only owned items? 
    # The requirement says "items by name", usually search engine on dashboard implies global search if it's a marketplace-like app.
    # Looking at items.py, read_items filters by owner_id for non-superusers.
    # However, if it's a "search engine", maybe it should be global?
    # Given the previous context was about communities and friends, it might be a social/exchange app.
    # Let's assume global search for items if it's meant to be a search engine.
    item_statement = (
        select(Item)
        .where(col(Item.title).ilike(f"%{q}%"))
        .limit(limit)
    )
    items = session.exec(item_statement).all()

    # Search Communities by name (partial matching)
    community_statement = (
        select(Community)
        .where(col(Community.name).ilike(f"%{q}%"))
        .limit(limit)
    )
    communities = session.exec(community_statement).all()

    return SearchResults(
        users=users,
        items=items,
        communities=communities,
    )
