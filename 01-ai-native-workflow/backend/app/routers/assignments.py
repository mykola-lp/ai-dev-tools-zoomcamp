from datetime import datetime, timezone

from app.ws import manager

from fastapi import BackgroundTasks, APIRouter, Depends, Query, HTTPException, status
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


@router.post("/{assignment_id}/complete", response_model=AssignmentOut)
def complete_assignment(
    assignment_id: int,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AssignmentOut:
    assignment = db.get(Assignment, assignment_id)
    if assignment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    if assignment.assignee_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your assignment")
    if assignment.status == AssignmentStatus.done:
        raise HTTPException(status.HTTP_409_CONFLICT, "Assignment is already done")

    assignment.status = AssignmentStatus.done
    assignment.completed_at = datetime.now(timezone.utc)
    assignment.on_board = False
    db.commit()
    db.refresh(assignment)
    background_tasks.add_task(
        manager.broadcast,
        {"type": "assignment.completed", "payload": {"assignment_id": assignment.id}},
    )
    return _to_out(assignment)
