import uuid
from typing import Any
from datetime import datetime

from fastapi import APIRouter, HTTPException
from sqlmodel import select, func

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

    # For simplicity, we'll assume the first owner is the primary owner to deal with
    if not item.owners:
        raise HTTPException(status_code=400, detail="Item has no owners")
    
    owner = item.owners[0]

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
        owner_id=owner.id,
        requester_id=current_user.id,
        start_date=loan_in.start_date,
        end_date=loan_in.end_date,
        status=LoanStatus.PENDING
    )
    session.add(db_loan)
    session.commit()
    session.refresh(db_loan)

    # Notify owner
    crud.create_notification(
        session=session,
        recipient_id=owner.id,
        title="New Loan Request",
        message=f"{current_user.full_name or current_user.email} wants to borrow '{item.title}'.",
        type=NotificationType.INFO,
        link="/loans"
    )
    await notification_manager.send_personal_message(
        {"type": "new_notification"},
        owner.id
    )

    return db_loan


@router.get("/incoming", response_model=LoansPublic)
def read_incoming_loan_requests(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve loan requests for items owned by the current user.
    """
    statement = (
        select(Loan)
        .where(Loan.owner_id == current_user.id)
        .order_by(Loan.created_at.desc())
    )
    count_statement = select(func.count()).select_from(Loan).where(Loan.owner_id == current_user.id)
    
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
    Accept or reject a loan request (Owner only).
    """
    loan = session.get(Loan, id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan request not found")
    if loan.owner_id != current_user.id:
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

    # Notify owner
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

    # Notify owner
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
    Mark an item as returned (Owner only).
    """
    loan = session.get(Loan, id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.owner_id != current_user.id:
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
        message=f"{current_user.full_name or current_user.email} confirmed receipt of '{loan.item.title}'.",
        type=NotificationType.SUCCESS,
        link="/loans"
    )
    await notification_manager.send_personal_message(
        {"type": "new_notification"},
        loan.requester_id
    )

    return loan
