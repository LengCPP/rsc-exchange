import uuid
from typing import Any

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from jwt.exceptions import InvalidTokenError
from pydantic import ValidationError
from sqlmodel import select, func

from app.api.deps import CurrentUser, SessionDep
from app.api.websocket_manager import notification_manager
from app.core import security
from app.core.config import settings
from app.models import (
    Message,
    Notification,
    NotificationPublic,
    NotificationsPublic,
    TokenPayload,
    User,
)

router = APIRouter()


async def get_current_user_ws(
    *, session: SessionDep, token: str = Query(...)
) -> User:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise HTTPException(status_code=403, detail="Could not validate credentials")
    user = session.get(User, uuid.UUID(token_data.sub))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


@router.get("/", response_model=NotificationsPublic)
def read_notifications(
    session: SessionDep, current_user: CurrentUser, skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve notifications.
    """
    count_statement = (
        select(func.count())
        .select_from(Notification)
        .where(Notification.recipient_id == current_user.id)
    )
    count = session.exec(count_statement).one()
    
    unread_count_statement = (
        select(func.count())
        .select_from(Notification)
        .where(Notification.recipient_id == current_user.id, Notification.is_read == False)
    )
    unread_count = session.exec(unread_count_statement).one()

    statement = (
        select(Notification)
        .where(Notification.recipient_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    notifications = session.exec(statement).all()

    return NotificationsPublic(data=notifications, count=count, unread_count=unread_count)


@router.patch("/{id}/read", response_model=NotificationPublic)
def mark_notification_as_read(
    *, session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    """
    Mark a notification as read.
    """
    notification = session.get(Notification, id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notification.recipient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    notification.is_read = True
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification


@router.patch("/read-all", response_model=Message)
def mark_all_notifications_as_read(
    *, session: SessionDep, current_user: CurrentUser
) -> Any:
    """
    Mark all notifications as read.
    """
    statement = select(Notification).where(
        Notification.recipient_id == current_user.id, Notification.is_read == False
    )
    notifications = session.exec(statement).all()
    for notification in notifications:
        notification.is_read = True
        session.add(notification)
    session.commit()
    return Message(message="All notifications marked as read")


@router.delete("/{id}", response_model=Message)
def delete_notification(
    *, session: SessionDep, current_user: CurrentUser, id: uuid.UUID
) -> Any:
    """
    Delete a notification.
    """
    notification = session.get(Notification, id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    if notification.recipient_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not enough privileges")
    session.delete(notification)
    session.commit()
    return Message(message="Notification deleted successfully")


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
):
    # We can't use SessionDep directly here easily with WebSocket if we want to handle it inside
    # But we can manually get session if needed or just validate user
    from app.core.db import engine
    from sqlmodel import Session
    
    with Session(engine) as session:
        try:
            user = await get_current_user_ws(session=session, token=token)
        except HTTPException:
            await websocket.close(code=1008)
            return

        await notification_manager.connect(websocket, user.id)
        try:
            while True:
                # Keep connection alive and wait for messages (though we mostly push from server)
                data = await websocket.receive_text()
                # We could handle client messages here if needed
        except WebSocketDisconnect:
            notification_manager.disconnect(websocket, user.id)
