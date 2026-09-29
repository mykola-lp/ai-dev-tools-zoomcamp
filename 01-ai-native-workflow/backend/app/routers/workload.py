from dataclasses import dataclass

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user
from app.models import Assignment, User, UserStatus
from app.rotation import compute_workloads
from app.schemas import WorkloadOut

router = APIRouter(tags=["workload"])


@dataclass
class _WeightedAssignment:
    assignee_id: int
    weight: int
    status: str


@router.get("/workload", response_model=list[WorkloadOut])
def get_workload(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[WorkloadOut]:
    members = list(
        db.scalars(select(User).where(User.status == UserStatus.approved))
    )
    assignments = list(db.scalars(select(Assignment)))
    weighted = [
        _WeightedAssignment(
            assignee_id=a.assignee_id,
            weight=a.chore.weight,
            status=a.status.value,
        )
        for a in assignments
    ]

    workloads = compute_workloads([m.id for m in members], weighted)
    names = {m.id: m.display_name for m in members}

    result = [
        WorkloadOut(member_id=member_id, display_name=names[member_id], **values)
        for member_id, values in workloads.items()
    ]
    result.sort(key=lambda item: (item.total, item.member_id))
    return result
