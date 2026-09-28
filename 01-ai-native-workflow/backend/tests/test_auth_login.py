import jwt
from sqlalchemy import select

from app.models import User, UserStatus
from app.security import ALGORITHM, SECRET_KEY

PASSWORD = "password123"


def register(client, email, name="User", password=PASSWORD):
    return client.post(
        "/auth/register",
        json={"email": email, "password": password, "display_name": name},
    )


def login(client, email, password=PASSWORD):
    return client.post("/auth/login", json={"email": email, "password": password})


def set_status(db_session, email, status):
    user = db_session.scalar(select(User).where(User.email == email))
    user.status = status
    db_session.commit()


def test_successful_login_returns_token(client):
    user_id = register(client, "admin@example.com").json()["id"]

    response = login(client, "admin@example.com")

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    payload = jwt.decode(body["access_token"], SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == str(user_id)
    assert payload["role"] == "admin"
    assert "exp" in payload


def test_login_email_is_case_insensitive(client):
    register(client, "admin@example.com")

    response = login(client, "Admin@Example.com")

    assert response.status_code == 200


def test_wrong_password_returns_401(client):
    register(client, "admin@example.com")

    response = login(client, "admin@example.com", password="wrong-password")

    assert response.status_code == 401


def test_unknown_email_returns_same_401(client):
    register(client, "admin@example.com")
    wrong_password = login(client, "admin@example.com", password="wrong-password")

    unknown = login(client, "nobody@example.com")

    assert unknown.status_code == 401
    assert unknown.json() == wrong_password.json()


def test_very_long_password_returns_401_not_500(client):
    register(client, "admin@example.com")

    response = login(client, "admin@example.com", password="x" * 100)

    assert response.status_code == 401


def test_pending_user_gets_403(client):
    register(client, "admin@example.com")
    register(client, "anna@example.com")

    response = login(client, "anna@example.com")

    assert response.status_code == 403
    assert "waiting" in response.json()["detail"]


def test_rejected_user_gets_distinct_403(client, db_session):
    register(client, "admin@example.com")
    register(client, "anna@example.com")
    set_status(db_session, "anna@example.com", UserStatus.rejected)

    response = login(client, "anna@example.com")

    assert response.status_code == 403
    assert "rejected" in response.json()["detail"]


def test_pending_user_with_wrong_password_gets_401(client):
    register(client, "admin@example.com")
    register(client, "anna@example.com")

    response = login(client, "anna@example.com", password="wrong-password")

    assert response.status_code == 401