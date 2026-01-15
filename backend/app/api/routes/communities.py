import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app import crud
from app.api.deps import CurrentUser, SessionDep
from app.models import (
    CommunitiesPublic,
    Community,
    CommunityCreate,
    CommunityMember,
    CommunityMemberRole,
    CommunityPublic,
    CommunityUpdate,
    Message,
    UsersPublic,
)

router = APIRouter()


@router.get("/", response_model=CommunitiesPublic)
def read_communities(
    session: SessionDep, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve communities.
    """
    count_statement = select(func.count()).select_from(Community)
    count = session.exec(count_statement).one()
    statement = select(Community).offset(skip).limit(limit)
    communities = session.exec(statement).all()

    return CommunitiesPublic(data=communities, count=count)


@router.post("/", response_model=CommunityPublic)
def create_community(
    *, session: SessionDep, current_user: CurrentUser, community_in: CommunityCreate
) -> Any:
    """
    Create new community.
    """
    community = crud.create_community(
        session=session, community_in=community_in, creator_id=current_user.id
    )
    return community


@router.get("/{id}", response_model=CommunityPublic)
def read_community(session: SessionDep, id: uuid.UUID) -> Any:
    """
    Get community by ID.
    """
    community = session.get(Community, id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    return community


@router.patch("/{id}", response_model=CommunityPublic)
def update_community(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    community_in: CommunityUpdate,
) -> Any:
    """
    Update a community.
    """
    community = session.get(Community, id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    
    # Check if user is admin
    statement = select(CommunityMember).where(
        CommunityMember.community_id == id,
        CommunityMember.user_id == current_user.id,
        CommunityMember.role == CommunityMemberRole.ADMIN
    )
    membership = session.exec(statement).first()
    if not membership and not current_user.is_superuser:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    update_dict = community_in.model_dump(exclude_unset=True)
    community.sqlmodel_update(update_dict)
    session.add(community)
    session.commit()
    session.refresh(community)
    return community


@router.delete("/{id}")
def delete_community(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Message:
    """
    Delete a community.
    """
    community = session.get(Community, id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    
    # Check if user is creator or admin
    if community.created_by != current_user.id and not current_user.is_superuser:
        raise HTTPException(status_code=400, detail="Not enough permissions")
    
    session.delete(community)
    session.commit()
    return Message(message="Community deleted successfully")


@router.post("/{id}/join", response_model=Message)
def join_community(
    session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    """
    Join a community.
    """
    community = session.get(Community, id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    
    crud.join_community(session=session, community_id=id, user_id=current_user.id)
    return Message(message="Joined community successfully")


@router.post("/{id}/leave", response_model=Message)
def leave_community(
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    user_id: uuid.UUID | None = None,
) -> Any:
    """
    Leave a community or remove a member.
    """
    community = session.get(Community, id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    target_user_id = user_id or current_user.id

    if target_user_id != current_user.id:
        # Check if current user is admin
        statement = select(CommunityMember).where(
            CommunityMember.community_id == id,
            CommunityMember.user_id == current_user.id,
            CommunityMember.role == CommunityMemberRole.ADMIN,
        )
        membership = session.exec(statement).first()
        if not membership and not current_user.is_superuser:
            raise HTTPException(status_code=400, detail="Not enough permissions")

    crud.leave_community(session=session, community_id=id, user_id=target_user_id)
    return Message(message="Left community successfully")


@router.get("/{id}/members", response_model=UsersPublic)
def read_community_members(
    session: SessionDep, id: uuid.UUID, skip: int = 0, limit: int = 100
) -> Any:
    """
    Get members of a community.
    """
    community = session.get(Community, id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")
    
    statement = select(CommunityMember).where(CommunityMember.community_id == id)
    memberships = session.exec(statement.offset(skip).limit(limit)).all()
    count = session.exec(select(func.count()).where(CommunityMember.community_id == id)).one()
    
    # Better:
    from app.models import User
    statement = (
        select(User)
        .join(CommunityMember, User.id == CommunityMember.user_id)
        .where(CommunityMember.community_id == id)
    )
    users = session.exec(statement.offset(skip).limit(limit)).all()

    return UsersPublic(data=users, count=count)
