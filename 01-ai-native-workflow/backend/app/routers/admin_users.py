from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import require_admin
from app.models import Role, User, UserStatus
from app.schemas import UserOut

router = APIRouter(
    prefix="/admin/users",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
)


@router.get("", response_model=list[UserOut])
def list_users(
    status_filter: UserStatus = Query(UserStatus.pending, alias="status"),
    db: Session = Depends(get_db),
) -> list[User]:
    query = (
        select(User)
        .where(User.status == status_filter)
        .order_by(User.created_at, User.id)
    )
    return list(db.scalars(query))


def _set_status(user_id: int, new_status: UserStatus, db: Session) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.role == Role.admin:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "The status of an admin cannot be changed"
        )
    user.status = new_status
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/approve", response_model=UserOut)
def approve_user(user_id: int, db: Session = Depends(get_db)) -> User:
    return _set_status(user_id, UserStatus.approved, db)


@router.post("/{user_id}/reject", response_model=UserOut)
def reject_user(user_id: int, db: Session = Depends(get_db)) -> User:
    return _set_status(user_id, UserStatus.rejected, db)