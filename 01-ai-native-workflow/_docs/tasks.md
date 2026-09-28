# Backlog (MVP)

Project context: a web app for one household that automatically rotates recurring chores (daily, weekly, monthly) between members. Rotation is round-robin, weighted by chore difficulty, and overdue chores add their weight to the person's workload as debt. Members can post assignments to an open board where anyone can take them, and the UI updates in real time over WebSocket. Stack: FastAPI, SQLAlchemy, SQLite, Alembic, React (Vite, TypeScript). Roles are `admin` and `member`, registration is open and the admin approves each new member. Layout: `backend/` and `frontend/` in one repository.

MVP boundaries: no Docker, Postgres, deployment or CI yet; no editing or archiving of chores; no email or Telegram notifications; no availability, statistics or multiple households.

## 1. Set up an empty backend project with a passing test
Goal: Have a `backend/` Python project where `pytest` runs and passes.
Description: Create `backend/` with a virtual environment setup, a dependency file (FastAPI, pytest, httpx), an empty `app` package and a `tests/` folder. Add one trivial test (for example `assert True`) and document the command to run it in the README. No endpoints or business logic yet.

## 2. Add the database layer and a health endpoint
Goal: Connect the backend to SQLite and expose `GET /health`.
Description: In an existing FastAPI project, add SQLAlchemy engine and session setup with the URL read from an environment variable (default `sqlite:///./app.db`), initialize Alembic, and provide a session dependency for routes. Add `GET /health` returning `{"status": "ok"}`. Test the endpoint with FastAPI's test client and add a test fixture that gives each test a temporary database.

## 3. Implement the User model and registration
Goal: Let a person register with `POST /auth/register`.
Description: Add a `users` table (id, unique email, password hash, display name, role `admin` or `member`, status `pending`, `approved` or `rejected`) with an Alembic migration. Registration hashes the password and stores the user as `pending` and `member`, except that the very first user becomes an approved admin. Reject duplicate emails and cover both cases with tests.

## 4. Implement login and authentication dependencies
Goal: Let approved users log in and protect endpoints by token and role.
Description: Add `POST /auth/login` that verifies the password and returns a signed JWT with the user id and role, refusing users who are not approved (with a distinct error for pending ones). Add reusable FastAPI dependencies for "current user" (401 on bad token) and "admin only" (403 for members), and a `GET /me` endpoint. Test success, wrong password, pending user and both roles.

## 5. Build member approval endpoints
Goal: Let an admin review pending registrations.
Description: Add admin-only endpoints to list pending users and to approve or reject one by id, using the existing `users` table with a `status` field. Approved users can log in, rejected users cannot. Test that members get 403.

## 6. Implement chores: propose, approve and list
Goal: Let members propose chores and the admin approve them.
Description: Add a `chores` table (title, optional description, period `daily`, `weekly` or `monthly`, integer weight 1-10, status `proposed` or `active`, proposer) with a migration. Add `POST /chores` for approved users (creates a `proposed` chore), an admin-only approve endpoint that can set weight and period, and `GET /chores` with a status filter. Test permissions and the status change.

## 7. Add the Assignment model and listing endpoints
Goal: Represent one occurrence of a chore assigned to one person and let members list them.
Description: Add an `assignments` table (chore id, assignee id, due date, status `pending`, `done` or `overdue`, completed-at, on-board flag) with a migration. Add `GET /assignments` with optional assignee and status filters and `GET /assignments/mine`, each item including chore title, weight, due date and status. Test with assignments inserted directly into the database.

## 8. Implement the workload calculation and rotation function
Goal: Compute each member's workload and pick who gets the next chore.
Description: Write a pure function that, given members with their open assignments, returns each member's workload as the sum of weights of open assignments plus overdue debt (the weight of overdue assignments). Write a second pure function that picks the member with the lowest workload for a chore, breaking ties round-robin after the previous assignee. Expose the numbers through `GET /workload` and unit test ties, a single member and a member with heavy debt.

## 9. Generate assignments for due chores
Goal: Create new assignments automatically when a chore is due.
Description: Add a service function that finds active chores whose next occurrence has no assignment yet, computes the due date from the chore's period, and creates an assignment for the member chosen by a given "pick next member" function (passed in as a parameter, so it can be stubbed in tests). Make it idempotent so a second run creates no duplicates. Add an admin-only endpoint that triggers it and test it.

## 10. Detect overdue assignments and run the scheduler
Goal: Mark missed assignments as overdue and run the generation job periodically.
Description: Add a service function that sets `pending` assignments past their due date to `overdue`; they stay with the same person. Add a background task started with the app that calls this function and the assignment generation function once an hour, plus an admin-only endpoint to trigger both manually. Test the status change and that the manual endpoint works.

## 11. Implement completing an assignment
Goal: Let the assignee mark an assignment as done.
Description: Add `POST /assignments/{id}/complete`, allowed only for the current assignee, that sets status `done` and records the completion time. Reject completing an assignment that is already done or belongs to someone else. Completing an overdue assignment clears it from the person's debt because only open assignments count. Test each case.

## 12. Build the exchange board
Goal: Let members post assignments to an open board and take each other's.
Description: Add `POST /assignments/{id}/post-to-board` (assignee only, not for done assignments), `GET /board` listing everything posted, and `POST /board/{assignment_id}/take`, which reassigns the assignment to the current user and clears the flag. Reject taking your own posting or something no longer on the board. Test permissions and edge cases.

## 13. Add a WebSocket endpoint with authentication
Goal: Let logged-in clients receive real-time events.
Description: Add `/ws` that accepts a token, rejects invalid ones, and keeps a connection manager of connected users with a `broadcast(event)` helper that sends JSON `{type, payload}`. Test connecting with a valid and an invalid token and receiving a broadcast message.

## 14. Broadcast events from existing endpoints
Goal: Push real-time events when household data changes.
Description: Using the existing `broadcast(event)` helper, emit `assignment.created`, `assignment.completed`, `board.posted`, `board.taken`, `chore.approved` and `member.approved` from the corresponding endpoints or services, each with a small payload of ids. Document the event names in the README. Test that a connected test client receives the event after an API call.

## 15. Add a backend end-to-end happy-path test
Goal: Verify the main flow through the API in one test.
Description: Write a test that registers an admin and two members, approves the members, proposes and approves a chore, triggers assignment generation, completes one assignment, lets another go overdue, posts one to the board and takes it. Assert the workload numbers at the end. Use a fresh temporary database.

## 16. Set up an empty frontend project with a passing test
Goal: Have a `frontend/` React and TypeScript project where the test runner passes.
Description: Create `frontend/` with Vite, React, TypeScript, Vitest and React Testing Library. Add one trivial test that renders the root component and document the install, dev and test commands in the README. No features yet.

## 17. Export the OpenAPI schema and build a typed API client
Goal: Give the frontend typed access to the backend.
Description: Add a backend script that writes the FastAPI OpenAPI schema to `backend/openapi.json`, then use `openapi-typescript` to generate types from it in the frontend and write a small fetch wrapper that adds the bearer token and reads the base URL from configuration. Add npm scripts to regenerate the types. Test the wrapper with a mocked `fetch`.

## 18. Build registration, login and the protected app shell
Goal: Let a user register and log in, and protect the rest of the UI.
Description: Add registration and login forms with error display, an auth context that keeps the token and current user, and React Router with a layout containing navigation links (Assignments, Chores, Board, Admin). Redirect unauthenticated users to login, hide the Admin link from members, and show a "waiting for admin approval" message for pending users. Test the redirect and link visibility.

## 19. Build the admin page
Goal: Let an admin approve members and chores from the UI.
Description: Add an admin-only page with a list of pending members (Approve and Reject buttons) and a list of proposed chores where the admin can set weight and period and approve. Refresh the lists after each action and show empty states. Test both lists with mocked API responses.

## 20. Build the chores page
Goal: Let members see active chores and propose new ones.
Description: Add a page listing active chores with title, period and weight, and a form to propose a chore with validation. Show the current user's own proposals with their status. Test the form and list with mocked data.

## 21. Build the assignments page with workload summary
Goal: Let a member see and complete their assignments and see how balanced the household is.
Description: Show the current user's pending and overdue assignments sorted by due date, with an overdue indicator, a "Done" button and a "Post to board" button. Add a compact workload table (open weight, debt and total per member) from the workload endpoint. Test completing an assignment and the button states with mocked data.

## 22. Build the board page
Goal: Let members browse and take assignments others have posted.
Description: List everything on the board with chore title, weight, due date and who posted it, plus a "Take" button that is hidden on the user's own postings and an empty state. Test the take action with a mocked API.

## 23. Add real-time updates on the frontend
Goal: Update the UI live when WebSocket events arrive.
Description: Add a hook that opens the WebSocket with the auth token, reconnects when it drops, and exposes incoming `{type, payload}` events. On each event type, refresh the relevant data (assignments, board, chores, workload, pending members) so pages update without reloading. Test the hook with a mocked WebSocket.

## 24. Write project documentation
Goal: Make the project runnable by someone new.
Description: Write a root README covering what the app does, the stack, how to install and run backend and frontend, how to run all tests, how to regenerate the OpenAPI file and client types, and how to trigger the scheduler manually. Include the list of WebSocket events.