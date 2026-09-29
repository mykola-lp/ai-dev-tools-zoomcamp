import logging

from datetime import date, timedelta
from typing import Callable
from dateutil.relativedelta import relativedelta

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models import Assignment, AssignmentStatus, Chore, ChorePeriod, ChoreStatus, User, UserStatus
from app.rotation import compute_workloads, pick_next_member

logger = logging.getLogger(__name__)

PickNext = Callable[[list[int], int | None], int]


def _default_pick_next(db: Session) -> PickNext:
    def pick(candidate_ids: list[int], last_assignee_id: int | None) -> int:
        assignments = list(db.scalars(select(Assignment)))
        weighted = [
            type(
                "WeightedAssignment",
                (),
                {
                    "assignee_id": a.assignee_id,
                    "weight": a.chore.weight,
                    "status": a.status.value,
                },
            )
            for a in assignments
        ]
        workloads = compute_workloads(candidate_ids, weighted)
        return pick_next_member(workloads, last_assignee_id)

    return pick


def _next_due_date(previous_due_date: date | None, today: date, period: ChorePeriod) -> date:
    if previous_due_date is None:
        return today

    if period == ChorePeriod.daily:
        candidate = previous_due_date + timedelta(days=1)
    elif period == ChorePeriod.weekly:
        candidate = previous_due_date + timedelta(days=7)
    else:
        candidate = previous_due_date + relativedelta(months=1)

    return max(today, candidate)


def generate_assignments(
    db: Session, today: date, pick_next: PickNext | None = None
) -> int:
    if pick_next is None:
        pick_next = _default_pick_next(db)

    approved_member_ids = list(
        db.scalars(select(User.id).where(User.status == UserStatus.approved))
    )

    active_chores = list(
        db.scalars(
            select(Chore).where(Chore.status == ChoreStatus.active).order_by(Chore.id)
        )
    )

    created = 0
    for chore in active_chores:
        if not approved_member_ids:
            continue

        latest = db.scalar(
            select(Assignment)
            .where(Assignment.chore_id == chore.id)
            .order_by(Assignment.due_date.desc(), Assignment.id.desc())
        )

        if latest is not None and latest.due_date >= today:
            continue

        due_date = _next_due_date(
            latest.due_date if latest is not None else None, today, chore.period
        )
        last_assignee_id = latest.assignee_id if latest is not None else None

        assignee_id = pick_next(approved_member_ids, last_assignee_id)

        db.add(
            Assignment(
                chore_id=chore.id,
                assignee_id=assignee_id,
                due_date=due_date,
                status=AssignmentStatus.pending,
            )
        )
        db.commit()
        created += 1

    return created


def mark_overdue(db: Session, today: date) -> int:
    result = db.execute(
        update(Assignment)
        .where(Assignment.status == AssignmentStatus.pending)
        .where(Assignment.due_date < today)
        .values(status=AssignmentStatus.overdue)
    )
    db.commit()
    return result.rowcount


def run_scheduler_cycle(db: Session, today: date) -> dict[str, int]:
    marked_overdue = mark_overdue(db, today)
    created = generate_assignments(db, today)
    return {"created": created, "marked_overdue": marked_overdue}
