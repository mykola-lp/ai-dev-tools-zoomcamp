import pytest

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
    register(client, "admin@example.com", "Admin")
    return auth(client, "admin@example.com")


def make_approved_member(client, db_session, email="carl@example.com"):
    from sqlalchemy import select

    from app.models import User, UserStatus

    register(client, email)
    user = db_session.scalar(select(User).where(User.email == email))
    user.status = UserStatus.approved
    db_session.commit()
    return auth(client, email), user.id


def propose(client, headers, title="Wash dishes", period="daily", weight=3):
    return client.post(
        "/chores",
        json={"title": title, "period": period, "weight": weight},
        headers=headers,
    )


def test_member_proposes_a_chore(client, db_session):
    member_headers, member_id = make_approved_member(client, db_session)

    response = propose(client, member_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "proposed"
    assert body["proposed_by_id"] == member_id


def test_proposal_with_invalid_weight_gives_422(client, db_session):
    member_headers, _ = make_approved_member(client, db_session)

    response = propose(client, member_headers, weight=11)

    assert response.status_code == 422


def test_proposal_with_invalid_period_gives_422(client, db_session):
    member_headers, _ = make_approved_member(client, db_session)

    response = client.post(
        "/chores",
        json={"title": "Wash dishes", "period": "yearly", "weight": 3},
        headers=member_headers,
    )

    assert response.status_code == 422


def test_admin_approves_with_overridden_weight_and_period(client, admin, db_session):
    member_headers, _ = make_approved_member(client, db_session)
    chore_id = propose(client, member_headers, period="daily", weight=3).json()["id"]

    response = client.post(
        f"/admin/chores/{chore_id}/approve",
        json={"weight": 7, "period": "weekly"},
        headers=admin,
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "active"
    assert body["weight"] == 7
    assert body["period"] == "weekly"


def test_approve_with_invalid_override_gives_422(client, admin, db_session):
    member_headers, _ = make_approved_member(client, db_session)
    chore_id = propose(client, member_headers).json()["id"]

    response = client.post(
        f"/admin/chores/{chore_id}/approve",
        json={"weight": 0},
        headers=admin,
    )

    assert response.status_code == 422


def test_member_cannot_approve(client, db_session):
    member_headers, _ = make_approved_member(client, db_session)
    chore_id = propose(client, member_headers).json()["id"]

    response = client.post(
        f"/admin/chores/{chore_id}/approve", json={}, headers=member_headers
    )

    assert response.status_code == 403


def test_approve_unknown_id_gives_404(client, admin):
    response = client.post("/admin/chores/9999/approve", json={}, headers=admin)

    assert response.status_code == 404


def test_list_filters_by_status(client, admin, db_session):
    member_headers, _ = make_approved_member(client, db_session)
    active_id = propose(client, member_headers, title="Active one").json()["id"]
    propose(client, member_headers, title="Still proposed")
    client.post(f"/admin/chores/{active_id}/approve", json={}, headers=admin)

    active = client.get("/chores", headers=member_headers).json()
    proposed = client.get(
        "/chores", params={"status": "proposed"}, headers=member_headers
    ).json()

    assert [c["title"] for c in active] == ["Active one"]
    assert [c["title"] for c in proposed] == ["Still proposed"]


def test_admin_sees_all_proposed_chores(client, admin, db_session):
    member_headers, _ = make_approved_member(client, db_session, "carl@example.com")
    other_headers, _ = make_approved_member(client, db_session, "dana@example.com")
    propose(client, member_headers, title="Carl's chore")
    propose(client, other_headers, title="Dana's chore")

    response = client.get(
        "/chores", params={"status": "proposed"}, headers=admin
    )

    titles = {c["title"] for c in response.json()}
    assert titles == {"Carl's chore", "Dana's chore"}


def test_member_does_not_see_others_proposed_chores(client, db_session):
    member_headers, _ = make_approved_member(client, db_session, "carl@example.com")
    other_headers, _ = make_approved_member(client, db_session, "dana@example.com")
    propose(client, member_headers, title="Carl's chore")
    propose(client, other_headers, title="Dana's chore")

    response = client.get(
        "/chores", params={"status": "proposed"}, headers=member_headers
    )

    assert [c["title"] for c in response.json()] == ["Carl's chore"]