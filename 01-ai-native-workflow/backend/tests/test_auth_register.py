from sqlalchemy import select

from app.models import User
from app.security import verify_password

PASSWORD = "password123"


def register(client, email="admin@example.com", password=PASSWORD, name="Admin"):
    return client.post(
        "/auth/register",
        json={"email": email, "password": password, "display_name": name},
    )


def test_first_user_is_approved_admin(client):
    response = register(client)

    assert response.status_code == 201
    body = response.json()
    assert body["role"] == "admin"
    assert body["status"] == "approved"
    assert body["email"] == "admin@example.com"
    assert "password" not in body
    assert "password_hash" not in body


def test_second_user_is_pending_member(client):
    register(client)

    response = register(client, email="anna@example.com", name="Anna")

    assert response.status_code == 201
    assert response.json()["role"] == "member"
    assert response.json()["status"] == "pending"


def test_duplicate_email_returns_409(client):
    register(client)

    response = register(client)

    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_duplicate_email_is_case_insensitive(client):
    register(client, email="anna@example.com")

    response = register(client, email="Anna@Example.com")

    assert response.status_code == 409


def test_email_is_stored_lowercase(client, db_session):
    register(client, email="Admin@Example.COM")

    user = db_session.scalar(select(User))
    assert user.email == "admin@example.com"


def test_short_password_returns_422(client):
    response = register(client, password="short")

    assert response.status_code == 422


def test_invalid_email_returns_422(client):
    response = register(client, email="not-an-email")

    assert response.status_code == 422


def test_password_is_stored_as_hash(client, db_session):
    register(client)

    user = db_session.scalar(select(User))
    assert user.password_hash != PASSWORD
    assert verify_password(PASSWORD, user.password_hash)