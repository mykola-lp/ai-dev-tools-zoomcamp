import pytest
from sqlalchemy import select

from app.models import Assignment, AssignmentStatus, Chore, ChorePeriod, ChoreStatus, User, UserStatus
from datetime import date

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


def make_approved_member(client, db_session, email, name):
    register(client, email, name)
    user = db_session.scalar(select(User).where(User.email == email))
    user.status = UserStatus.approved
    db_session.commit()
    return user


def test_workload_endpoint_sorted_by_total(client, db_session):
    register(client, "admin@example.com", "Admin")
    admin_headers = auth(client, "admin@example.com")
    anna = make_approved_member(client, db_session, "anna@example.com", "Anna")
    bob = make_approved_member(client, db_session, "bob@example.com", "Bob")

    chore = Chore(
        title="Wash dishes",
        period=ChorePeriod.daily,
        weight=5,
        status=ChoreStatus.active,
        proposed_by_id=anna.id,
    )
    db_session.add(chore)
    db_session.commit()
    db_session.refresh(chore)

    db_session.add(
        Assignment(
            chore_id=chore.id,
            assignee_id=bob.id,
            due_date=date.today(),
            status=AssignmentStatus.overdue,
        )
    )
    db_session.commit()

    response = client.get("/workload", headers=admin_headers)

    assert response.status_code == 200
    body = response.json()
    totals = {item["member_id"]: item["total"] for item in body}
    assert totals[anna.id] == 0
    assert totals[bob.id] == 5
    assert [item["member_id"] for item in body][0] == anna.id


def test_workload_endpoint_requires_auth(client):
    response = client.get("/workload")

    assert response.status_code == 401
