from fastapi import FastAPI

from app.routers import admin_users, auth, chores, me

app = FastAPI(title="Household Chores")
app.include_router(auth.router)
app.include_router(me.router)
app.include_router(admin_users.router)
app.include_router(chores.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}