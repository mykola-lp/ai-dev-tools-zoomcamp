from fastapi import FastAPI  # pyright: ignore[reportMissingImports]

from app.routers import auth

app = FastAPI(title="Household Chores")
app.include_router(auth.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}