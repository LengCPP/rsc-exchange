from datetime import datetime, timezone
from enum import Enum
import uuid

from pydantic import EmailStr, field_validator
from sqlalchemy import Column, JSON, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship, SQLModel


# Enums


class CommunityMemberRole(str, Enum):
    ADMIN = "admin"
    MEMBER = "member"


class CommunityMemberStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class FriendshipStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"


class ItemType(str, Enum):
    general = "general"
    book = "book"


class CollectionType(str, Enum):
    GENERAL = "general"
    LIBRARY = "library"


class LoanStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    ACTIVE = "active"  # Ratified by requester
    RETURN_PENDING = "return_pending" # Requester signaled return
    RETURNED = "returned"


class NotificationType(str, Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"


# Link Models
class CollectionItem(SQLModel, table=True):
    collection_id: uuid.UUID = Field(
        foreign_key="collection.id", primary_key=True, ondelete="CASCADE"
    )
    item_id: uuid.UUID = Field(
        foreign_key="item.id", primary_key=True, ondelete="CASCADE"
    )


class CommunityMember(SQLModel, table=True):
    community_id: uuid.UUID = Field(
        foreign_key="community.id", primary_key=True, ondelete="CASCADE"
    )
    user_id: uuid.UUID = Field(
        foreign_key="user.id", primary_key=True, ondelete="CASCADE"
    )
    role: CommunityMemberRole = Field(default=CommunityMemberRole.MEMBER)
    status: CommunityMemberStatus = Field(default=CommunityMemberStatus.ACCEPTED)
    notifications_enabled: bool = Field(default=True)


class Friendship(SQLModel, table=True):
    user_id: uuid.UUID = Field(
        foreign_key="user.id", primary_key=True, ondelete="CASCADE"
    )
    friend_id: uuid.UUID = Field(
        foreign_key="user.id", primary_key=True, ondelete="CASCADE"
    )
    status: FriendshipStatus = Field(default=FriendshipStatus.PENDING)


class UserInterest(SQLModel, table=True):
    user_id: uuid.UUID = Field(foreign_key="user.id", primary_key=True, ondelete="CASCADE")
    interest_id: uuid.UUID = Field(foreign_key="interest.id", primary_key=True, ondelete="CASCADE")


class CommunityInterest(SQLModel, table=True):
    community_id: uuid.UUID = Field(foreign_key="community.id", primary_key=True, ondelete="CASCADE")
    interest_id: uuid.UUID = Field(foreign_key="interest.id", primary_key=True, ondelete="CASCADE")


class UserItem(SQLModel, table=True):
    user_id: uuid.UUID = Field(foreign_key="user.id", primary_key=True, ondelete="CASCADE")
    item_id: uuid.UUID = Field(foreign_key="item.id", primary_key=True, ondelete="CASCADE")


# Support Models
class UserSettingsSchema(SQLModel):
    autocomplete_enabled: bool = Field(default=True)
    theme_mode: str = Field(default="system")

    @field_validator("theme_mode")
    @classmethod
    def validate_theme_mode(cls, v: str) -> str:
        if v not in ["light", "dark", "system"]:
            raise ValueError("theme_mode must be one of 'light', 'dark', 'system'")
        return v


class UserProfile(SQLModel, table=True):
    user_id: uuid.UUID = Field(foreign_key="user.id", primary_key=True, ondelete="CASCADE")
    bio: str | None = Field(default=None, max_length=500)
    alias: str | None = Field(default=None, max_length=255)
    image_url: str | None = Field(default=None, max_length=512)


class Notification(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    recipient_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    title: str = Field(max_length=255)
    message: str = Field(max_length=512)
    type: NotificationType = Field(default=NotificationType.INFO)
    is_read: bool = Field(default=False)
    link: str | None = Field(default=None, max_length=512)
    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    )

    recipient: "User" = Relationship(back_populates="notifications")


class Loan(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    item_id: uuid.UUID = Field(foreign_key="item.id", ondelete="CASCADE")
    owner_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    requester_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    status: LoanStatus = Field(default=LoanStatus.PENDING)
    start_date: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    end_date: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    )

    item: "Item" = Relationship(back_populates="loans")
    owner: "User" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "Loan.owner_id", "back_populates": "loans_out"}
    )
    requester: "User" = Relationship(
        sa_relationship_kwargs={"foreign_keys": "Loan.requester_id", "back_populates": "loans_in"}
    )


# Main Models (Circular references handled by strings)
class Interest(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(unique=True, index=True)
    category: str | None = None
    users: list["User"] = Relationship(back_populates="interests", link_model=UserInterest)
    communities: list["Community"] = Relationship(back_populates="interests", link_model=CommunityInterest)


# Shared properties
class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)
    public_id: str | None = Field(default=None, unique=True, index=True, max_length=8)


# Properties to receive via API on creation
class UserCreate(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=40)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)

    @field_validator("full_name", mode="before")
    @classmethod
    def validate_full_name(cls, v: str | None) -> str | None:
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return None
        return v


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=40)
    full_name: str | None = Field(default=None, max_length=255)

    @field_validator("full_name", mode="before")
    @classmethod
    def validate_full_name(cls, v: str | None) -> str | None:
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return None
        return v


# Properties to receive via API on update, all are optional
class UserUpdate(SQLModel):
    email: EmailStr | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=40)
    is_active: bool | None = None
    is_superuser: bool | None = None
    full_name: str | None = Field(default=None, max_length=255)

    @field_validator("full_name", mode="before")
    @classmethod
    def validate_full_name(cls, v: str | None) -> str | None:
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return None
        return v


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UserProfileUpdate(SQLModel):
    bio: str | None = Field(default=None, max_length=500)
    alias: str | None = Field(default=None, max_length=255)
    interest_ids: list[uuid.UUID] | None = None

    @field_validator("bio", mode="before")
    @classmethod
    def validate_bio(cls, v: str | None) -> str | None:
        if isinstance(v, str):
            v = v.strip()
        return v


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)


class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    public_id: str | None = Field(default=None, unique=True, index=True, max_length=8)
    hashed_password: str
    items: list["Item"] = Relationship(back_populates="owners", link_model=UserItem)
    collections: list["Collection"] = Relationship(back_populates="owner")
    communities: list["Community"] = Relationship(
        back_populates="members", link_model=CommunityMember
    )
    settings: dict = Field(default={}, sa_column=Column(JSONB))
    profile: UserProfile | None = Relationship(sa_relationship_kwargs={"uselist": False})
    interests: list["Interest"] = Relationship(back_populates="users", link_model=UserInterest)
    notifications: list["Notification"] = Relationship(back_populates="recipient", cascade_delete=True)
    loans_out: list["Loan"] = Relationship(
        back_populates="owner",
        sa_relationship_kwargs={"foreign_keys": "Loan.owner_id"}
    )
    loans_in: list["Loan"] = Relationship(
        back_populates="requester",
        sa_relationship_kwargs={"foreign_keys": "Loan.requester_id"}
    )


class CommunityBase(SQLModel):
    name: str = Field(min_length=1, max_length=255, unique=True, index=True)
    description: str | None = Field(default=None, max_length=255)
    is_closed: bool = Field(default=False)


class CommunityCreate(CommunityBase):
    pass


class CommunityUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)
    is_closed: bool | None = Field(default=None)


class Community(CommunityBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_by: uuid.UUID = Field(foreign_key="user.id", nullable=False)
    members: list["User"] = Relationship(
        back_populates="communities", link_model=CommunityMember
    )
    interests: list["Interest"] = Relationship(back_populates="communities", link_model=CommunityInterest)
    announcements: list["CommunityAnnouncement"] = Relationship(
        back_populates="community", cascade_delete=True
    )
    messages: list["CommunityMessage"] = Relationship(
        back_populates="community", cascade_delete=True
    )


class CommunityAnnouncement(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    community_id: uuid.UUID = Field(foreign_key="community.id", ondelete="CASCADE")
    author_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    title: str = Field(max_length=255)
    content: str = Field(max_length=5000)
    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    )

    community: "Community" = Relationship(back_populates="announcements")
    author: "User" = Relationship()


class CommunityMessage(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    community_id: uuid.UUID = Field(foreign_key="community.id", ondelete="CASCADE")
    author_id: uuid.UUID = Field(foreign_key="user.id", ondelete="CASCADE")
    content: str = Field(max_length=2000)
    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    )

    community: "Community" = Relationship(back_populates="messages")
    author: "User" = Relationship()


class CollectionBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=512)
    collection_type: CollectionType = Field(default=CollectionType.GENERAL)


class Collection(CollectionBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    )
    items: list["Item"] = Relationship(link_model=CollectionItem)
    owner: User = Relationship(back_populates="collections")


class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    author: str | None = Field(default=None, max_length=255)
    item_type: ItemType = Field(default=ItemType.general)
    image_url: str | None = Field(default=None, max_length=512)
    extra_data: dict = Field(default={}, sa_column=Column(JSON))


class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str = Field(max_length=255, index=True)
    count: int = Field(default=1)
    created_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    )
    owners: list["User"] = Relationship(back_populates="items", link_model=UserItem)
    loans: list["Loan"] = Relationship(back_populates="item")


# API Models (Public)
class InterestPublic(SQLModel):
    id: uuid.UUID
    name: str
    category: str | None


class UserProfilePublic(SQLModel):
    bio: str | None
    alias: str | None
    image_url: str | None


class CommunityPublic(CommunityBase):
    id: uuid.UUID
    created_by: uuid.UUID
    current_user_role: CommunityMemberRole | None = None
    notifications_enabled: bool | None = None


class CommunityAnnouncementBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    content: str = Field(min_length=1, max_length=5000)


class CommunityAnnouncementCreate(CommunityAnnouncementBase):
    pass


class CommunityAnnouncementPublic(CommunityAnnouncementBase):
    id: uuid.UUID
    community_id: uuid.UUID
    author_id: uuid.UUID
    created_at: datetime
    author: "UserPublic"


class CommunityAnnouncementsPublic(SQLModel):
    data: list[CommunityAnnouncementPublic]
    count: int


class CommunityMessageBase(SQLModel):
    content: str = Field(min_length=1, max_length=2000)


class CommunityMessageCreate(CommunityMessageBase):
    pass


class CommunityMessagePublic(CommunityMessageBase):
    id: uuid.UUID
    community_id: uuid.UUID
    author_id: uuid.UUID
    created_at: datetime
    author: "UserPublic"


class CommunityMessagesPublic(SQLModel):
    data: list[CommunityMessagePublic]
    count: int


class CommunitiesPublic(SQLModel):
    data: list[CommunityPublic]
    count: int


class UserPublic(UserBase):
    id: uuid.UUID
    public_id: str
    communities: list[CommunityPublic] = []
    community_role: CommunityMemberRole | None = None
    community_status: CommunityMemberStatus | None = None
    profile: UserProfilePublic | None = None
    settings: UserSettingsSchema | None = None
    interests: list[InterestPublic] = []
    friendship_status: FriendshipStatus | None = None


class CommunityMemberUpdate(SQLModel):
    role: CommunityMemberRole | None = Field(default=None)
    status: CommunityMemberStatus | None = Field(default=None)
    notifications_enabled: bool | None = Field(default=None)


class FriendshipPublic(SQLModel):
    user_id: uuid.UUID
    friend_id: uuid.UUID
    status: FriendshipStatus


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


class CollectionCreate(CollectionBase):
    pass


class CollectionUpdate(SQLModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=512)
    collection_type: CollectionType | None = None


class CollectionPublic(CollectionBase):
    id: uuid.UUID
    owner_id: uuid.UUID
    items: list["ItemPublic"] = []


class CollectionsPublic(SQLModel):
    data: list[CollectionPublic]
    count: int


class ItemCreate(ItemBase):
    pass


class BookCreate(ItemCreate):
    pass


class ItemUpdate(SQLModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    author: str | None = Field(default=None, max_length=255)
    item_type: ItemType | None = None
    image_url: str | None = None
    extra_data: dict | None = None


class ItemOwnerPublic(SQLModel):
    id: uuid.UUID
    full_name: str | None
    email: str


class ItemPublic(ItemBase):
    id: uuid.UUID
    count: int
    created_at: datetime
    owners: list[ItemOwnerPublic] = []
    collection_id: uuid.UUID | None = None
    is_available: bool = True


class BookPublic(ItemPublic):
    pass


class BooksPublic(SQLModel):
    data: list[BookPublic]
    count: int


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


class LoanCreate(SQLModel):
    item_id: uuid.UUID
    start_date: datetime
    end_date: datetime


class LoanPublic(SQLModel):
    id: uuid.UUID
    item_id: uuid.UUID
    owner_id: uuid.UUID
    requester_id: uuid.UUID
    status: LoanStatus
    start_date: datetime
    end_date: datetime
    created_at: datetime
    item: ItemPublic
    owner: UserPublic
    requester: UserPublic


class LoansPublic(SQLModel):
    data: list[LoanPublic]
    count: int


class NotificationPublic(SQLModel):
    id: uuid.UUID
    title: str
    message: str
    type: NotificationType
    is_read: bool
    link: str | None
    created_at: datetime


class NotificationsPublic(SQLModel):
    data: list[NotificationPublic]
    count: int
    unread_count: int


class SearchResults(SQLModel):
    users: list[UserPublic]
    items: list[ItemPublic]
    communities: list[CommunityPublic]


class Message(SQLModel):
    message: str


class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=40)

class BookPublic(ItemPublic):
    pass


class BooksPublic(SQLModel):
    data: list[BookPublic]
    count: int


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


class NotificationPublic(SQLModel):
    id: uuid.UUID
    title: str
    message: str
    type: NotificationType
    is_read: bool
    link: str | None
    created_at: datetime


class NotificationsPublic(SQLModel):
    data: list[NotificationPublic]
    count: int
    unread_count: int


class SearchResults(SQLModel):
    users: list[UserPublic]
    items: list[ItemPublic]
    communities: list[CommunityPublic]


class Message(SQLModel):
    message: str


class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=40)