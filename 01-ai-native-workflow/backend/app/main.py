from fastapi import FastAPI  # pyright: ignore[reportMissingImports]

app = FastAPI(title="Household Chores")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}