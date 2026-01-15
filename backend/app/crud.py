import uuid
from typing import Any

from sqlmodel import Session, select

from app.core.security import get_password_hash, verify_password
from app.models import (
    Community,
    CommunityCreate,
    CommunityMember,
    CommunityMemberRole,
    Friendship,
    FriendshipStatus,
    Item,
    ItemCreate,
    User,
    UserCreate,
    UserUpdate,
)
from app.utils import generate_unique_id


def create_user(*, session: Session, user_create: UserCreate) -> User:
    public_id = generate_unique_id("u", session, User)
    db_obj = User.model_validate(
        user_create,
        update={
            "hashed_password": get_password_hash(user_create.password),
            "public_id": public_id,
        },
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def update_user(*, session: Session, db_user: User, user_in: UserUpdate) -> Any:
    user_data = user_in.model_dump(exclude_unset=True)
    extra_data = {}
    if "password" in user_data:
        password = user_data["password"]
        hashed_password = get_password_hash(password)
        extra_data["hashed_password"] = hashed_password
    db_user.sqlmodel_update(user_data, update=extra_data)
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    return db_user


def get_user_by_email(*, session: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email)
    session_user = session.exec(statement).first()
    return session_user


def authenticate(*, session: Session, email: str, password: str) -> User | None:
    db_user = get_user_by_email(session=session, email=email)
    if not db_user:
        return None
    if not verify_password(password, db_user.hashed_password):
        return None
    return db_user


def create_item(*, session: Session, item_in: ItemCreate, owner_id: uuid.UUID) -> Item:
    db_item = Item.model_validate(item_in, update={"owner_id": owner_id})
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item


def create_community(
    *, session: Session, community_in: CommunityCreate, creator_id: uuid.UUID
) -> Community:
    db_community = Community.model_validate(
        community_in, update={"created_by": creator_id}
    )
    session.add(db_community)
    session.commit()
    session.refresh(db_community)

    # Add creator as ADMIN member
    membership = CommunityMember(
        community_id=db_community.id, user_id=creator_id, role=CommunityMemberRole.ADMIN
    )
    session.add(membership)
    session.commit()

    return db_community


def join_community(
    *, session: Session, community_id: uuid.UUID, user_id: uuid.UUID
) -> CommunityMember:
    membership = CommunityMember(community_id=community_id, user_id=user_id)
    session.add(membership)
    session.commit()
    session.refresh(membership)
    return membership


def leave_community(*, session: Session, community_id: uuid.UUID, user_id: uuid.UUID):
    statement = select(CommunityMember).where(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == user_id,
    )
    membership = session.exec(statement).first()
    if membership:
        session.delete(membership)
        session.commit()


def create_friend_request(
    *, session: Session, user_id: uuid.UUID, friend_id: uuid.UUID
) -> Friendship:
    friendship = Friendship(user_id=user_id, friend_id=friend_id)
    session.add(friendship)
    session.commit()
    session.refresh(friendship)
    return friendship


def accept_friend_request(
    *, session: Session, user_id: uuid.UUID, friend_id: uuid.UUID
) -> Friendship | None:
    statement = select(Friendship).where(
        Friendship.user_id == user_id, Friendship.friend_id == friend_id
    )
    friendship = session.exec(statement).first()
    if friendship:
        friendship.status = FriendshipStatus.ACCEPTED
        session.add(friendship)

        # Also create the reverse friendship for easy querying
        reverse_friendship = Friendship(
            user_id=friend_id, friend_id=user_id, status=FriendshipStatus.ACCEPTED
        )
        session.add(reverse_friendship)

        session.commit()
        session.refresh(friendship)
    return friendship
