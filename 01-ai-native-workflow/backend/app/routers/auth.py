from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Role, User, UserStatus
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserOut
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

EMAIL_TAKEN = "A user with this email already exists"
INVALID_CREDENTIALS = "Invalid email or password"
ACCOUNT_PENDING = "Your account is waiting for admin approval"
ACCOUNT_REJECTED = "Your registration was rejected"


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


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            INVALID_CREDENTIALS,
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.status == UserStatus.pending:
        raise HTTPException(status.HTTP_403_FORBIDDEN, ACCOUNT_PENDING)
    if user.status == UserStatus.rejected:
        raise HTTPException(status.HTTP_403_FORBIDDEN, ACCOUNT_REJECTED)

    return TokenResponse(access_token=create_access_token(user.id, user.role.value))