from typing import Any

from fastapi import APIRouter
from sqlmodel import col, select

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Community,
    Friendship,
    FriendshipStatus,
    Item,
    SearchResults,
    User,
    UserPublic,
)

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

    # Get friendship statuses for found users
    user_ids = [u.id for u in users]
    friendship_map = {}
    if user_ids:
        friendships = session.exec(
            select(Friendship).where(
                Friendship.user_id == current_user.id,
                Friendship.friend_id.in_(user_ids)
            )
        ).all()
        friendship_map = {f.friend_id: f.status for f in friendships}

    users_public = []
    for user in users:
        u_pub = UserPublic.model_validate(user)
        status = friendship_map.get(user.id)
        u_pub.friendship_status = status
        
        # Restrict data if not friends
        if user.id != current_user.id and status != FriendshipStatus.ACCEPTED:
            u_pub.communities = []
            u_pub.interests = []
            
        users_public.append(u_pub)

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
        users=users_public,
        items=items,
        communities=communities,
    )
