from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import Assignment, AssignmentStatus, User
from app.schemas import AssignmentOut

router = APIRouter(prefix="/assignments", tags=["assignments"])


def _to_out(assignment: Assignment) -> AssignmentOut:
    return AssignmentOut(
        id=assignment.id,
        chore_id=assignment.chore_id,
        chore_title=assignment.chore.title,
        chore_weight=assignment.chore.weight,
        assignee_id=assignment.assignee_id,
        assignee_display_name=assignment.assignee.display_name,
        due_date=assignment.due_date,
        status=assignment.status,
        on_board=assignment.on_board,
    )


@router.get("", response_model=list[AssignmentOut])
def list_assignments(
    assignee_id: int | None = Query(default=None),
    status_filter: AssignmentStatus | None = Query(default=None, alias="status"),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AssignmentOut]:
    query = select(Assignment)
    if assignee_id is not None:
        query = query.where(Assignment.assignee_id == assignee_id)
    if status_filter is not None:
        query = query.where(Assignment.status == status_filter)
    query = query.order_by(Assignment.due_date, Assignment.id)
    return [_to_out(a) for a in db.scalars(query)]


@router.get("/mine", response_model=list[AssignmentOut])
def list_my_assignments(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AssignmentOut]:
    query = (
        select(Assignment)
        .where(Assignment.assignee_id == user.id)
        .order_by(Assignment.due_date, Assignment.id)
    )
    return [_to_out(a) for a in db.scalars(query)]
