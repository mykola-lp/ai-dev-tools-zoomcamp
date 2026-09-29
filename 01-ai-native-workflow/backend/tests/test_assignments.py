from datetime import date, timedelta

import pytest
from sqlalchemy import select

from app.models import Assignment, AssignmentStatus, Chore, ChorePeriod, ChoreStatus, User, UserStatus

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


def make_approved_member(client, db_session, email, name):
    register(client, email, name)
    user = db_session.scalar(select(User).where(User.email == email))
    user.status = UserStatus.approved
    db_session.commit()
    return user


def make_chore(db_session, title, weight=3):
    chore = Chore(
        title=title,
        period=ChorePeriod.daily,
        weight=weight,
        status=ChoreStatus.active,
        proposed_by_id=db_session.scalar(select(User.id)),
    )
    db_session.add(chore)
    db_session.commit()
    db_session.refresh(chore)
    return chore


def make_assignment(db_session, chore, assignee, due_date, status=AssignmentStatus.pending):
    assignment = Assignment(
        chore_id=chore.id,
        assignee_id=assignee.id,
        due_date=due_date,
        status=status,
    )
    db_session.add(assignment)
    db_session.commit()
    db_session.refresh(assignment)
    return assignment


@pytest.fixture
def setup(client, db_session, admin):
    anna = make_approved_member(client, db_session, "anna@example.com", "Anna")
    bob = make_approved_member(client, db_session, "bob@example.com", "Bob")
    chore = make_chore(db_session, "Wash dishes", weight=5)

    today = date.today()
    a1 = make_assignment(db_session, chore, anna, today + timedelta(days=2))
    a2 = make_assignment(db_session, chore, bob, today + timedelta(days=1))
    a3 = make_assignment(db_session, chore, anna, today, status=AssignmentStatus.done)

    return {
        "anna": anna,
        "bob": bob,
        "chore": chore,
        "assignments": [a1, a2, a3],
        "anna_headers": auth(client, "anna@example.com"),
    }


def test_list_all_sorted_by_due_date(client, admin, setup):
    response = client.get("/assignments", headers=admin)

    assert response.status_code == 200
    body = response.json()
    assert [item["id"] for item in body] == [
        setup["assignments"][2].id,
        setup["assignments"][1].id,
        setup["assignments"][0].id,
    ]
    assert body[0]["chore_title"] == "Wash dishes"
    assert body[0]["chore_weight"] == 5


def test_filter_by_assignee(client, admin, setup):
    response = client.get(
        "/assignments", params={"assignee_id": setup["bob"].id}, headers=admin
    )

    body = response.json()
    assert len(body) == 1
    assert body[0]["assignee_display_name"] == "Bob"


def test_filter_by_status(client, admin, setup):
    response = client.get(
        "/assignments", params={"status": "done"}, headers=admin
    )

    body = response.json()
    assert len(body) == 1
    assert body[0]["status"] == "done"


def test_filter_matching_nothing_returns_empty_list(client, admin, setup):
    response = client.get(
        "/assignments", params={"assignee_id": 9999}, headers=admin
    )

    assert response.status_code == 200
    assert response.json() == []


def test_mine_returns_only_current_users_items(client, setup):
    response = client.get("/assignments/mine", headers=setup["anna_headers"])

    body = response.json()
    assert len(body) == 2
    assert all(item["assignee_display_name"] == "Anna" for item in body)
    assert [item["id"] for item in body] == [
        setup["assignments"][2].id,
        setup["assignments"][0].id,
    ]


def test_unauthenticated_request_gets_401(client, setup):
    all_response = client.get("/assignments")
    mine_response = client.get("/assignments/mine")

    assert all_response.status_code == 401
    assert mine_response.status_code == 401
