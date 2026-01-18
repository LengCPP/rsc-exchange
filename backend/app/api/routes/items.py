import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select, col, or_

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Item,
    ItemCreate,
    ItemPublic,
    ItemsPublic,
    ItemUpdate,
    Message,
    Friendship,
    FriendshipStatus,
    ItemOwnerPublic,
    UserItem,
)

router = APIRouter(prefix="/items", tags=["items"])


@router.get("/", response_model=ItemsPublic)
def read_items(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve items.
    """
    
    friends_stmt = select(Friendship.friend_id).where(
        Friendship.user_id == current_user.id,
        Friendship.status == FriendshipStatus.ACCEPTED
    )
    friend_ids = session.exec(friends_stmt).all()
    
    friends_stmt_2 = select(Friendship.user_id).where(
        Friendship.friend_id == current_user.id,
        Friendship.status == FriendshipStatus.ACCEPTED
    )
    friend_ids_2 = session.exec(friends_stmt_2).all()
    
    all_visible_user_ids = list(set([current_user.id] + list(friend_ids) + list(friend_ids_2)))

    query = (
        select(Item)
        .join(UserItem)
        .where(UserItem.user_id.in_(all_visible_user_ids))
        .distinct()
    )
    
    items_all = session.exec(query).all()
    count = len(items_all)
    
    items = session.exec(query.offset(skip).limit(limit)).all()
    
    public_items = []
    for item in items:
        owners_public = [
            ItemOwnerPublic(id=owner.id, full_name=owner.full_name, email=owner.email)
            for owner in item.owners
        ]
        public_items.append(
            ItemPublic(
                id=item.id,
                title=item.title,
                description=item.description,
                item_type=item.item_type,
                image_url=item.image_url,
                extra_data=item.extra_data,
                count=item.count,
                owners=owners_public
            )
        )

    return ItemsPublic(data=public_items, count=count)


@router.get("/{id}", response_model=ItemPublic)
def read_item(session: SessionDep, current_user: CurrentUser, id: uuid.UUID) -> Any:
    """
    Get item by ID.
    """
    item = session.get(Item, id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    owner_ids = [o.id for o in item.owners]
    
    if current_user.is_superuser or current_user.id in owner_ids:
        pass 
    else:
        stmt = select(Friendship).where(
            (
                (Friendship.user_id == current_user.id) & 
                (Friendship.friend_id.in_(owner_ids)) & 
                (Friendship.status == FriendshipStatus.ACCEPTED)
            ) | (
                (Friendship.user_id.in_(owner_ids)) & 
                (Friendship.friend_id == current_user.id) & 
                (Friendship.status == FriendshipStatus.ACCEPTED)
            )
        )
        friendship = session.exec(stmt).first()
        
        if not friendship:
             raise HTTPException(status_code=400, detail="Not enough permissions (Not a friend of owner)")

    owners_public = [
        ItemOwnerPublic(id=owner.id, full_name=owner.full_name, email=owner.email)
        for owner in item.owners
    ]
    return ItemPublic(
        id=item.id,
        title=item.title,
        description=item.description,
        item_type=item.item_type,
        image_url=item.image_url,
        extra_data=item.extra_data,
        count=item.count,
        owners=owners_public
    )


@router.post("/", response_model=ItemPublic)
def create_item(
    *, session: SessionDep, current_user: CurrentUser, item_in: ItemCreate
) -> Any:
    """
    Create new item. If item with same title exists, connect user to it and increment count.
    """
    
    existing_item = session.exec(
        select(Item).where(
            Item.title == item_in.title,
            Item.item_type == item_in.item_type
        )
    ).first()
    
    if existing_item:
        item = existing_item
        if current_user not in item.owners:
            item.owners.append(current_user)
            item.count += 1
            session.add(item)
            session.commit()
            session.refresh(item)
    else:
        item = Item(
            **item_in.model_dump(),
            count=1
        )
        item.owners.append(current_user)
        session.add(item)
        session.commit()
        session.refresh(item)

    owners_public = [
        ItemOwnerPublic(id=owner.id, full_name=owner.full_name, email=owner.email)
        for owner in item.owners
    ]
    return ItemPublic(
        id=item.id,
        title=item.title,
        description=item.description,
        item_type=item.item_type,
        image_url=item.image_url,
        extra_data=item.extra_data,
        count=item.count,
        owners=owners_public
    )


@router.put("/{id}", response_model=ItemPublic)
def update_item(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    item_in: ItemUpdate,
) -> Any:
    """
    Update an item.
    """
    item = session.get(Item, id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    owner_ids = [o.id for o in item.owners]
    if not current_user.is_superuser and (current_user.id not in owner_ids):
        raise HTTPException(status_code=400, detail="Not enough permissions")
        
    update_dict = item_in.model_dump(exclude_unset=True)
    item.sqlmodel_update(update_dict)
    session.add(item)
    session.commit()
    session.refresh(item)
    
    owners_public = [
        ItemOwnerPublic(id=owner.id, full_name=owner.full_name, email=owner.email)
        for owner in item.owners
    ]
    return ItemPublic(
        id=item.id,
        title=item.title,
        description=item.description,
        item_type=item.item_type,
        image_url=item.image_url,
        extra_data=item.extra_data,
        count=item.count,
        owners=owners_public
    )


@router.delete("/{id}")
def delete_item(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Message:
    """
    Delete an item (or remove ownership).
    """
    item = session.get(Item, id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    if not current_user.is_superuser and (current_user not in item.owners):
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    if current_user in item.owners:
        item.owners.remove(current_user)
        item.count = max(0, item.count - 1)
        
        if not item.owners:
            session.delete(item)
        else:
            session.add(item)
            
        session.commit()
    
    return Message(message="Item ownership removed successfully")
