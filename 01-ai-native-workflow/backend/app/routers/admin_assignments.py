from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import require_admin
from app.scheduler import generate_assignments

router = APIRouter(
    prefix="/admin/assignments",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
)


@router.post("/generate")
def generate(db: Session = Depends(get_db)) -> dict[str, int]:
    created = generate_assignments(db, today=date.today())
    return {"created": created}
