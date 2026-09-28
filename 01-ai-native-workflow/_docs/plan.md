# Household Chores Tool: Scope

## Overview

A web app for a single household that **automatically rotates recurring chores** between its members. The rotation is round-robin, but weighted by chore difficulty so the total workload stays balanced. Members can swap chores through an open board.

## Key Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Main problem to solve | Automatic scheduling: rotation of chores on a schedule |
| 2 | How chores are distributed | Hybrid: round-robin with weights, plus swaps between people |
| 3 | Who uses it | One household, each member has their own account (web app) |
| 4 | Chore types | Recurring only: daily, weekly, monthly |
| 5 | Overdue chores | The chore stays with the person. Its weight is counted as debt in their workload, so the scheduler compensates next time |
| 6 | Swapping chores | Open board: a member posts a chore, anyone can take it |
| 7 | Notifications | In-app only, with real-time updates (WebSocket) |
| 8 | Who manages chores and weights | Anyone can propose, the admin approves |
| 9 | How people join | Open registration, the admin approves each member |

## In Scope (MVP)

### Accounts and roles
- Open registration; new accounts stay pending until the admin approves them.
- Two roles: **admin** and **member**.

### Chores
- Recurring chores with a period (daily, weekly, monthly) and a **weight** (difficulty).
- Any member can propose a chore. The admin approves it and sets or confirms the weight and period.

### Rotation
- Round-robin assignment across approved members.
- Weights are used to even out the overall workload between members.
- Each member's workload includes any debt from overdue chores.

### Completion
- A member marks their chore as done.
- A chore that is not done by its due date becomes **overdue**. It stays with the same person, and its weight is added to their workload as debt.

### Chore swaps
- A member can post one of their chores to an **open board**.
- Any other member can take it. The assignment then moves to the new person.

### Notifications
- In-app only.
- Real-time updates over WebSocket (new assignment, chore taken from the board, chore approved, and so on).

## Out of Scope (Later)

- Multiple households (multi-tenant).
- One-off chores and flexible schedules (for example "Mondays and Thursdays", "every 2 weeks").
- Email and Telegram notifications.
- Member availability (travel, busy periods).
- Statistics, leaderboards, rewards.

## Open Questions

- Exact formula for how overdue debt affects the next assignment.
- What happens to a chore posted on the board if nobody takes it before its due date.
- Whether the admin can reassign a chore manually.
- Due-date granularity (end of day, or a specific time).

## Suggested Tech Stack (aligned with the course)

- **Backend:** FastAPI, with an OpenAPI contract defined first.
- **Frontend:** prototype first with mocked data, then connected to the real API.
- **Storage:** SQLite (moving to Postgres in a later module).
- **Real-time:** WebSocket.
- **Auth:** simple token-based auth with admin/member roles.
- **Tests:** unit and integration tests for the rotation logic and API.