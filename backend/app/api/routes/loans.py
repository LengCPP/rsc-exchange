import uuid
from typing import Any
from datetime import datetime

from fastapi import APIRouter, HTTPException
from sqlmodel import select, func, or_

from app.api.deps import CurrentUser, SessionDep
from app.models import (
    Loan,
    LoanCreate,
    LoanPublic,
    LoansPublic,
    LoanStatus,
    Item,
    Message,
    NotificationType,
    User,
)
from app.api.websocket_manager import notification_manager
from app import crud

router = APIRouter(prefix="/loans", tags=["loans"])


@router.post("/request", response_model=LoanPublic)
async def create_loan_request(
    *, session: SessionDep, current_user: CurrentUser, loan_in: LoanCreate
) -> Any:
    """
    Submit a loan request for an item.
    """
    item = session.get(Item, loan_in.item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Check if user is already an owner
    if any(owner.id == current_user.id for owner in item.owners):
        raise HTTPException(status_code=400, detail="You already own this item")

    # Determine if this is a community loan or personal loan
    owner_id = None
    community_id = loan_in.community_id

    if community_id:
        # Check if item is in this community
        from app.models import CommunityItem, CommunityMember, CommunityMemberRole, CommunityMemberStatus
        statement = select(CommunityItem).where(
            CommunityItem.community_id == community_id,
            CommunityItem.item_id == loan_in.item_id
        )
        if not session.exec(statement).first():
            raise HTTPException(status_code=400, detail="Item is not in this community")
        
        # Check if requester is a member
        statement = select(CommunityMember).where(
            CommunityMember.community_id == community_id,
            CommunityMember.user_id == current_user.id,
            CommunityMember.status == CommunityMemberStatus.ACCEPTED
        )
        if not session.exec(statement).first():
            raise HTTPException(status_code=403, detail="Must be a member of the community to borrow its items")
    else:
        # Personal loan - use the first owner
        if not item.owners:
            raise HTTPException(status_code=400, detail="Item has no owners and is not a community item")
        owner_id = item.owners[0].id

    # Check for existing active or pending loans for this item
    existing_loan = session.exec(
        select(Loan).where(
            Loan.item_id == loan_in.item_id,
            Loan.status.in_([LoanStatus.PENDING, LoanStatus.ACCEPTED, LoanStatus.ACTIVE])
        )
    ).first()
    
    if existing_loan:
        raise HTTPException(status_code=400, detail="Item is already requested or on loan")

    db_loan = Loan(
        item_id=loan_in.item_id,
        owner_id=owner_id,
        community_id=community_id,
        requester_id=current_user.id,
        start_date=loan_in.start_date,
        end_date=loan_in.end_date,
        status=LoanStatus.PENDING
    )
    session.add(db_loan)
    session.commit()
    session.refresh(db_loan)

    # Notify owner or admins
    if community_id:
        # Notify all admins of the community
        from app.models import CommunityMember, CommunityMemberRole, Community
        community = session.get(Community, community_id)
        admin_statement = select(CommunityMember).where(
            CommunityMember.community_id == community_id,
            CommunityMember.role == CommunityMemberRole.ADMIN
        )
        admins = session.exec(admin_statement).all()
        for admin in admins:
            if admin.user_id == current_user.id:
                continue
            crud.create_notification(
                session=session,
                recipient_id=admin.user_id,
                title="New Community Loan Request",
                message=f"{current_user.full_name or current_user.email} wants to borrow '{item.title}' from {community.name}.",
                type=NotificationType.INFO,
                link="/loans"
            )
            await notification_manager.send_personal_message(
                {"type": "new_notification"},
                admin.user_id
            )
    else:
        # Notify single owner
        crud.create_notification(
            session=session,
            recipient_id=owner_id,
            title="New Loan Request",
            message=f"{current_user.full_name or current_user.email} wants to borrow '{item.title}'.",
            type=NotificationType.INFO,
            link="/loans"
        )
        await notification_manager.send_personal_message(
            {"type": "new_notification"},
            owner_id
        )

    return db_loan


@router.get("/incoming", response_model=LoansPublic)
def read_incoming_loan_requests(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve loan requests for items owned by the current user or their communities.
    """
    from app.models import CommunityMember, CommunityMemberRole
    
    # Get IDs of communities where user is an admin
    admin_communities = session.exec(
        select(CommunityMember.community_id).where(
            CommunityMember.user_id == current_user.id,
            CommunityMember.role == CommunityMemberRole.ADMIN
        )
    ).all()

    statement = (
        select(Loan)
        .where(
            or_(
                Loan.owner_id == current_user.id,
                Loan.community_id.in_(admin_communities) if admin_communities else False
            )
        )
        .order_by(Loan.created_at.desc())
    )
    
    count_statement = (
        select(func.count())
        .select_from(Loan)
        .where(
            or_(
                Loan.owner_id == current_user.id,
                Loan.community_id.in_(admin_communities) if admin_communities else False
            )
        )
    )
    
    count = session.exec(count_statement).one()
    loans = session.exec(statement.offset(skip).limit(limit)).all()
    return LoansPublic(data=loans, count=count)


@router.get("/outgoing", response_model=LoansPublic)
def read_outgoing_loan_requests(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve loan requests submitted by the current user.
    """
    statement = (
        select(Loan)
        .where(Loan.requester_id == current_user.id)
        .order_by(Loan.created_at.desc())
    )
    count_statement = select(func.count()).select_from(Loan).where(Loan.requester_id == current_user.id)
    
    count = session.exec(count_statement).one()
    loans = session.exec(statement.offset(skip).limit(limit)).all()
    return LoansPublic(data=loans, count=count)


@router.patch("/{id}/respond", response_model=LoanPublic)
async def respond_to_loan_request(
    *, session: SessionDep, current_user: CurrentUser, id: uuid.UUID, accept: bool
) -> Any:
    """
    Accept or reject a loan request (Owner or Community Admin only).
    """
    loan = session.get(Loan, id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan request not found")
    
    # Permission check
    can_respond = False
    if loan.owner_id == current_user.id:
        can_respond = True
    elif loan.community_id:
        from app.models import CommunityMember, CommunityMemberRole
        statement = select(CommunityMember).where(
            CommunityMember.community_id == loan.community_id,
            CommunityMember.user_id == current_user.id,
            CommunityMember.role == CommunityMemberRole.ADMIN
        )
        if session.exec(statement).first():
            can_respond = True
            
    if not can_respond and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    if loan.status != LoanStatus.PENDING:
        raise HTTPException(status_code=400, detail="Loan is not in pending state")

    loan.status = LoanStatus.ACCEPTED if accept else LoanStatus.REJECTED
    session.add(loan)
    session.commit()
    session.refresh(loan)

    # Notify requester
    status_msg = "accepted" if accept else "rejected"
    crud.create_notification(
        session=session,
        recipient_id=loan.requester_id,
        title=f"Loan Request {status_msg.capitalize()}",
        message=f"Your request for '{loan.item.title}' has been {status_msg}.",
        type=NotificationType.SUCCESS if accept else NotificationType.WARNING,
        link="/loans"
    )
    await notification_manager.send_personal_message(
        {"type": "new_notification"},
        loan.requester_id
    )

    return loan


@router.patch("/{id}/ratify", response_model=LoanPublic)
async def ratify_loan(
    *, session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    """
    Confirm possession of the item (Requester only).
    """
    loan = session.get(Loan, id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    if loan.status != LoanStatus.ACCEPTED:
        raise HTTPException(status_code=400, detail="Loan must be accepted before ratification")

    loan.status = LoanStatus.ACTIVE
    session.add(loan)
    session.commit()
    session.refresh(loan)

    # Notify owner or admins
    if loan.community_id:
        from app.models import CommunityMember, CommunityMemberRole
        admin_statement = select(CommunityMember).where(
            CommunityMember.community_id == loan.community_id,
            CommunityMember.role == CommunityMemberRole.ADMIN
        )
        admins = session.exec(admin_statement).all()
        for admin in admins:
            crud.create_notification(
                session=session,
                recipient_id=admin.user_id,
                title="Loan Ratified",
                message=f"{current_user.full_name or current_user.email} confirmed receipt of '{loan.item.title}' from the community.",
                type=NotificationType.INFO,
                link="/loans"
            )
            await notification_manager.send_personal_message(
                {"type": "new_notification"},
                admin.user_id
            )
    elif loan.owner_id:
        crud.create_notification(
            session=session,
            recipient_id=loan.owner_id,
            title="Loan Ratified",
            message=f"{current_user.full_name or current_user.email} confirmed they have received '{loan.item.title}'.",
            type=NotificationType.INFO,
            link="/loans"
        )
        await notification_manager.send_personal_message(
            {"type": "new_notification"},
            loan.owner_id
        )

    return loan


@router.patch("/{id}/return-signal", response_model=LoanPublic)
async def signal_return(
    *, session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    """
    Signal that the item is being returned (Requester only).
    """
    loan = session.get(Loan, id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    if loan.status != LoanStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Loan must be active to signal return")

    loan.status = LoanStatus.RETURN_PENDING
    session.add(loan)
    session.commit()
    session.refresh(loan)

    # Notify owner or admins
    if loan.community_id:
        from app.models import CommunityMember, CommunityMemberRole
        admin_statement = select(CommunityMember).where(
            CommunityMember.community_id == loan.community_id,
            CommunityMember.role == CommunityMemberRole.ADMIN
        )
        admins = session.exec(admin_statement).all()
        for admin in admins:
            crud.create_notification(
                session=session,
                recipient_id=admin.user_id,
                title="Return Signaled",
                message=f"{current_user.full_name or current_user.email} signaled that they have returned '{loan.item.title}' to the community.",
                type=NotificationType.INFO,
                link="/loans"
            )
            await notification_manager.send_personal_message(
                {"type": "new_notification"},
                admin.user_id
            )
    elif loan.owner_id:
        crud.create_notification(
            session=session,
            recipient_id=loan.owner_id,
            title="Return Signaled",
            message=f"{current_user.full_name or current_user.email} signaled that they have returned '{loan.item.title}'. Please confirm receipt.",
            type=NotificationType.INFO,
            link="/loans"
        )
        await notification_manager.send_personal_message(
            {"type": "new_notification"},
            loan.owner_id
        )

    return loan


@router.patch("/{id}/return", response_model=LoanPublic)
async def return_loan(
    *, session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    """
    Mark an item as returned (Owner or Community Admin only).
    """
    loan = session.get(Loan, id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    # Permission check
    can_confirm = False
    if loan.owner_id == current_user.id:
        can_confirm = True
    elif loan.community_id:
        from app.models import CommunityMember, CommunityMemberRole
        statement = select(CommunityMember).where(
            CommunityMember.community_id == loan.community_id,
            CommunityMember.user_id == current_user.id,
            CommunityMember.role == CommunityMemberRole.ADMIN
        )
        if session.exec(statement).first():
            can_confirm = True
            
    if not can_confirm and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
        
    if loan.status not in [LoanStatus.ACTIVE, LoanStatus.RETURN_PENDING]:
        raise HTTPException(status_code=400, detail="Loan must be active or return pending to be returned")

    loan.status = LoanStatus.RETURNED
    session.add(loan)
    session.commit()
    session.refresh(loan)

    # Notify requester
    crud.create_notification(
        session=session,
        recipient_id=loan.requester_id,
        title="Return Confirmed",
        message=f"Receipt of '{loan.item.title}' has been confirmed.",
        type=NotificationType.SUCCESS,
        link="/loans"
    )
    await notification_manager.send_personal_message(
        {"type": "new_notification"},
        loan.requester_id
    )

    return loan
