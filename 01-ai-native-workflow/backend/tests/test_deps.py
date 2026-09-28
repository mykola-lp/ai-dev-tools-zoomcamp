from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends
from sqlalchemy import select

from app.deps import require_admin
from app.main import app
from app.models import User, UserStatus
from app.security import ALGORITHM, SECRET_KEY

PASSWORD = "password123"


@app.get("/_test/admin-only")
def admin_only(user: User = Depends(require_admin)) -> dict[str, int]:
    return {"id": user.id}


def register(client, email):
    return client.post(
        "/auth/register",
        json={"email": email, "password": PASSWORD, "display_name": "User"},
    )


def token_for(client, email):
    response = client.post("/auth/login", json={"email": email, "password": PASSWORD})
    return response.json()["access_token"]


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def set_status(db_session, email, status):
    user = db_session.scalar(select(User).where(User.email == email))
    user.status = status
    db_session.commit()


def make_approved_member(client, db_session, email="anna@example.com"):
    register(client, email)
    set_status(db_session, email, UserStatus.approved)
    return token_for(client, email)


def test_me_without_token_returns_401(client):
    response = client.get("/me")

    assert response.status_code == 401


def test_me_with_invalid_token_returns_401(client):
    response = client.get("/me", headers=bearer("not-a-token"))

    assert response.status_code == 401


def test_me_with_expired_token_returns_401(client):
    user_id = register(client, "admin@example.com").json()["id"]
    expired = jwt.encode(
        {
            "sub": str(user_id),
            "role": "admin",
            "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    response = client.get("/me", headers=bearer(expired))

    assert response.status_code == 401


def test_me_with_valid_token_returns_user(client):
    register(client, "admin@example.com")
    token = token_for(client, "admin@example.com")

    response = client.get("/me", headers=bearer(token))

    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "admin@example.com"
    assert body["role"] == "admin"
    assert "password_hash" not in body


def test_me_for_user_rejected_after_login_returns_403(client, db_session):
    register(client, "admin@example.com")
    token = make_approved_member(client, db_session)
    set_status(db_session, "anna@example.com", UserStatus.rejected)

    response = client.get("/me", headers=bearer(token))

    assert response.status_code == 403


def test_require_admin_blocks_member(client, db_session):
    register(client, "admin@example.com")
    member_token = make_approved_member(client, db_session)

    response = client.get("/_test/admin-only", headers=bearer(member_token))

    assert response.status_code == 403


def test_require_admin_allows_admin(client):
    register(client, "admin@example.com")
    admin_token = token_for(client, "admin@example.com")

    response = client.get("/_test/admin-only", headers=bearer(admin_token))

    assert response.status_code == 200