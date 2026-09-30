from datetime import date

from sqlalchemy import select

from app.models import User, UserStatus
from app.scheduler import generate_assignments, mark_overdue

PASSWORD = "password123"


def register(client, email, name):
    return client.post(
        "/auth/register",
        json={"email": email, "password": PASSWORD, "display_name": name},
    )


def login(client, email):
    return client.post("/auth/login", json={"email": email, "password": PASSWORD})


def auth_headers(client, email):
    token = login(client, email).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def get_workload_by_id(client, headers):
    body = client.get("/workload", headers=headers).json()
    return {item["member_id"]: item for item in body}


def test_happy_path(client, db_session):
    # 1. Register an admin and two members; admin approves both
    register(client, "admin@example.com", "Admin")
    admin_headers = auth_headers(client, "admin@example.com")

    register(client, "anna@example.com", "Anna")
    register(client, "bob@example.com", "Bob")
    anna = db_session.scalar(select(User).where(User.email == "anna@example.com"))
    bob = db_session.scalar(select(User).where(User.email == "bob@example.com"))
    client.post(f"/admin/users/{anna.id}/approve", headers=admin_headers)
    client.post(f"/admin/users/{bob.id}/approve", headers=admin_headers)

    # 2. Anna proposes a chore; admin approves it with a weight
    anna_headers = auth_headers(client, "anna@example.com")
    propose_response = client.post(
        "/chores",
        json={"title": "Wash dishes", "period": "daily", "weight": 4},
        headers=anna_headers,
    )
    chore_id = propose_response.json()["id"]
    client.post(
        f"/admin/chores/{chore_id}/approve", json={"weight": 4}, headers=admin_headers
    )

    # 3. Generate the first assignment
    day1 = date(2026, 1, 1)
    first_batch = generate_assignments(db_session, today=day1)
    assert len(first_batch) == 1
    first_assignment = first_batch[0]
    first_assignee_id = first_assignment.assignee_id
    assert first_assignee_id in {anna.id, bob.id}

    first_assignee_headers = (
        anna_headers if first_assignee_id == anna.id else auth_headers(client, "bob@example.com")
    )

    # 4. The first assignee completes it
    complete_response = client.post(
        f"/assignments/{first_assignment.id}/complete", headers=first_assignee_headers
    )
    assert complete_response.status_code == 200
    assert complete_response.json()["status"] == "done"

    # 5. Generate the second occurrence; rotation should pick the other member
    day2 = date(2026, 1, 2)
    second_batch = generate_assignments(db_session, today=day2)
    assert len(second_batch) == 1
    second_assignment = second_batch[0]
    second_assignee_id = second_assignment.assignee_id
    assert second_assignee_id != first_assignee_id

    second_assignee_email = "anna@example.com" if second_assignee_id == anna.id else "bob@example.com"
    second_assignee_headers = auth_headers(client, second_assignee_email)

    # 6. Advance past the due date and mark it overdue
    day3 = date(2026, 1, 5)
    marked = mark_overdue(db_session, today=day3)
    assert marked == 1
    db_session.refresh(second_assignment)
    assert second_assignment.status == "overdue"

    workload_after_overdue = get_workload_by_id(client, admin_headers)
    assert workload_after_overdue[second_assignee_id]["debt"] == 4
    assert workload_after_overdue[first_assignee_id]["debt"] == 0

    # 7. The second assignee posts the overdue assignment to the board
    post_response = client.post(
        f"/assignments/{second_assignment.id}/post-to-board",
        headers=second_assignee_headers,
    )
    assert post_response.status_code == 200
    assert post_response.json()["on_board"] is True

    # 8. The first assignee takes it from the board
    take_response = client.post(
        f"/board/{second_assignment.id}/take", headers=first_assignee_headers
    )
    assert take_response.status_code == 200
    assert take_response.json()["assignee_id"] == first_assignee_id
    assert take_response.json()["on_board"] is False

    workload_after_take = get_workload_by_id(client, admin_headers)
    assert workload_after_take[first_assignee_id]["debt"] == 4
    assert workload_after_take[second_assignee_id]["debt"] == 0
