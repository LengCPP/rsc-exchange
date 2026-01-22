from typing import Any

from fastapi import APIRouter
from sqlmodel import col, select

from app.api.deps import CurrentUser, SessionDep
from app.search import client as meili_client
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
    from app.models import CommunityMember
    
    # 1. Search Users
    # Case A: Accurate match by public_id (Global)
    user_ids_to_fetch = set()
    
    normalized_q = q.lower().strip()
    # Try exact match with given input
    exact_user = session.exec(
        select(User).where(User.public_id == normalized_q)
    ).first()
    
    # Try adding prefix if not present
    if not exact_user and not normalized_q.startswith("u-"):
        exact_user = session.exec(
            select(User).where(User.public_id == f"u-{normalized_q}")
        ).first()
        
    if exact_user:
        user_ids_to_fetch.add(exact_user.id)

    # Case B: Search by name (ONLY if in same community)
    # Find communities the current user is in
    my_communities_stmt = select(CommunityMember.community_id).where(
        CommunityMember.user_id == current_user.id
    )
    my_community_ids = session.exec(my_communities_stmt).all()
    
    if my_community_ids:
        # Find users in those same communities whose name matches
        same_comm_users_stmt = (
            select(User.id)
            .join(CommunityMember, User.id == CommunityMember.user_id)
            .where(
                CommunityMember.community_id.in_(my_community_ids),
                col(User.full_name).ilike(f"%{q}%"),
                User.id != current_user.id
            )
        )
        same_comm_user_ids = session.exec(same_comm_users_stmt).all()
        for uid in same_comm_user_ids:
            user_ids_to_fetch.add(uid)

    users = []
    if user_ids_to_fetch:
        users = session.exec(
            select(User).where(User.id.in_(list(user_ids_to_fetch))).limit(limit)
        ).all()

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

    # 2. Search Items using Meilisearch
    meili_items = []
    try:
        item_index = meili_client.index("items")
        # matchingStrategy: 'all' ensures better precision, but 'last' can be more permissive.
        # We'll use default but rely on the improved typo tolerance settings.
        search_res = item_index.search(q, {
            "limit": limit,
            "attributesToSearchOn": ["title", "author", "description"]
        })
        item_ids = [hit["id"] for hit in search_res["hits"]]
        if item_ids:
            meili_items = session.exec(
                select(Item).where(col(Item.id).in_(item_ids))
            ).all()
            # Sort results back to match Meilisearch relevance
            id_to_item = {str(item.id): item for item in meili_items}
            meili_items = [id_to_item[id_str] for id_str in item_ids if id_str in id_to_item]
    except Exception:
        # Fallback to SQL if Meilisearch fails
        item_statement = select(Item).where(col(Item.title).ilike(f"%{q}%")).limit(limit)
        meili_items = session.exec(item_statement).all()

    # 3. Search Communities using Meilisearch
    meili_communities = []
    try:
        comm_index = meili_client.index("communities")
        search_res = comm_index.search(q, {
            "limit": limit,
            "attributesToSearchOn": ["name", "description"]
        })
        comm_ids = [hit["id"] for hit in search_res["hits"]]
        if comm_ids:
            meili_communities = session.exec(
                select(Community).where(col(Community.id).in_(comm_ids))
            ).all()
            # Sort results back to match Meilisearch relevance
            id_to_comm = {str(c.id): c for c in meili_communities}
            meili_communities = [id_to_comm[id_str] for id_str in comm_ids if id_str in id_to_comm]
    except Exception:
        # Fallback to SQL if Meilisearch fails
        community_statement = select(Community).where(col(Community.name).ilike(f"%{q}%")).limit(limit)
        meili_communities = session.exec(community_statement).all()

    return SearchResults(
        users=users_public,
        items=meili_items,
        communities=meili_communities,
    )
