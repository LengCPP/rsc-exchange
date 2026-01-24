import uuid
import json
from typing import Any, Annotated

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from sqlmodel import func, select, col, or_

from app.api.deps import CurrentUser, SessionDep
from app.storage import upload_image, delete_image
from app.search import sync_item_to_search, delete_item_from_search
from app.models import (
    Item,
    ItemCreate,
    ItemPublic,
    ItemsPublic,
    ItemUpdate,
    ItemType,
    Message,
    Friendship,
    FriendshipStatus,
    ItemOwnerPublic,
    UserItem,
    Loan,
    LoanStatus,
)

router = APIRouter(prefix="/items", tags=["items"])


def check_item_availability(session: SessionDep, item_id: uuid.UUID) -> bool:
    """
    Check if an item is available (not currently loaned out).
    """
    active_loan = session.exec(
        select(Loan).where(
            Loan.item_id == item_id,
            Loan.status == LoanStatus.ACTIVE
        )
    ).first()
    return active_loan is None


@router.get("/", response_model=ItemsPublic)
def read_items(
    session: SessionDep, 
    current_user: CurrentUser, 
    skip: int = 0, 
    limit: int = 100,
    owner_id: uuid.UUID | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    exclude_collections: bool = False
) -> Any:
    """
    Retrieve items.
    """
    
    if owner_id:
        all_visible_user_ids = [owner_id]
    else:
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

    # Get distinct item IDs first
    item_ids_query = (
        select(Item.id)
        .join(UserItem)
        .where(UserItem.user_id.in_(all_visible_user_ids))
    )

    if exclude_collections:
        from app.models import CollectionItem, Collection
        # Subquery for items that ARE in a collection owned by any of the visible users
        in_collections_stmt = (
            select(CollectionItem.item_id)
            .join(Collection)
            .where(Collection.owner_id.in_(all_visible_user_ids))
        )
        item_ids_query = item_ids_query.where(Item.id.not_in(in_collections_stmt))

    item_ids = session.exec(item_ids_query).all()
    unique_item_ids = list(set(item_ids))
    count = len(unique_item_ids)

    # Fetch actual items with pagination and sorting
    items_query = select(Item).where(Item.id.in_(unique_item_ids))
    
    # Apply sorting
    sort_column = Item.created_at
    if sort_by == "title":
        sort_column = Item.title
        
    if sort_order == "desc":
        items_query = items_query.order_by(sort_column.desc())
    else:
        items_query = items_query.order_by(sort_column.asc())

    items = session.exec(items_query.offset(skip).limit(limit)).all()
    
    public_items = []
    for item in items:
        owners_public = [
            ItemOwnerPublic(id=owner.id, full_name=owner.full_name, email=owner.email)
            for owner in item.owners
        ]
        
        is_available = check_item_availability(session, item.id)
        
        public_items.append(
            ItemPublic(
                id=item.id,
                title=item.title,
                description=item.description,
                item_type=item.item_type,
                image_url=item.image_url,
                extra_data=item.extra_data,
                count=item.count,
                owners=owners_public,
                created_at=item.created_at,
                is_available=is_available
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
    
    is_available = check_item_availability(session, item.id)
    
    return ItemPublic(
        id=item.id,
        title=item.title,
        description=item.description,
        item_type=item.item_type,
        image_url=item.image_url,
        extra_data=item.extra_data,
        count=item.count,
        owners=owners_public,
        created_at=item.created_at,
        is_available=is_available
    )


@router.post("/", response_model=ItemPublic)
async def create_item(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    title: Annotated[str, Form()],
    description: Annotated[str | None, Form()] = None,
    item_type: Annotated[str, Form()] = "general",
    extra_data: Annotated[str | None, Form()] = None,
    image: Annotated[UploadFile | None, File()] = None,
    image_url: Annotated[str | None, Form()] = None,
) -> Any:
    """
    Create new item. If item with same title exists, connect user to it and increment count.
    """
    
    final_image_url = image_url
    if image:
        contents = await image.read()
        final_image_url = await upload_image(contents, image.filename)

    extra_data_dict = {}
    if extra_data:
        try:
            extra_data_dict = json.loads(extra_data)
        except json.JSONDecodeError:
            pass

    # Avoid enum casing issues in query by using lowercase string
    item_type_val = item_type.lower()

    existing_item = session.exec(
        select(Item).where(
            Item.title == title,
            Item.item_type == item_type_val
        )
    ).first()
    
    if existing_item:
        item = existing_item
        if current_user not in item.owners:
            item.owners.append(current_user)
            item.count += 1
            # Update image if existing item doesn't have one and new one is provided
            if not item.image_url and final_image_url:
                item.image_url = final_image_url
            session.add(item)
            session.commit()
            session.refresh(item)
            sync_item_to_search(item)
    else:
        item = Item(
            title=title,
            description=description,
            item_type=ItemType(item_type_val),
            extra_data=extra_data_dict,
            image_url=final_image_url,
            count=1
        )
        item.owners.append(current_user)
        session.add(item)
        session.commit()
        session.refresh(item)
        sync_item_to_search(item)

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
        owners=owners_public,
        created_at=item.created_at,
        is_available=True
    )


@router.put("/{id}", response_model=ItemPublic)
async def update_item(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    title: Annotated[str | None, Form()] = None,
    description: Annotated[str | None, Form()] = None,
    item_type: Annotated[str | None, Form()] = None,
    extra_data: Annotated[str | None, Form()] = None,
    image: Annotated[UploadFile | None, File()] = None,
    image_url: Annotated[str | None, Form()] = None,
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
        
    if title is not None:
        item.title = title
    if description is not None:
        item.description = description
    if item_type is not None:
        item.item_type = ItemType(item_type.lower())
    if extra_data is not None:
        try:
            item.extra_data = json.loads(extra_data)
        except json.JSONDecodeError:
            pass
    
    if image_url is not None:
        item.image_url = image_url

    if image:
        contents = await image.read()
        final_image_url = await upload_image(contents, image.filename)
        if final_image_url:
            item.image_url = final_image_url

    session.add(item)
    session.commit()
    session.refresh(item)
    sync_item_to_search(item)
    
    owners_public = [
        ItemOwnerPublic(id=owner.id, full_name=owner.full_name, email=owner.email)
        for owner in item.owners
    ]
    
    is_available = check_item_availability(session, item.id)
    
    return ItemPublic(
        id=item.id,
        title=item.title,
        description=item.description,
        item_type=item.item_type,
        image_url=item.image_url,
        extra_data=item.extra_data,
        count=item.count,
        owners=owners_public,
        created_at=item.created_at,
        is_available=is_available
    )


@router.delete("/{id}")
async def delete_item(
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
            if item.image_url:
                await delete_image(item.image_url)
            session.delete(item)
            delete_item_from_search(id)
        else:
            session.add(item)
            
        session.commit()
    
    return Message(message="Item ownership removed successfully")
