import uuid
from typing import Any

from fastapi import APIRouter
from sqlmodel import select

from app.api.deps import SessionDep
from app.models import Interest, InterestPublic

router = APIRouter(prefix="/interests", tags=["interests"])

@router.get("/", response_model=list[InterestPublic])
def read_interests(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    """
    Retrieve interests.
    """
    statement = select(Interest).offset(skip).limit(limit)
    interests = session.exec(statement).all()
    return interests
