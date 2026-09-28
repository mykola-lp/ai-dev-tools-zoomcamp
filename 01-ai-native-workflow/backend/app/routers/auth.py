from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Role, User, UserStatus
from app.schemas import RegisterRequest, UserOut
from app.security import hash_password

router = APIRouter(prefix="/auth", tags=["auth"])

EMAIL_TAKEN = "A user with this email already exists"


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> User:
    if db.scalar(select(User.id).where(User.email == payload.email)) is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, EMAIL_TAKEN)

    is_first = db.scalar(select(func.count()).select_from(User)) == 0
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        display_name=payload.display_name,
        role=Role.admin if is_first else Role.member,
        status=UserStatus.approved if is_first else UserStatus.pending,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, EMAIL_TAKEN)
    db.refresh(user)
    return user