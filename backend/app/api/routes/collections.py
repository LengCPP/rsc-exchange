import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func

from app.api.deps import get_current_active_superuser, get_current_user, get_db
from app.models import (
    Collection,
    CollectionCreate,
    CollectionPublic,
    CollectionUpdate,
    CollectionsPublic,
    Message,
    User,
)
from app import crud

router = APIRouter()


@router.get("/", response_model=CollectionsPublic)
def read_collections(
    session: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    owner_id: uuid.UUID | None = None,
) -> Any:
    """
    Retrieve collections.
    """
    target_owner_id = owner_id or current_user.id
    
    # Permission check: If not me, check if friend
    if target_owner_id != current_user.id:
        from app.models import Friendship, FriendshipStatus
        is_friend = session.exec(
            select(Friendship).where(
                ((Friendship.user_id == current_user.id) & (Friendship.friend_id == target_owner_id)) |
                ((Friendship.user_id == target_owner_id) & (Friendship.friend_id == current_user.id)),
                Friendship.status == FriendshipStatus.ACCEPTED
            )
        ).first()
        if not is_friend and not current_user.is_superuser:
            raise HTTPException(status_code=403, detail="Not enough permissions to view this user's collections")

    count_statement = (
        select(func.count())
        .select_from(Collection)
        .where(Collection.owner_id == target_owner_id)
    )
    count = session.exec(count_statement).one()
    
    statement = (
        select(Collection)
        .where(Collection.owner_id == target_owner_id)
        .offset(skip)
        .limit(limit)
    )
    collections = session.exec(statement).all()

    return CollectionsPublic(data=collections, count=count)


@router.post("/", response_model=CollectionPublic)
def create_collection(
    *,
    session: Session = Depends(get_db),
    collection_in: CollectionCreate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Create new collection.
    """
    collection = crud.create_collection(
        session=session, collection_in=collection_in, owner_id=current_user.id
    )
    return collection


@router.get("/{id}", response_model=CollectionPublic)
def read_collection(
    *,
    session: Session = Depends(get_db),
    id: uuid.UUID,
) -> Any:
    """
    Get collection by ID.
    """
    collection = session.get(Collection, id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    return collection


@router.patch("/{id}", response_model=CollectionPublic)
def update_collection(
    *,
    session: Session = Depends(get_db),
    id: uuid.UUID,
    collection_in: CollectionUpdate,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Update a collection.
    """
    collection = session.get(Collection, id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    if collection.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    collection = crud.update_collection(
        session=session, db_collection=collection, collection_in=collection_in
    )
    return collection


@router.delete("/{id}")
def delete_collection(
    *,
    session: Session = Depends(get_db),
    id: uuid.UUID,
    current_user: User = Depends(get_current_user),
) -> Message:
    """
    Delete a collection.
    """
    collection = session.get(Collection, id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    if collection.owner_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    crud.delete_collection(session=session, collection_id=id)
    return Message(message="Collection deleted successfully")


@router.post("/{id}/items/{item_id}", response_model=Message)
def add_item_to_collection(
    *,
    session: Session = Depends(get_db),
    id: uuid.UUID,
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Add an item to a collection.
    """
    collection = session.get(Collection, id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    if collection.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Check if item is already in ANY collection
    from app.models import CollectionItem
    existing_link = session.exec(
        select(CollectionItem).where(CollectionItem.item_id == item_id)
    ).first()
    if existing_link:
        raise HTTPException(status_code=400, detail="Item is already in a collection")

    crud.add_item_to_collection(session=session, collection_id=id, item_id=item_id)
    return Message(message="Item added to collection")


@router.delete("/{id}/items/{item_id}", response_model=Message)
def remove_item_from_collection(
    *,
    session: Session = Depends(get_db),
    id: uuid.UUID,
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
) -> Any:
    """
    Remove an item from a collection.
    """
    collection = session.get(Collection, id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    if collection.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    crud.remove_item_from_collection(session=session, collection_id=id, item_id=item_id)
    return Message(message="Item removed from collection")
