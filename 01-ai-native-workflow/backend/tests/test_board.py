from datetime import date

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


def test_post_and_list(client, db_session):
    anna = make_approved_member(client, db_session, "anna@example.com", "Anna")
    chore = make_active_chore(db_session, anna.id)
    assignment = make_assignment(db_session, chore.id, anna.id)
    headers = auth(client, "anna@example.com")

    post_response = client.post(
        f"/assignments/{assignment.id}/post-to-board", headers=headers
    )
    list_response = client.get("/board", headers=headers)

    assert post_response.status_code == 200
    assert post_response.json()["on_board"] is True
    assert len(list_response.json()) == 1
    assert list_response.json()[0]["chore_title"] == "Wash dishes"


def test_non_assignee_cannot_post(client, db_session):
    anna = make_approved_member(client, db_session, "anna@example.com", "Anna")
    bob = make_approved_member(client, db_session, "bob@example.com", "Bob")
    chore = make_active_chore(db_session, anna.id)
    assignment = make_assignment(db_session, chore.id, anna.id)

    response = client.post(
        f"/assignments/{assignment.id}/post-to-board", headers=auth(client, "bob@example.com")
    )

    assert response.status_code == 403


def test_done_assignment_cannot_be_posted(client, db_session):
    anna = make_approved_member(client, db_session, "anna@example.com", "Anna")
    chore = make_active_chore(db_session, anna.id)
    assignment = make_assignment(db_session, chore.id, anna.id, status=AssignmentStatus.done)

    response = client.post(
        f"/assignments/{assignment.id}/post-to-board", headers=auth(client, "anna@example.com")
    )

    assert response.status_code == 409


def test_post_unknown_id_gives_404(client, db_session):
    make_approved_member(client, db_session, "anna@example.com", "Anna")

    response = client.post(
        "/assignments/9999/post-to-board", headers=auth(client, "anna@example.com")
    )

    assert response.status_code == 404


def test_another_member_takes_it_and_it_leaves_board(client, db_session):
    anna = make_approved_member(client, db_session, "anna@example.com", "Anna")
    bob = make_approved_member(client, db_session, "bob@example.com", "Bob")
    chore = make_active_chore(db_session, anna.id)
    assignment = make_assignment(db_session, chore.id, anna.id, on_board=True)

    response = client.post(
        f"/board/{assignment.id}/take", headers=auth(client, "bob@example.com")
    )
    board_after = client.get("/board", headers=auth(client, "anna@example.com")).json()

    assert response.status_code == 200
    body = response.json()
    assert body["assignee_id"] == bob.id
    assert body["on_board"] is False
    assert board_after == []


def test_own_posting_cannot_be_taken(client, db_session):
    anna = make_approved_member(client, db_session, "anna@example.com", "Anna")
    chore = make_active_chore(db_session, anna.id)
    assignment = make_assignment(db_session, chore.id, anna.id, on_board=True)

    response = client.post(
        f"/board/{assignment.id}/take", headers=auth(client, "anna@example.com")
    )

    assert response.status_code == 400


def test_taking_something_not_on_board_gives_409(client, db_session):
    anna = make_approved_member(client, db_session, "anna@example.com", "Anna")
    bob = make_approved_member(client, db_session, "bob@example.com", "Bob")
    chore = make_active_chore(db_session, anna.id)
    assignment = make_assignment(db_session, chore.id, anna.id, on_board=False)

    response = client.post(
        f"/board/{assignment.id}/take", headers=auth(client, "bob@example.com")
    )

    assert response.status_code == 409


def test_taking_unknown_id_gives_404(client, db_session):
    make_approved_member(client, db_session, "bob@example.com", "Bob")

    response = client.post("/board/9999/take", headers=auth(client, "bob@example.com"))

    assert response.status_code == 404


def test_workload_changes_for_both_after_take(client, db_session):
    anna = make_approved_member(client, db_session, "anna@example.com", "Anna")
    bob = make_approved_member(client, db_session, "bob@example.com", "Bob")
    chore = make_active_chore(db_session, anna.id, weight=6)
    assignment = make_assignment(db_session, chore.id, anna.id, on_board=True)
    headers = auth(client, "bob@example.com")

    client.post(f"/board/{assignment.id}/take", headers=headers)

    workloads = {
        item["member_id"]: item["open_weight"]
        for item in client.get("/workload", headers=headers).json()
    }
    assert workloads[anna.id] == 0
    assert workloads[bob.id] == 6
