from enum import Enum
import uuid

from pydantic import EmailStr
from sqlmodel import Field, Relationship, SQLModel


class CommunityMemberRole(str, Enum):
    ADMIN = "admin"
    MEMBER = "member"


class FriendshipStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"


class CommunityMember(SQLModel, table=True):
    community_id: uuid.UUID = Field(
        foreign_key="community.id", primary_key=True, ondelete="CASCADE"
    )
    user_id: uuid.UUID = Field(
        foreign_key="user.id", primary_key=True, ondelete="CASCADE"
    )
    role: CommunityMemberRole = Field(default=CommunityMemberRole.MEMBER)


class Friendship(SQLModel, table=True):
    user_id: uuid.UUID = Field(
        foreign_key="user.id", primary_key=True, ondelete="CASCADE"
    )
    friend_id: uuid.UUID = Field(
        foreign_key="user.id", primary_key=True, ondelete="CASCADE"
    )
    status: FriendshipStatus = Field(default=FriendshipStatus.PENDING)


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


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=40)
    full_name: str | None = Field(default=None, max_length=255)


# Properties to receive via API on update, all are optional
class UserUpdate(SQLModel):
    email: EmailStr | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=40)
    is_active: bool | None = None
    is_superuser: bool | None = None
    full_name: str | None = Field(default=None, max_length=255)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)


# Database model, database table inferred from class name
class User(UserBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    public_id: str | None = Field(default=None, unique=True, index=True, max_length=8)
    hashed_password: str
    items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)
    communities: list["Community"] = Relationship(
        back_populates="members", link_model=CommunityMember
    )


class CommunityBase(SQLModel):
    name: str = Field(min_length=1, max_length=255, unique=True, index=True)
    description: str | None = Field(default=None, max_length=255)


class CommunityCreate(CommunityBase):
    pass


class CommunityUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


class Community(CommunityBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_by: uuid.UUID = Field(foreign_key="user.id", nullable=False)
    members: list["User"] = Relationship(
        back_populates="communities", link_model=CommunityMember
    )


class CommunityPublic(CommunityBase):
    id: uuid.UUID
    created_by: uuid.UUID


class CommunitiesPublic(SQLModel):
    data: list[CommunityPublic]
    count: int


# Properties to return via API, id is always required
class UserPublic(UserBase):
    id: uuid.UUID
    public_id: str
    communities: list[CommunityPublic] = []


class FriendshipPublic(SQLModel):
    user_id: uuid.UUID
    friend_id: uuid.UUID
    status: FriendshipStatus


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


# Shared properties
class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item creation
class ItemCreate(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Properties to receive on item update
class ItemUpdate(SQLModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


# Database model, database table inferred from class name
class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str = Field(max_length=255)
    owner_id: uuid.UUID = Field(
        foreign_key="user.id", nullable=False, ondelete="CASCADE"
    )
    owner: User | None = Relationship(back_populates="items")


# Properties to return via API, id is always required
class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


class SearchResults(SQLModel):
    users: list[UserPublic]
    items: list[ItemPublic]
    communities: list[CommunityPublic]


# Generic message
class Message(SQLModel):
    message: str


# JSON payload containing access token
class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"


# Contents of JWT token
class TokenPayload(SQLModel):
    sub: str | None = None


class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=40)
