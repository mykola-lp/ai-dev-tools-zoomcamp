from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import require_admin
from app.scheduler import run_scheduler_cycle

router = APIRouter(
    prefix="/admin/scheduler",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
)


@router.post("/run")
def run(db: Session = Depends(get_db)) -> dict[str, int]:
    return run_scheduler_cycle(db, today=date.today())
