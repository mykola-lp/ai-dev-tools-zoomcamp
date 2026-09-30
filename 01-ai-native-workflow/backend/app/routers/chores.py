from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ws import manager
from app.db import get_db
from app.deps import get_current_user, require_admin
from app.models import Chore, ChoreStatus, User
from app.schemas import ChoreApprove, ChoreCreate, ChoreOut

router = APIRouter(tags=["chores"])


@router.post("/chores", response_model=ChoreOut, status_code=status.HTTP_201_CREATED)
def propose_chore(
    payload: ChoreCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Chore:
    chore = Chore(
        title=payload.title,
        description=payload.description,
        period=payload.period,
        weight=payload.weight,
        status=ChoreStatus.proposed,
        proposed_by_id=user.id,
    )
    db.add(chore)
    db.commit()
    db.refresh(chore)
    return chore


@router.get("/chores", response_model=list[ChoreOut])
def list_chores(
    status_filter: ChoreStatus = Query(ChoreStatus.active, alias="status"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Chore]:
    query = select(Chore).where(Chore.status == status_filter)
    if status_filter == ChoreStatus.proposed and user.role.value != "admin":
        query = query.where(Chore.proposed_by_id == user.id)
    query = query.order_by(Chore.created_at, Chore.id)
    return list(db.scalars(query))


@router.post(
    "/admin/chores/{chore_id}/approve",
    response_model=ChoreOut,
    dependencies=[Depends(require_admin)],
)
def approve_chore(
    chore_id: int,
    payload: ChoreApprove,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> Chore:
    chore = db.get(Chore, chore_id)
    if chore is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Chore not found")

    if payload.weight is not None:
        chore.weight = payload.weight
    if payload.period is not None:
        chore.period = payload.period
    chore.status = ChoreStatus.active

    db.commit()
    db.refresh(chore)
    background_tasks.add_task(
        manager.broadcast,
        {"type": "chore.approved", "payload": {"chore_id": chore.id}},
    )
    return chore
