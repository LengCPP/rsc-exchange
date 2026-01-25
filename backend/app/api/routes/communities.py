import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import func, select

from app import crud
from app.api.deps import CurrentUser, SessionDep
from app.api.websocket_manager import notification_manager
from app.search import sync_community_to_search, delete_community_from_search
from app.models import (
    CommunitiesPublic,
    Community,
    CommunityCreate,
    CommunityMember,
    CommunityMemberRole,
    CommunityMemberStatus,
    CommunityMemberUpdate,
    CommunityAnnouncementCreate,
    CommunityAnnouncementPublic,
    CommunityAnnouncementsPublic,
    CommunityMessageCreate,
    CommunityMessagePublic,
    CommunityMessagesPublic,
    CommunityPublic,
    CommunityUpdate,
    Friendship,
    FriendshipStatus,
    Message,
    NotificationType,
    UserPublic,
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
    sync_community_to_search(community)
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
    delete_community_from_search(id)
    return Message(message="Community deleted successfully")


@router.post("/{id}/join", response_model=Message)
async def join_community(
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

    # If closed, notify admins
    if community.is_closed:
        admin_statement = select(CommunityMember).where(
            CommunityMember.community_id == id,
            CommunityMember.role == CommunityMemberRole.ADMIN
        )
        admins = session.exec(admin_statement).all()
        for admin in admins:
            crud.create_notification(
                session=session,
                recipient_id=admin.user_id,
                title="New Join Request",
                message=f"{current_user.full_name or current_user.email} wants to join {community.name}.",
                type=NotificationType.INFO,
                link=f"/communities/{id}"
            )
            await notification_manager.send_personal_message(
                {"type": "new_notification"},
                admin.user_id
            )

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

    # Get friendship statuses for members
    member_ids = [u.id for u, m in results]
    friendship_map = {}
    if member_ids:
        friendships = session.exec(
            select(Friendship).where(
                Friendship.user_id == current_user.id,
                Friendship.friend_id.in_(member_ids)
            )
        ).all()
        friendship_map = {f.friend_id: f.status for f in friendships}

    users_with_meta = []
    for user, membership in results:
        user_public = UserPublic.model_validate(user)
        user_public.community_role = membership.role
        user_public.community_status = membership.status
        
        status = friendship_map.get(user.id)
        user_public.friendship_status = status
        
        # Restrict data if not friends
        if user.id != current_user.id and status != FriendshipStatus.ACCEPTED:
            user_public.communities = []
            user_public.interests = []
            
        users_with_meta.append(user_public)

    return UsersPublic(data=users_with_meta, count=count)


@router.patch("/{id}/members/{user_id}", response_model=UserPublic)
async def update_community_member_role(
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

    # Notify user of status/role change
    if member_in.status == CommunityMemberStatus.ACCEPTED:
        crud.create_notification(
            session=session,
            recipient_id=user_id,
            title="Community Request Accepted",
            message=f"You are now a member of {community.name}.",
            type=NotificationType.SUCCESS,
            link=f"/communities/{id}"
        )
        await notification_manager.send_personal_message(
            {"type": "new_notification"},
            user_id
        )
    elif member_in.role:
        crud.create_notification(
            session=session,
            recipient_id=user_id,
            title="Community Role Updated",
            message=f"Your role in {community.name} has been updated to {member_in.role}.",
            type=NotificationType.INFO,
            link=f"/communities/{id}"
        )
        await notification_manager.send_personal_message(
            {"type": "new_notification"},
            user_id
        )

    from app.models import User
    user = session.get(User, user_id)
    user_public = UserPublic.model_validate(user)
    user_public.community_role = updated_member.role
    user_public.community_status = updated_member.status
    return user_public


@router.get("/{id}/announcements", response_model=CommunityAnnouncementsPublic)
def read_community_announcements(
    *, session: SessionDep, current_user: CurrentUser, id: uuid.UUID, skip: int = 0, limit: int = 100
) -> Any:
    """
    Get announcements for a community.
    """
    community = session.get(Community, id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    # Access check: member or admin
    statement = select(CommunityMember).where(
        CommunityMember.community_id == id,
        CommunityMember.user_id == current_user.id,
        CommunityMember.status == CommunityMemberStatus.ACCEPTED,
    )
    membership = session.exec(statement).first()
    if not membership and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Must be a member to view announcements")

    from app.models import CommunityAnnouncement
    count = session.exec(
        select(func.count()).where(CommunityAnnouncement.community_id == id)
    ).one()
    statement = (
        select(CommunityAnnouncement)
        .where(CommunityAnnouncement.community_id == id)
        .order_by(CommunityAnnouncement.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    announcements = session.exec(statement).all()
    return CommunityAnnouncementsPublic(data=announcements, count=count)


@router.post("/{id}/announcements", response_model=CommunityAnnouncementPublic)
def create_community_announcement(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    announcement_in: CommunityAnnouncementCreate,
) -> Any:
    """
    Create an announcement (Admin only).
    """
    community = session.get(Community, id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    # Admin check
    statement = select(CommunityMember).where(
        CommunityMember.community_id == id,
        CommunityMember.user_id == current_user.id,
        CommunityMember.role == CommunityMemberRole.ADMIN,
        CommunityMember.status == CommunityMemberStatus.ACCEPTED,
    )
    membership = session.exec(statement).first()
    if not membership and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only admins can create announcements")

    from app.models import CommunityAnnouncement
    announcement = CommunityAnnouncement(
        **announcement_in.model_dump(),
        community_id=id,
        author_id=current_user.id
    )
    session.add(announcement)
    session.commit()
    session.refresh(announcement)

    # Notify all members
    member_statement = select(CommunityMember).where(
        CommunityMember.community_id == id,
        CommunityMember.status == CommunityMemberStatus.ACCEPTED,
        CommunityMember.user_id != current_user.id
    )
    members = session.exec(member_statement).all()
    for member in members:
        crud.create_notification(
            session=session,
            recipient_id=member.user_id,
            title=f"New Announcement in {community.name}",
            message=announcement.title,
            type=NotificationType.INFO,
            link=f"/communities/{id}"
        )
        # Notify via websocket
        # Note: notification_manager is imported at the top
        await notification_manager.send_personal_message(
            {"type": "new_notification"},
            member.user_id
        )

    return announcement


@router.get("/{id}/messages", response_model=CommunityMessagesPublic)
def read_community_messages(
    *, session: SessionDep, current_user: CurrentUser, id: uuid.UUID, skip: int = 0, limit: int = 100
) -> Any:
    """
    Get messages for a community board.
    """
    community = session.get(Community, id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    # Access check: member or admin
    statement = select(CommunityMember).where(
        CommunityMember.community_id == id,
        CommunityMember.user_id == current_user.id,
        CommunityMember.status == CommunityMemberStatus.ACCEPTED,
    )
    membership = session.exec(statement).first()
    if not membership and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Must be a member to view messages")

    from app.models import CommunityMessage
    count = session.exec(
        select(func.count()).where(CommunityMessage.community_id == id)
    ).one()
    statement = (
        select(CommunityMessage)
        .where(CommunityMessage.community_id == id)
        .order_by(CommunityMessage.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    messages = session.exec(statement).all()
    return CommunityMessagesPublic(data=messages, count=count)


@router.post("/{id}/messages", response_model=CommunityMessagePublic)
def create_community_message(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    id: uuid.UUID,
    message_in: CommunityMessageCreate,
) -> Any:
    """
    Post a message to the community board.
    """
    community = session.get(Community, id)
    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    # Member check
    statement = select(CommunityMember).where(
        CommunityMember.community_id == id,
        CommunityMember.user_id == current_user.id,
        CommunityMember.status == CommunityMemberStatus.ACCEPTED,
    )
    membership = session.exec(statement).first()
    if not membership and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Must be a member to post messages")

    from app.models import CommunityMessage
    message = CommunityMessage(
        **message_in.model_dump(),
        community_id=id,
        author_id=current_user.id
    )
    session.add(message)
    session.commit()
    session.refresh(message)
    return message
