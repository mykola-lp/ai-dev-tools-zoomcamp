from datetime import date, timedelta

import anyio
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


def make_active_chore(db_session, proposer_id, weight=3, period=ChorePeriod.daily):
    chore = Chore(
        title="Wash dishes",
        period=period,
        weight=weight,
        status=ChoreStatus.active,
        proposed_by_id=proposer_id,
    )
    db_session.add(chore)
    db_session.commit()
    db_session.refresh(chore)
    return chore


def make_assignment(db_session, chore_id, assignee_id, status=AssignmentStatus.pending, on_board=False):
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


def test_member_approved_event(client, db_session):
    register(client, "admin@example.com", "Admin")
    admin_headers = auth(client, "admin@example.com")
    register(client, "anna@example.com", "Anna")
    anna = db_session.scalar(select(User).where(User.email == "anna@example.com"))

    with client.websocket_connect(f"/ws?token={auth(client, 'admin@example.com')['Authorization'].split()[1]}") as ws:
        client.post(f"/admin/users/{anna.id}/approve", headers=admin_headers)
        event = ws.receive_json()

    assert event == {"type": "member.approved", "payload": {"user_id": anna.id}}


def test_chore_approved_event(client, db_session):
    admin = make_approved_member(client, db_session, "admin@example.com", "Admin")
    admin_headers = auth(client, "admin@example.com")
    propose_response = client.post(
        "/chores",
        json={"title": "Wash dishes", "period": "daily", "weight": 3},
        headers=admin_headers,
    )
    chore_id = propose_response.json()["id"]

    with client.websocket_connect(f"/ws?token={admin_headers['Authorization'].split()[1]}") as ws:
        client.post(f"/admin/chores/{chore_id}/approve", json={}, headers=admin_headers)
        event = ws.receive_json()

    assert event == {"type": "chore.approved", "payload": {"chore_id": chore_id}}


def test_assignment_created_event_from_generate_endpoint(client, db_session):
    admin = make_approved_member(client, db_session, "admin@example.com", "Admin")
    admin_headers = auth(client, "admin@example.com")
    make_active_chore(db_session, admin.id)

    with client.websocket_connect(f"/ws?token={admin_headers['Authorization'].split()[1]}") as ws:
        client.post("/admin/assignments/generate", headers=admin_headers)
        event = ws.receive_json()

    assert event["type"] == "assignment.created"
    assert event["payload"]["assignee_id"] == admin.id


def test_assignment_completed_event(client, db_session):
    anna = make_approved_member(client, db_session, "anna@example.com", "Anna")
    chore = make_active_chore(db_session, anna.id)
    assignment = make_assignment(db_session, chore.id, anna.id)
    headers = auth(client, "anna@example.com")

    with client.websocket_connect(f"/ws?token={headers['Authorization'].split()[1]}") as ws:
        client.post(f"/assignments/{assignment.id}/complete", headers=headers)
        event = ws.receive_json()

    assert event == {
        "type": "assignment.completed",
        "payload": {"assignment_id": assignment.id},
    }


def test_board_posted_event(client, db_session):
    anna = make_approved_member(client, db_session, "anna@example.com", "Anna")
    chore = make_active_chore(db_session, anna.id)
    assignment = make_assignment(db_session, chore.id, anna.id)
    headers = auth(client, "anna@example.com")

    with client.websocket_connect(f"/ws?token={headers['Authorization'].split()[1]}") as ws:
        client.post(f"/assignments/{assignment.id}/post-to-board", headers=headers)
        event = ws.receive_json()

    assert event == {"type": "board.posted", "payload": {"assignment_id": assignment.id}}


def test_board_taken_event(client, db_session):
    anna = make_approved_member(client, db_session, "anna@example.com", "Anna")
    bob = make_approved_member(client, db_session, "bob@example.com", "Bob")
    chore = make_active_chore(db_session, anna.id)
    assignment = make_assignment(db_session, chore.id, anna.id, on_board=True)
    bob_headers = auth(client, "bob@example.com")

    with client.websocket_connect(f"/ws?token={bob_headers['Authorization'].split()[1]}") as ws:
        client.post(f"/board/{assignment.id}/take", headers=bob_headers)
        event = ws.receive_json()

    assert event == {
        "type": "board.taken",
        "payload": {"assignment_id": assignment.id, "assignee_id": bob.id},
    }
