from collections.abc import Iterator

import pytest  # pyright: ignore[reportMissingImports]
from fastapi.testclient import TestClient  # pyright: ignore[reportMissingImports]
from sqlalchemy import create_engine  # pyright: ignore[reportMissingImports]
from sqlalchemy.orm import Session, sessionmaker  # pyright: ignore[reportMissingImports]

from app.db import Base, get_db
from app.main import app


@pytest.fixture
def db_session(tmp_path) -> Iterator[Session]:
    """A fresh temporary SQLite database for every test."""
    engine = create_engine(
        f"sqlite:///{tmp_path / 'test.db'}",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture
def client(db_session: Session) -> Iterator[TestClient]:
    def override_get_db() -> Iterator[Session]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()