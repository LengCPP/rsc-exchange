import uuid
from typing import Any

from sqlmodel import Session, select

from app.core.security import get_password_hash, verify_password
from app.models import (
    BookCreate,
    Collection,
    CollectionCreate,
    CollectionItem,
    CollectionUpdate,
    Community,
    CommunityCreate,
    CommunityMember,
    CommunityMemberRole,
    CommunityMemberStatus,
    Friendship,
    FriendshipStatus,
    Item,
    ItemCreate,
    Notification,
    NotificationType,
    User,
    UserCreate,
    UserProfile,
    UserUpdate,
)
from app.utils import generate_unique_id
from app.search import (
    sync_book_to_search,
    delete_book_from_search,
    sync_item_to_search,
    delete_item_from_search,
    sync_community_to_search,
    delete_community_from_search
)


def create_collection(
    *, session: Session, collection_in: CollectionCreate, owner_id: uuid.UUID
) -> Collection:
    db_collection = Collection.model_validate(
        collection_in, update={"owner_id": owner_id}
    )
    session.add(db_collection)
    session.commit()
    session.refresh(db_collection)
    return db_collection


def update_collection(
    *, session: Session, db_collection: Collection, collection_in: CollectionUpdate
) -> Collection:
    collection_data = collection_in.model_dump(exclude_unset=True)
    db_collection.sqlmodel_update(collection_data)
    session.add(db_collection)
    session.commit()
    session.refresh(db_collection)
    return db_collection


def delete_collection(*, session: Session, collection_id: uuid.UUID) -> None:
    db_collection = session.get(Collection, collection_id)
    if db_collection:
        session.delete(db_collection)
        session.commit()


def add_item_to_collection(
    *, session: Session, collection_id: uuid.UUID, item_id: uuid.UUID
) -> CollectionItem:
    db_obj = CollectionItem(collection_id=collection_id, item_id=item_id)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


def remove_item_from_collection(
    *, session: Session, collection_id: uuid.UUID, item_id: uuid.UUID
) -> None:
    statement = select(CollectionItem).where(
        CollectionItem.collection_id == collection_id,
        CollectionItem.item_id == item_id,
    )
    db_obj = session.exec(statement).first()
    if db_obj:
        session.delete(db_obj)
        session.commit()


def create_notification(    *,
    session: Session,
    recipient_id: uuid.UUID,
    title: str,
    message: str,
    type: NotificationType = NotificationType.INFO,
    link: str | None = None,
) -> Notification:
    db_notification = Notification(
        recipient_id=recipient_id,
        title=title,
        message=message,
        type=type,
        link=link,
    )
    session.add(db_notification)
    session.commit()
    session.refresh(db_notification)
    return db_notification


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
    session.flush()  # Get ID

    # Create default profile using relationship
    db_obj.profile = UserProfile(user_id=db_obj.id)
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
    sync_item_to_search(db_item)
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

    sync_community_to_search(db_community)
    return db_community


def join_community(
    *, session: Session, community_id: uuid.UUID, user_id: uuid.UUID
) -> CommunityMember:
    community = session.get(Community, community_id)
    status = CommunityMemberStatus.ACCEPTED
    if community and community.is_closed:
        status = CommunityMemberStatus.PENDING

    membership = CommunityMember(
        community_id=community_id, user_id=user_id, status=status
    )
    session.add(membership)
    session.commit()
    session.refresh(membership)
    return membership


def update_community_member(
    *,
    session: Session,
    community_id: uuid.UUID,
    user_id: uuid.UUID,
    role: CommunityMemberRole | None = None,
    status: CommunityMemberStatus | None = None,
) -> CommunityMember | None:
    statement = select(CommunityMember).where(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == user_id,
    )
    membership = session.exec(statement).first()
    if membership:
        if role:
            membership.role = role
        if status:
            membership.status = status
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

        # Also create the reverse friendship for easy querying if it doesn't exist
        reverse_stmt = select(Friendship).where(
            Friendship.user_id == friend_id, Friendship.friend_id == user_id
        )
        reverse_friendship = session.exec(reverse_stmt).first()
        if not reverse_friendship:
            reverse_friendship = Friendship(
                user_id=friend_id, friend_id=user_id, status=FriendshipStatus.ACCEPTED
            )
            session.add(reverse_friendship)
        elif reverse_friendship.status != FriendshipStatus.ACCEPTED:
            reverse_friendship.status = FriendshipStatus.ACCEPTED
            session.add(reverse_friendship)

        session.commit()
        session.refresh(friendship)
    return friendship


def create_book(*, session: Session, book_in: BookCreate, owner_id: uuid.UUID) -> Item:
    from app.models import ItemType, UserItem, Item
    db_book = Item.model_validate(book_in, update={"item_type": ItemType.book})
    session.add(db_book)
    session.flush()
    
    # Add ownership
    user_item = UserItem(user_id=owner_id, item_id=db_book.id)
    session.add(user_item)
    
    session.commit()
    session.refresh(db_book)
    
    sync_item_to_search(db_book)
    return db_book


def delete_book(*, session: Session, book_id: uuid.UUID) -> None:
    db_book = session.get(Item, book_id)
    if db_book:
        session.delete(db_book)
        session.commit()
        delete_item_from_search(book_id)


def delete_item(*, session: Session, item_id: uuid.UUID) -> None:
    db_item = session.get(Item, item_id)
    if db_item:
        session.delete(db_item)
        session.commit()
        delete_item_from_search(item_id)


def delete_community(*, session: Session, community_id: uuid.UUID) -> None:
    db_community = session.get(Community, community_id)
    if db_community:
        session.delete(db_community)
        session.commit()
        delete_community_from_search(community_id)
