import asyncio
import logging
import os
from contextlib import asynccontextmanager
from datetime import date

from fastapi import FastAPI

from app.db import SessionLocal
from app.routers import admin_assignments, admin_scheduler, admin_users, assignments, auth, chores, me, workload
from app.scheduler import run_scheduler_cycle

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def _scheduler_loop(interval_seconds: int) -> None:
    while True:
        await asyncio.sleep(interval_seconds)
        db = SessionLocal()
        try:
            result = run_scheduler_cycle(db, today=date.today())
            logger.info(
                "scheduler cycle: created=%s marked_overdue=%s",
                result["created"],
                result["marked_overdue"],
            )
        except Exception:
            logger.exception("scheduler cycle failed")
        finally:
            db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    interval_seconds = int(os.getenv("SCHEDULER_INTERVAL_SECONDS", "3600"))
    task = None
    if interval_seconds > 0:
        task = asyncio.create_task(_scheduler_loop(interval_seconds))
    yield
    if task is not None:
        task.cancel()


app = FastAPI(title="Household Chores", lifespan=lifespan)
app.include_router(auth.router)
app.include_router(me.router)
app.include_router(admin_users.router)
app.include_router(chores.router)
app.include_router(assignments.router)
app.include_router(workload.router)
app.include_router(admin_assignments.router)
app.include_router(admin_scheduler.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}