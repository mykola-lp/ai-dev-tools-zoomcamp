import pytest
from sqlalchemy import select

from app.models import User, UserStatus

PASSWORD = "password123"


def register(client, email, name="User"):
    return client.post(
        "/auth/register",
        json={"email": email, "password": PASSWORD, "display_name": name},
    )


def login(client, email):
    return client.post("/auth/login", json={"email": email, "password": PASSWORD})


def auth(client, email):
    token = login(client, email).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin(client):
    """The first registered user: an approved admin."""
    user_id = register(client, "admin@example.com", "Admin").json()["id"]
    return {"id": user_id, "headers": auth(client, "admin@example.com")}


def make_approved_member(client, db_session, email="carl@example.com"):
    register(client, email)
    user = db_session.scalar(select(User).where(User.email == email))
    user.status = UserStatus.approved
    db_session.commit()
    return auth(client, email)


def test_admin_lists_pending_users_oldest_first(client, admin):
    register(client, "anna@example.com")
    register(client, "bob@example.com")

    response = client.get("/admin/users", headers=admin["headers"])

    assert response.status_code == 200
    assert [u["email"] for u in response.json()] == [
        "anna@example.com",
        "bob@example.com",
    ]
    assert all(u["status"] == "pending" for u in response.json())
    assert all("password_hash" not in u for u in response.json())


def test_status_filter(client, admin):
    anna_id = register(client, "anna@example.com").json()["id"]
    client.post(f"/admin/users/{anna_id}/approve", headers=admin["headers"])

    pending = client.get("/admin/users", headers=admin["headers"]).json()
    approved = client.get(
        "/admin/users", params={"status": "approved"}, headers=admin["headers"]
    ).json()

    assert pending == []
    assert "anna@example.com" in [u["email"] for u in approved]


def test_invalid_status_returns_422(client, admin):
    response = client.get(
        "/admin/users", params={"status": "banana"}, headers=admin["headers"]
    )

    assert response.status_code == 422


def test_approve_lets_user_log_in(client, admin):
    anna_id = register(client, "anna@example.com").json()["id"]
    assert login(client, "anna@example.com").status_code == 403

    response = client.post(f"/admin/users/{anna_id}/approve", headers=admin["headers"])

    assert response.status_code == 200
    assert response.json()["status"] == "approved"
    assert login(client, "anna@example.com").status_code == 200


def test_reject_keeps_login_blocked(client, admin):
    anna_id = register(client, "anna@example.com").json()["id"]

    response = client.post(f"/admin/users/{anna_id}/reject", headers=admin["headers"])

    assert response.status_code == 200
    assert response.json()["status"] == "rejected"
    blocked = login(client, "anna@example.com")
    assert blocked.status_code == 403
    assert "rejected" in blocked.json()["detail"]


def test_repeating_an_action_returns_200(client, admin):
    anna_id = register(client, "anna@example.com").json()["id"]

    first = client.post(f"/admin/users/{anna_id}/approve", headers=admin["headers"])
    second = client.post(f"/admin/users/{anna_id}/approve", headers=admin["headers"])

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["status"] == "approved"


def test_rejected_user_can_be_approved_later(client, admin):
    anna_id = register(client, "anna@example.com").json()["id"]
    client.post(f"/admin/users/{anna_id}/reject", headers=admin["headers"])

    response = client.post(f"/admin/users/{anna_id}/approve", headers=admin["headers"])

    assert response.status_code == 200
    assert response.json()["status"] == "approved"
    assert login(client, "anna@example.com").status_code == 200


def test_acting_on_an_admin_returns_400(client, admin):
    approve = client.post(f"/admin/users/{admin['id']}/approve", headers=admin["headers"])
    reject = client.post(f"/admin/users/{admin['id']}/reject", headers=admin["headers"])

    assert approve.status_code == 400
    assert reject.status_code == 400
    assert login(client, "admin@example.com").status_code == 200


def test_unknown_id_returns_404(client, admin):
    approve = client.post("/admin/users/9999/approve", headers=admin["headers"])
    reject = client.post("/admin/users/9999/reject", headers=admin["headers"])

    assert approve.status_code == 404
    assert reject.status_code == 404


def test_approved_member_gets_403(client, db_session, admin):
    anna_id = register(client, "anna@example.com").json()["id"]
    member_headers = make_approved_member(client, db_session)

    listing = client.get("/admin/users", headers=member_headers)
    approve = client.post(f"/admin/users/{anna_id}/approve", headers=member_headers)
    reject = client.post(f"/admin/users/{anna_id}/reject", headers=member_headers)

    assert listing.status_code == 403
    assert approve.status_code == 403
    assert reject.status_code == 403


def test_requests_without_token_get_401(client, admin):
    response = client.get("/admin/users")

    assert response.status_code == 401