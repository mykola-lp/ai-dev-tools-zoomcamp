from datetime import date

import pytest
from sqlalchemy import select

from app.models import Assignment, AssignmentStatus, Chore, ChorePeriod, ChoreStatus, Role, User, UserStatus
from app.scheduler import generate_assignments

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


def make_active_chore(db_session, proposer_id, title="Wash dishes", period=ChorePeriod.daily, weight=3):
    chore = Chore(
        title=title,
        period=period,
        weight=weight,
        status=ChoreStatus.active,
        proposed_by_id=proposer_id,
    )
    db_session.add(chore)
    db_session.commit()
    db_session.refresh(chore)
    return chore


def round_robin_pick(candidate_ids, last_assignee_id):
    ids = sorted(candidate_ids)
    if last_assignee_id is None or last_assignee_id not in ids:
        return ids[0]
    for member_id in ids:
        if member_id > last_assignee_id:
            return member_id
    return ids[0]


def test_first_occurrence_created(client, db_session):
    admin = make_approved_member(client, db_session, "admin@example.com", "Admin")
    chore = make_active_chore(db_session, admin.id)
    today = date(2026, 1, 10)

    created = generate_assignments(db_session, today, pick_next=round_robin_pick)

    assert created == 1
    assignment = db_session.scalar(select(Assignment))
    assert assignment.due_date == today
    assert assignment.assignee_id == admin.id


def test_no_duplicate_on_second_run(client, db_session):
    admin = make_approved_member(client, db_session, "admin@example.com", "Admin")
    make_active_chore(db_session, admin.id)
    today = date(2026, 1, 10)

    generate_assignments(db_session, today, pick_next=round_robin_pick)
    created_again = generate_assignments(db_session, today, pick_next=round_robin_pick)

    assert created_again == 0
    assert db_session.scalar(select(Assignment).order_by(Assignment.id.desc())) is not None
    assert len(list(db_session.scalars(select(Assignment)))) == 1


def test_daily_due_date_calculation(client, db_session):
    admin = make_approved_member(client, db_session, "admin@example.com", "Admin")
    chore = make_active_chore(db_session, admin.id, period=ChorePeriod.daily)
    db_session.add(
        Assignment(
            chore_id=chore.id,
            assignee_id=admin.id,
            due_date=date(2026, 1, 10),
            status=AssignmentStatus.done,
        )
    )
    db_session.commit()

    generate_assignments(db_session, date(2026, 1, 11), pick_next=round_robin_pick)

    latest = db_session.scalar(select(Assignment).order_by(Assignment.id.desc()))
    assert latest.due_date == date(2026, 1, 11)


def test_weekly_due_date_calculation(client, db_session):
    admin = make_approved_member(client, db_session, "admin@example.com", "Admin")
    chore = make_active_chore(db_session, admin.id, period=ChorePeriod.weekly)
    db_session.add(
        Assignment(
            chore_id=chore.id,
            assignee_id=admin.id,
            due_date=date(2026, 1, 10),
            status=AssignmentStatus.done,
        )
    )
    db_session.commit()

    generate_assignments(db_session, date(2026, 1, 17), pick_next=round_robin_pick)

    latest = db_session.scalar(select(Assignment).order_by(Assignment.id.desc()))
    assert latest.due_date == date(2026, 1, 17)


def test_monthly_due_date_calculation(client, db_session):
    admin = make_approved_member(client, db_session, "admin@example.com", "Admin")
    chore = make_active_chore(db_session, admin.id, period=ChorePeriod.monthly)
    db_session.add(
        Assignment(
            chore_id=chore.id,
            assignee_id=admin.id,
            due_date=date(2026, 1, 10),
            status=AssignmentStatus.done,
        )
    )
    db_session.commit()

    generate_assignments(db_session, date(2026, 2, 10), pick_next=round_robin_pick)

    latest = db_session.scalar(select(Assignment).order_by(Assignment.id.desc()))
    assert latest.due_date == date(2026, 2, 10)


def test_month_end_clamping(client, db_session):
    admin = make_approved_member(client, db_session, "admin@example.com", "Admin")
    chore = make_active_chore(db_session, admin.id, period=ChorePeriod.monthly)
    db_session.add(
        Assignment(
            chore_id=chore.id,
            assignee_id=admin.id,
            due_date=date(2026, 1, 31),
            status=AssignmentStatus.done,
        )
    )
    db_session.commit()

    generate_assignments(db_session, date(2026, 2, 28), pick_next=round_robin_pick)

    latest = db_session.scalar(select(Assignment).order_by(Assignment.id.desc()))
    assert latest.due_date == date(2026, 2, 28)


def test_chore_with_no_approved_members_is_skipped(db_session):
    proposer = User(
        email="pending@example.com",
        password_hash="irrelevant",
        display_name="Pending",
        role=Role.member,
        status=UserStatus.pending,
    )
    db_session.add(proposer)
    db_session.commit()
    db_session.refresh(proposer)
    make_active_chore(db_session, proposer.id)

    created = generate_assignments(db_session, date(2026, 1, 10), pick_next=round_robin_pick)

    assert created == 0
    assert list(db_session.scalars(select(Assignment))) == []


def test_two_chores_go_to_different_members_when_tied(client, db_session):
    anna = make_approved_member(client, db_session, "anna@example.com", "Anna")
    bob = make_approved_member(client, db_session, "bob@example.com", "Bob")
    make_active_chore(db_session, anna.id, title="Chore A")
    make_active_chore(db_session, anna.id, title="Chore B")

    generate_assignments(db_session, date(2026, 1, 10))

    assignees = {a.assignee_id for a in db_session.scalars(select(Assignment))}
    assert assignees == {anna.id, bob.id}


def test_round_robin_uses_chores_own_last_assignee(client, db_session):
    anna = make_approved_member(client, db_session, "anna@example.com", "Anna")
    bob = make_approved_member(client, db_session, "bob@example.com", "Bob")
    chore = make_active_chore(db_session, anna.id, period=ChorePeriod.daily)
    db_session.add(
        Assignment(
            chore_id=chore.id,
            assignee_id=bob.id,
            due_date=date(2026, 1, 10),
            status=AssignmentStatus.done,
        )
    )
    db_session.commit()

    generate_assignments(db_session, date(2026, 1, 12), pick_next=round_robin_pick)

    latest = db_session.scalar(select(Assignment).order_by(Assignment.id.desc()))
    assert latest.assignee_id == anna.id


def test_member_gets_403_on_generate_endpoint(client, db_session):
    register(client, "admin@example.com", "Admin")
    member = make_approved_member(client, db_session, "anna@example.com", "Anna")
    token = client.post(
        "/auth/login", json={"email": "anna@example.com", "password": PASSWORD}
    ).json()["access_token"]

    response = client.post(
        "/admin/assignments/generate", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 403
