def compute_workloads(
    member_ids: list[int], assignments: list
) -> dict[int, dict[str, int]]:
    workloads = {
        member_id: {"open_weight": 0, "debt": 0, "total": 0}
        for member_id in member_ids
    }

    for assignment in assignments:
        assignee_id = assignment.assignee_id
        if assignee_id not in workloads:
            continue
        if assignment.status == "pending":
            workloads[assignee_id]["open_weight"] += assignment.weight
        elif assignment.status == "overdue":
            workloads[assignee_id]["debt"] += assignment.weight

    for values in workloads.values():
        values["total"] = values["open_weight"] + values["debt"]

    return workloads


def pick_next_member(
    workloads: dict[int, dict[str, int]], last_assignee_id: int | None
) -> int:
    if not workloads:
        raise ValueError("workloads is empty, nothing to pick from")

    lowest_total = min(values["total"] for values in workloads.values())
    tied_ids = sorted(
        member_id
        for member_id, values in workloads.items()
        if values["total"] == lowest_total
    )

    if last_assignee_id is None or last_assignee_id not in workloads:
        return tied_ids[0]

    for member_id in tied_ids:
        if member_id > last_assignee_id:
            return member_id
    return tied_ids[0]