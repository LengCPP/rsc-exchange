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
    CommunityMemberStatus,
    CommunityMemberUpdate,
    CommunityPublic,
    CommunityUpdate,
    Message,
    UsersPublic,
)

router = APIRouter()


@router.get("/", response_model=CommunitiesPublic)
def read_communities(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve communities.
    """
    count_statement = select(func.count()).select_from(Community)
    count = session.exec(count_statement).one()
    statement = select(Community).offset(skip).limit(limit)
    communities = session.exec(statement).all()

    # Populate current_user_role
    communities_public = []
    
    # Get all memberships for current user in fetched communities
    community_ids = [c.id for c in communities]
    if community_ids:
        memberships = session.exec(
            select(CommunityMember).where(
                CommunityMember.user_id == current_user.id,
                CommunityMember.community_id.in_(community_ids)
            )
        ).all()
        membership_map = {m.community_id: m.role for m in memberships}
    else:
        membership_map = {}

    for community in communities:
        comm_pub = CommunityPublic.model_validate(community)
        comm_pub.current_user_role = membership_map.get(community.id)
        communities_public.append(comm_pub)

    return CommunitiesPublic(data=communities_public, count=count)


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
    
    # Check if user is already a member
    statement = select(CommunityMember).where(
        CommunityMember.community_id == id,
        CommunityMember.user_id == current_user.id,
    )
    existing_membership = session.exec(statement).first()
    if existing_membership:
        if existing_membership.status == CommunityMemberStatus.PENDING:
            raise HTTPException(status_code=400, detail="Join request already pending")
        if existing_membership.status == CommunityMemberStatus.ACCEPTED:
            raise HTTPException(status_code=400, detail="Already a member of this community")
        if existing_membership.status == CommunityMemberStatus.REJECTED:
            raise HTTPException(status_code=400, detail="Join request was rejected")

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
    *, session: SessionDep, current_user: CurrentUser, id: uuid.UUID, skip: int = 0, limit: int = 100
) -> Any:
    """
    Get members of a community.
    """
    community = session.get(Community, id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    # Privacy check for closed communities
    if community.is_closed and not current_user.is_superuser:
        statement = select(CommunityMember).where(
            CommunityMember.community_id == id,
            CommunityMember.user_id == current_user.id,
            CommunityMember.status == CommunityMemberStatus.ACCEPTED,
        )
        membership = session.exec(statement).first()
        if not membership:
            raise HTTPException(
                status_code=403, 
                detail="This community is closed. You must be a member to view the member list."
            )

    count = session.exec(
        select(func.count()).where(CommunityMember.community_id == id)
    ).one()

    from app.models import User, UserPublic

    statement = (
        select(User, CommunityMember)
        .join(CommunityMember, User.id == CommunityMember.user_id)
        .where(CommunityMember.community_id == id)
    )
    results = session.exec(statement.offset(skip).limit(limit)).all()

    users_with_meta = []
    for user, membership in results:
        user_public = UserPublic.model_validate(user)
        user_public.community_role = membership.role
        user_public.community_status = membership.status
        users_with_meta.append(user_public)

    return UsersPublic(data=users_with_meta, count=count)


@router.patch("/{id}/members/{user_id}", response_model=Message)
def update_community_member_role(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    user_id: uuid.UUID,
    member_in: CommunityMemberUpdate,
) -> Any:
    """
    Update a member's role or status in a community.
    """
    community = session.get(Community, id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    # Check if current user is admin
    statement = select(CommunityMember).where(
        CommunityMember.community_id == id,
        CommunityMember.user_id == current_user.id,
        CommunityMember.role == CommunityMemberRole.ADMIN,
    )
    membership = session.exec(statement).first()
    if not membership and not current_user.is_superuser:
        raise HTTPException(status_code=400, detail="Not enough permissions")

    updated_member = crud.update_community_member(
        session=session,
        community_id=id,
        user_id=user_id,
        role=member_in.role,
        status=member_in.status,
    )
    
    if not updated_member:
        raise HTTPException(status_code=404, detail="Member not found in this community")

    return Message(message=f"Member updated successfully. New role: {updated_member.role}")
