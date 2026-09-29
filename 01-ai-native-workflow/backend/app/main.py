from fastapi import FastAPI

from app.routers import admin_users, assignments, auth, chores, me, workload

app = FastAPI(title="Household Chores")
app.include_router(auth.router)
app.include_router(me.router)
app.include_router(admin_users.router)
app.include_router(chores.router)
app.include_router(assignments.router)
app.include_router(workload.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}