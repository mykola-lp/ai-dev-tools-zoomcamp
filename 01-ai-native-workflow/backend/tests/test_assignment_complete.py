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


def make_approved_member(client, db_session, email, name):
    register(client, email, name)
    user = db_session.scalar(select(User).where(User.email == email))
    user.status = UserStatus.approved
    db_session.commit()
    return user


def make_active_chore(db_session, proposer_id, weight=5):
    chore = Chore(
        title="Wash dishes",
        period=ChorePeriod.daily,
        weight=weight,
        status=ChoreStatus.active,
        proposed_by_id=proposer_id,
    )
    db_session.add(chore)
    db_session.commit()
    db_session.refresh(chore)
    return chore


def make_assignment(db_session, chore_id, assignee_id, status, on_board=False):
    assignment = Assignment(
        chore_id=chore_id,
        assignee_id=assignee_id,
        due_date=date.today(),
        status=status,
        on_board=on_board,
    )
    db_session.add(assignment)
    db_session.commit()
    db_session.refresh(assignment)
    return assignment


def test_assignee_completes_a_pending_one(client, db_session):
    anna = make_approved_member(client, db_session, "anna@example.com", "Anna")
    chore = make_active_chore(db_session, anna.id)
    assignment = make_assignment(
        db_session, chore.id, anna.id, AssignmentStatus.pending, on_board=True
    )

    response = client.post(
        f"/assignments/{assignment.id}/complete", headers=auth(client, "anna@example.com")
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "done"
    assert body["on_board"] is False


def test_assignee_completes_an_overdue_one_and_debt_drops(client, db_session):
    anna = make_approved_member(client, db_session, "anna@example.com", "Anna")
    chore = make_active_chore(db_session, anna.id, weight=7)
    assignment = make_assignment(db_session, chore.id, anna.id, AssignmentStatus.overdue)
    headers = auth(client, "anna@example.com")

    before = client.get("/workload", headers=headers).json()
    before_debt = next(item["debt"] for item in before if item["member_id"] == anna.id)
    assert before_debt == 7

    response = client.post(f"/assignments/{assignment.id}/complete", headers=headers)

    assert response.status_code == 200
    after = client.get("/workload", headers=headers).json()
    after_debt = next(item["debt"] for item in after if item["member_id"] == anna.id)
    assert after_debt == 0


def test_other_member_gets_403(client, db_session):
    anna = make_approved_member(client, db_session, "anna@example.com", "Anna")
    bob = make_approved_member(client, db_session, "bob@example.com", "Bob")
    chore = make_active_chore(db_session, anna.id)
    assignment = make_assignment(db_session, chore.id, anna.id, AssignmentStatus.pending)

    response = client.post(
        f"/assignments/{assignment.id}/complete", headers=auth(client, "bob@example.com")
    )

    assert response.status_code == 403


def test_done_twice_gives_409(client, db_session):
    anna = make_approved_member(client, db_session, "anna@example.com", "Anna")
    chore = make_active_chore(db_session, anna.id)
    assignment = make_assignment(db_session, chore.id, anna.id, AssignmentStatus.pending)
    headers = auth(client, "anna@example.com")

    client.post(f"/assignments/{assignment.id}/complete", headers=headers)
    response = client.post(f"/assignments/{assignment.id}/complete", headers=headers)

    assert response.status_code == 409


def test_unknown_id_gives_404(client, db_session):
    anna = make_approved_member(client, db_session, "anna@example.com", "Anna")

    response = client.post(
        "/assignments/9999/complete", headers=auth(client, "anna@example.com")
    )

    assert response.status_code == 404
