from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import Assignment, AssignmentStatus, User
from app.routers.assignments import _to_out
from app.schemas import AssignmentOut

router = APIRouter(tags=["board"])


@router.post("/assignments/{assignment_id}/post-to-board", response_model=AssignmentOut)
def post_to_board(
    assignment_id: int,
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

    assignment.on_board = True
    db.commit()
    db.refresh(assignment)
    return _to_out(assignment)


@router.get("/board", response_model=list[AssignmentOut])
def list_board(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[AssignmentOut]:
    query = (
        select(Assignment)
        .where(Assignment.on_board.is_(True))
        .order_by(Assignment.due_date, Assignment.id)
    )
    return [_to_out(a) for a in db.scalars(query)]


@router.post("/board/{assignment_id}/take", response_model=AssignmentOut)
def take_from_board(
    assignment_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AssignmentOut:
    assignment = db.get(Assignment, assignment_id)
    if assignment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assignment not found")
    if not assignment.on_board:
        raise HTTPException(status.HTTP_409_CONFLICT, "Assignment is not on the board")
    if assignment.assignee_id == user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot take your own posting")

    assignment.assignee_id = user.id
    assignment.on_board = False
    db.commit()
    db.refresh(assignment)
    return _to_out(assignment)
