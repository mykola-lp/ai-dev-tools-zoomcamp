from datetime import date

from sqlalchemy import select

from app.models import Assignment, AssignmentStatus, Chore, ChorePeriod, ChoreStatus, User, UserStatus
from app.scheduler import mark_overdue, run_scheduler_cycle

PASSWORD = "password123"


def register(client, email, name="User"):
    return client.post(
        "/auth/register",
        json={"email": email, "password": PASSWORD, "display_name": name},
    )


def make_approved_member(client, db_session, email, name):
    register(client, email, name)
    user = db_session.scalar(select(User).where(User.email == email))
    user.status = UserStatus.approved
    db_session.commit()
    return user


def make_active_chore(db_session, proposer_id, period=ChorePeriod.daily):
    chore = Chore(
        title="Wash dishes",
        period=period,
        weight=3,
        status=ChoreStatus.active,
        proposed_by_id=proposer_id,
    )
    db_session.add(chore)
    db_session.commit()
    db_session.refresh(chore)
    return chore


def make_assignment(db_session, chore_id, assignee_id, due_date, status):
    assignment = Assignment(
        chore_id=chore_id, assignee_id=assignee_id, due_date=due_date, status=status
    )
    db_session.add(assignment)
    db_session.commit()
    db_session.refresh(assignment)
    return assignment


def test_pending_past_due_becomes_overdue(client, db_session):
    admin = make_approved_member(client, db_session, "admin@example.com", "Admin")
    chore = make_active_chore(db_session, admin.id)
    assignment = make_assignment(
        db_session, chore.id, admin.id, date(2026, 1, 1), AssignmentStatus.pending
    )

    changed = mark_overdue(db_session, today=date(2026, 1, 5))

    assert changed == 1
    db_session.refresh(assignment)
    assert assignment.status == AssignmentStatus.overdue


def test_done_assignments_are_untouched(client, db_session):
    admin = make_approved_member(client, db_session, "admin@example.com", "Admin")
    chore = make_active_chore(db_session, admin.id)
    assignment = make_assignment(
        db_session, chore.id, admin.id, date(2026, 1, 1), AssignmentStatus.done
    )

    changed = mark_overdue(db_session, today=date(2026, 1, 5))

    assert changed == 0
    db_session.refresh(assignment)
    assert assignment.status == AssignmentStatus.done


def test_pending_due_today_stays_pending(client, db_session):
    admin = make_approved_member(client, db_session, "admin@example.com", "Admin")
    chore = make_active_chore(db_session, admin.id)
    assignment = make_assignment(
        db_session, chore.id, admin.id, date(2026, 1, 5), AssignmentStatus.pending
    )

    changed = mark_overdue(db_session, today=date(2026, 1, 5))

    assert changed == 0
    db_session.refresh(assignment)
    assert assignment.status == AssignmentStatus.pending


def test_mark_overdue_runs_before_generate(client, db_session):
    admin = make_approved_member(client, db_session, "admin@example.com", "Admin")
    chore = make_active_chore(db_session, admin.id, period=ChorePeriod.daily)
    make_assignment(
        db_session, chore.id, admin.id, date(2026, 1, 1), AssignmentStatus.pending
    )

    result = run_scheduler_cycle(db_session, today=date(2026, 1, 2))

    assert result == {"created": 1, "marked_overdue": 1}
    statuses = [a.status for a in db_session.scalars(select(Assignment))]
    assert AssignmentStatus.overdue in statuses
    assert AssignmentStatus.pending in statuses


def test_endpoint_returns_both_counts(client, db_session):
    admin = make_approved_member(client, db_session, "admin@example.com", "Admin")
    token = client.post(
        "/auth/login", json={"email": "admin@example.com", "password": PASSWORD}
    ).json()["access_token"]
    chore = make_active_chore(db_session, admin.id)
    make_assignment(
        db_session, chore.id, admin.id, date.today(), AssignmentStatus.pending
    )

    response = client.post(
        "/admin/scheduler/run", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    body = response.json()
    assert "created" in body
    assert "marked_overdue" in body


def test_member_gets_403_on_scheduler_endpoint(client, db_session):
    register(client, "admin@example.com", "Admin")
    make_approved_member(client, db_session, "anna@example.com", "Anna")
    token = client.post(
        "/auth/login", json={"email": "anna@example.com", "password": PASSWORD}
    ).json()["access_token"]

    response = client.post(
        "/admin/scheduler/run", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 403


def test_scheduler_disabled_when_interval_is_zero(monkeypatch):
    import asyncio

    monkeypatch.setenv("SCHEDULER_INTERVAL_SECONDS", "0")

    from app.main import app

    async def check() -> None:
        async with app.router.lifespan_context(app):
            await asyncio.sleep(0)

    asyncio.run(check())
