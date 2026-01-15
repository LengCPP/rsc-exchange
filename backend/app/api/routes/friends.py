import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select, or_

from app import crud
from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Friendship,
    FriendshipPublic,
    FriendshipStatus,
    Message,
    User,
    UsersPublic,
)

router = APIRouter()


@router.get("/", response_model=UsersPublic)
def read_friends(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve friends.
    """
    statement = (
        select(User)
        .join(Friendship, User.id == Friendship.friend_id)
        .where(
            Friendship.user_id == current_user.id,
            Friendship.status == FriendshipStatus.ACCEPTED,
        )
    )
    count_statement = (
        select(func.count())
        .select_from(Friendship)
        .where(
            Friendship.user_id == current_user.id,
            Friendship.status == FriendshipStatus.ACCEPTED,
        )
    )
    
    count = session.exec(count_statement).one()
    friends = session.exec(statement.offset(skip).limit(limit)).all()

    return UsersPublic(data=friends, count=count)


@router.get("/requests", response_model=UsersPublic)
def read_friend_requests(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve pending friend requests sent to current user.
    """
    statement = (
        select(User)
        .join(Friendship, User.id == Friendship.user_id)
        .where(
            Friendship.friend_id == current_user.id,
            Friendship.status == FriendshipStatus.PENDING,
        )
    )
    count_statement = (
        select(func.count())
        .select_from(Friendship)
        .where(
            Friendship.friend_id == current_user.id,
            Friendship.status == FriendshipStatus.PENDING,
        )
    )
    
    count = session.exec(count_statement).one()
    users = session.exec(statement.offset(skip).limit(limit)).all()

    return UsersPublic(data=users, count=count)


@router.post("/request/{friend_id}", response_model=Message)
def create_friend_request(
    *, session: SessionDep, current_user: CurrentUser, friend_id: uuid.UUID
) -> Any:
    """
    Send a friend request.
    """
    if current_user.id == friend_id:
        raise HTTPException(status_code=400, detail="Cannot friend yourself")
    
    # Check if already friends or request exists
    statement = select(Friendship).where(
        Friendship.user_id == current_user.id,
        Friendship.friend_id == friend_id
    )
    existing = session.exec(statement).first()
    if existing:
        raise HTTPException(status_code=400, detail="Friendship already exists or request pending")
    
    crud.create_friend_request(session=session, user_id=current_user.id, friend_id=friend_id)
    return Message(message="Friend request sent")


@router.post("/accept/{friend_id}", response_model=Message)
def accept_friend_request(
    *, session: SessionDep, current_user: CurrentUser, friend_id: uuid.UUID
) -> Any:
    """
    Accept a friend request.
    """
    friendship = crud.accept_friend_request(session=session, user_id=friend_id, friend_id=current_user.id)
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    return Message(message="Friend request accepted")


@router.delete("/{friend_id}", response_model=Message)
def remove_friend(
    *, session: SessionDep, current_user: CurrentUser, friend_id: uuid.UUID
) -> Any:
    """
    Remove a friend or decline a request.
    """
    statement = select(Friendship).where(
        or_(
            (Friendship.user_id == current_user.id) & (Friendship.friend_id == friend_id),
            (Friendship.user_id == friend_id) & (Friendship.friend_id == current_user.id)
        )
    )
    friendships = session.exec(statement).all()
    if not friendships:
        raise HTTPException(status_code=404, detail="Friendship not found")
    
    for f in friendships:
        session.delete(f)
    session.commit()
    
    return Message(message="Friend removed")
