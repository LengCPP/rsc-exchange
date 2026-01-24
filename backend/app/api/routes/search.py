from typing import Any
import uuid

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
    CommunityMember,
    CommunityMemberStatus,
    UserItem,
    CollectionItem,
    ItemPublic,
    ItemOwnerPublic,
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
    
    # Define the user's "globe"
    # 1. Direct friends
    friends_stmt = select(Friendship.friend_id).where(
        Friendship.user_id == current_user.id,
        Friendship.status == FriendshipStatus.ACCEPTED
    )
    friend_ids = set(session.exec(friends_stmt).all())
    
    # 2. Communities I am in
    my_communities_stmt = select(CommunityMember.community_id).where(
        CommunityMember.user_id == current_user.id,
        CommunityMember.status == CommunityMemberStatus.ACCEPTED
    )
    my_community_ids = set(session.exec(my_communities_stmt).all())
    
    # 3. Communities my friends are in
    friend_communities_stmt = select(CommunityMember.community_id).where(
        CommunityMember.user_id.in_(list(friend_ids)),
        CommunityMember.status == CommunityMemberStatus.ACCEPTED
    )
    friend_community_ids = set(session.exec(friend_communities_stmt).all())
    
    all_globe_community_ids = list(my_community_ids | friend_community_ids)
    
    # 4. All users in these globe communities
    globe_users_in_comms_stmt = select(CommunityMember.user_id).where(
        CommunityMember.community_id.in_(all_globe_community_ids),
        CommunityMember.status == CommunityMemberStatus.ACCEPTED
    )
    globe_users_in_comms = set(session.exec(globe_users_in_comms_stmt).all())
    
    # Final set of user IDs in the "globe"
    globe_user_ids = globe_users_in_comms | friend_ids | {current_user.id}

    # 1. Search Users
    user_ids_to_fetch = set()
    
    normalized_q = q.lower().strip()
    # Case A: Accurate match by public_id (Global)
    exact_user = session.exec(
        select(User).where(User.public_id == normalized_q)
    ).first()
    
    if not exact_user and not normalized_q.startswith("u-"):
        exact_user = session.exec(
            select(User).where(User.public_id == f"u-{normalized_q}")
        ).first()
        
    if exact_user:
        user_ids_to_fetch.add(exact_user.id)

    # Case B: Search by name (ONLY if in the globe)
    globe_name_users_stmt = (
        select(User.id)
        .where(
            User.id.in_(list(globe_user_ids)),
            col(User.full_name).ilike(f"%{q}%"),
            User.id != current_user.id
        )
    )
    globe_name_user_ids = session.exec(globe_name_users_stmt).all()
    for uid in globe_name_user_ids:
        user_ids_to_fetch.add(uid)

    users = []
    if user_ids_to_fetch:
        users = session.exec(
            select(User).where(User.id.in_(list(user_ids_to_fetch))).limit(limit)
        ).all()

    # Get friendship statuses for found users
    found_user_ids = [u.id for u in users]
    friendship_map = {}
    if found_user_ids:
        friendships = session.exec(
            select(Friendship).where(
                Friendship.user_id == current_user.id,
                Friendship.friend_id.in_(found_user_ids)
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
    meili_items_raw = []
    try:
        item_index = meili_client.index("items")
        search_res = item_index.search(q, {
            "limit": limit * 2, # Fetch slightly more
            "attributesToSearchOn": ["title", "author", "description"]
        })
        item_ids = [hit["id"] for hit in search_res["hits"]]
        
        if item_ids:
            # Fetch items that are in the globe
            stmt = (
                select(Item)
                .join(UserItem)
                .where(
                    Item.id.in_(item_ids),
                    UserItem.user_id.in_(list(globe_user_ids))
                )
                .limit(limit)
            )
            meili_items_raw = session.exec(stmt).all()
            
            # Sort back by meili relevance
            id_to_item = {str(item.id): item for item in meili_items_raw}
            meili_items_raw = [id_to_item[id_str] for id_str in item_ids if id_str in id_to_item][:limit]
            
    except Exception:
        # Fallback to SQL
        item_statement = (
            select(Item)
            .join(UserItem)
            .where(
                col(Item.title).ilike(f"%{q}%"),
                UserItem.user_id.in_(list(globe_user_ids))
            )
            .limit(limit)
        )
        meili_items_raw = session.exec(item_statement).all()

    # Convert raw items to ItemPublic and add collection info
    items_public = []
    for item in meili_items_raw:
        item_pub = ItemPublic.model_validate(item)
        item_pub.owners = [
            ItemOwnerPublic(id=owner.id, full_name=owner.full_name, email=owner.email)
            for owner in item.owners
        ]
        
        # Check for collection
        collection_link = session.exec(
            select(CollectionItem).where(CollectionItem.item_id == item.id)
        ).first()
        if collection_link:
            item_pub.collection_id = collection_link.collection_id
            
        items_public.append(item_pub)

    # 3. Search Communities using Meilisearch (Expansion: Global search)
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
        # Fallback to SQL
        community_statement = select(Community).where(col(Community.name).ilike(f"%{q}%")).limit(limit)
        meili_communities = session.exec(community_statement).all()

    return SearchResults(
        users=users_public,
        items=items_public,
        communities=meili_communities,
    )
