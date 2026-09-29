import pytest

from app.rotation import compute_workloads, pick_next_member


class FakeAssignment:
    def __init__(self, assignee_id, weight, status):
        self.assignee_id = assignee_id
        self.weight = weight
        self.status = status


def test_compute_workloads_sums_pending_and_overdue_separately():
    assignments = [
        FakeAssignment(1, 3, "pending"),
        FakeAssignment(1, 5, "overdue"),
        FakeAssignment(1, 2, "done"),
        FakeAssignment(2, 4, "pending"),
    ]

    workloads = compute_workloads([1, 2], assignments)

    assert workloads[1] == {"open_weight": 3, "debt": 5, "total": 8}
    assert workloads[2] == {"open_weight": 4, "debt": 0, "total": 4}


def test_compute_workloads_member_with_no_assignments_gets_zeros():
    workloads = compute_workloads([1, 2, 3], [FakeAssignment(1, 3, "pending")])

    assert workloads[2] == {"open_weight": 0, "debt": 0, "total": 0}
    assert workloads[3] == {"open_weight": 0, "debt": 0, "total": 0}


def test_compute_workloads_empty_member_ids():
    workloads = compute_workloads([], [])

    assert workloads == {}


def test_pick_next_member_lowest_workload_wins():
    workloads = {1: {"total": 5}, 2: {"total": 2}, 3: {"total": 8}}

    assert pick_next_member(workloads, last_assignee_id=None) == 2


def test_pick_next_member_tie_broken_round_robin():
    workloads = {1: {"total": 2}, 2: {"total": 2}, 3: {"total": 8}}

    assert pick_next_member(workloads, last_assignee_id=1) == 2


def test_pick_next_member_wraps_around():
    workloads = {1: {"total": 2}, 2: {"total": 2}, 3: {"total": 8}}

    assert pick_next_member(workloads, last_assignee_id=2) == 1


def test_pick_next_member_last_assignee_not_in_workloads():
    workloads = {1: {"total": 2}, 2: {"total": 2}}

    assert pick_next_member(workloads, last_assignee_id=999) == 1


def test_pick_next_member_single_member():
    workloads = {1: {"total": 0}}

    assert pick_next_member(workloads, last_assignee_id=None) == 1
    assert pick_next_member(workloads, last_assignee_id=1) == 1


def test_pick_next_member_debt_makes_member_highest():
    workloads = {1: {"total": 1}, 2: {"total": 9}}

    assert pick_next_member(workloads, last_assignee_id=None) == 1


def test_pick_next_member_empty_workloads_raises():
    with pytest.raises(ValueError):
        pick_next_member({}, last_assignee_id=None)
