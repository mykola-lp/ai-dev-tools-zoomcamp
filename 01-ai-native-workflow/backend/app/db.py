import os
from collections.abc import Iterator

from sqlalchemy import create_engine  # pyright: ignore[reportMissingImports]
from sqlalchemy.orm import (  # pyright: ignore[reportMissingImports]
    DeclarativeBase,
    Session,
    sessionmaker,
)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

# SQLite connections are bound to a thread by default; FastAPI serves
# requests from a thread pool, so the check has to be turned off.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()