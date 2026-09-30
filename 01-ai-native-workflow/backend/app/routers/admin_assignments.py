from datetime import date

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import require_admin
from app.scheduler import generate_assignments
from app.ws import manager

router = APIRouter(
    prefix="/admin/assignments",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
)


@router.post("/generate")
def generate(
    background_tasks: BackgroundTasks, db: Session = Depends(get_db)
) -> dict[str, int]:
    created = generate_assignments(db, today=date.today())
    for assignment in created:
        background_tasks.add_task(
            manager.broadcast,
            {
                "type": "assignment.created",
                "payload": {
                    "assignment_id": assignment.id,
                    "assignee_id": assignment.assignee_id,
                },
            },
        )
    return {"created": len(created)}