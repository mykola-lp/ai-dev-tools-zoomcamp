# Backlog

Project context: a web app for one household that automatically rotates recurring chores (daily, weekly, monthly) between members. Rotation is round-robin, weighted by chore difficulty, and overdue chores add their weight to the person's workload as debt. Members can post chores to an open board where anyone can take them, and the UI updates in real time over WebSocket. Stack: FastAPI, SQLAlchemy, SQLite, Alembic, React (Vite, TypeScript). Roles are `admin` and `member`, registration is open and the admin approves each new member. Layout: `backend/` and `frontend/` in one repository.

## 1. Set up an empty backend project with a passing test
Goal: Have a `backend/` Python project where `pytest` runs and passes.
Description: Create `backend/` with a virtual environment setup, a dependency file (FastAPI, pytest, httpx), an empty `app` package and a `tests/` folder. Add one trivial test (for example `assert True`) and document the command to run it in the README. No endpoints or business logic yet.

## 2. Add a health endpoint
Goal: Expose `GET /health` returning `{"status": "ok"}` from a FastAPI app.
Description: In an existing FastAPI project, create the app instance and a health route. Add a test using FastAPI's test client that checks the status code and body. Confirm `/docs` shows the endpoint.

## 3. Configure the database layer
Goal: Connect the backend to SQLite through SQLAlchemy with Alembic migrations ready.
Description: Add SQLAlchemy engine and session setup with the database URL read from an environment variable (default `sqlite:///./app.db`). Initialize Alembic and provide a session dependency for FastAPI routes. Add a test that opens a session against a temporary test database.

## 4. Create the User model and migration
Goal: Store users with a role and an approval status.
Description: Add a `users` table with id, email (unique), password hash, display name, role (`admin` or `member`), status (`pending`, `approved`, `rejected`) and created-at timestamp. Generate an Alembic migration for it. Add a test that inserts and reads back a user.

## 5. Implement registration
Goal: Let a person register with `POST /auth/register`.
Description: Accept email, password and display name, hash the password with a standard library such as `passlib` or `bcrypt`, and store the user with status `pending` and role `member`. The very first registered user becomes an approved admin. Reject duplicate emails with a clear error and cover both cases with tests.

## 6. Implement login and token issuing
Goal: Let approved users log in with `POST /auth/login` and receive an access token.
Description: Verify the password and return a signed JWT containing the user id and role. Refuse login for users whose status is not `approved`, with a distinct error for pending accounts. Add tests for success, wrong password and pending user.

## 7. Add authentication and role dependencies
Goal: Provide reusable FastAPI dependencies for "current user" and "admin only".
Description: Parse the bearer token, load the user and return 401 for missing or invalid tokens. Add an admin-only dependency that returns 403 for members. Add `GET /me` as a sample protected endpoint and test it with a member and an admin.

## 8. Build member approval endpoints
Goal: Let an admin review pending registrations.
Description: Add admin-only endpoints to list pending users and to approve or reject one by id. Approved users can log in, rejected users cannot. Test that members cannot call these endpoints.

## 9. Create the Chore model and proposal endpoint
Goal: Let approved members propose a chore.
Description: Add a `chores` table with title, optional description, period (`daily`, `weekly`, `monthly`), weight (integer 1-10), status (`proposed`, `active`, `archived`) and the proposer. Add `POST /chores` for approved users that creates a chore with status `proposed`. Add a migration and tests.

## 10. Add chore approval and management for admins
Goal: Let an admin approve, edit and archive chores.
Description: Add admin-only endpoints to approve a proposed chore (optionally setting its weight and period), edit a chore, and archive it. Add `GET /chores` returning chores filtered by status, visible to all approved members. Test permissions and status transitions.

## 11. Create the Assignment model
Goal: Represent one occurrence of a chore assigned to one person with a due date.
Description: Add an `assignments` table with chore id, assignee id, due date, status (`pending`, `done`, `overdue`), completed-at timestamp, and a flag showing whether it is on the board. Add a migration and a test that creates an assignment for an existing chore and user. No scheduling logic yet.

## 12. Implement the weighted rotation function
Goal: Write a pure function that picks who gets the next occurrence of a chore.
Description: Given a list of members with their current workload (sum of weights of open assignments plus overdue debt) and the id of who did this chore last, return the member with the lowest workload, breaking ties by round-robin order after the previous assignee. Keep it free of database access so it can be unit tested. Cover ties, a single member, and a heavy-debt member in tests.

## 13. Generate assignments for due chores
Goal: Create new assignments automatically when a chore is due.
Description: Add a service function, plus an admin-only endpoint that triggers it, which finds active chores whose next occurrence has no assignment yet and creates one using the rotation function. Calculate the due date from the chore's period. Make it idempotent so running it twice does not create duplicates, and test that.

## 14. Add assignment listing endpoints
Goal: Let members see what needs doing.
Description: Add `GET /assignments` with optional filters for assignee and status, and `GET /assignments/mine` for the current user. Each item includes the chore title, weight, due date and status. Test that members only see approved-household data and that filters work.

## 15. Implement completing an assignment
Goal: Let the assignee mark an assignment as done.
Description: Add `POST /assignments/{id}/complete`, allowed only for the current assignee, that sets status `done` and records the completion time. Reject completing an assignment that is already done or belongs to someone else. Add tests for each case.

## 16. Detect overdue assignments and track debt
Goal: Mark missed assignments as overdue and count their weight as debt.
Description: Add a service function, plus an admin-only endpoint that triggers it, which marks pending assignments past their due date as `overdue`. Overdue assignments stay with the same person and their weight counts toward that person's workload as debt until completed. Test the status change and that completing an overdue assignment clears the debt.

## 17. Add a workload summary endpoint
Goal: Show how balanced the household is.
Description: Add `GET /workload` returning, for each approved member, the sum of weights of open assignments, the debt from overdue assignments and the total. The rotation function should use the same calculation, so put it in one shared function. Test the numbers with a small fixture of members and assignments.

## 18. Post an assignment to the board
Goal: Let an assignee offer their assignment to the household.
Description: Add `POST /assignments/{id}/post-to-board` (assignee only, status `pending` or `overdue`) that flags the assignment as on the board, and `DELETE` on the same path to withdraw it. Add `GET /board` listing everything currently on the board. Test permissions and that done assignments cannot be posted.

## 19. Take an assignment from the board
Goal: Let any approved member claim a posted assignment.
Description: Add `POST /board/{assignment_id}/take` that reassigns the assignment to the current user and clears the board flag. Reject taking your own posting and taking something that is no longer on the board. Keep the assignment's due date and status, and test the edge cases.

## 20. Add a WebSocket endpoint with authentication
Goal: Let logged-in clients open a WebSocket connection to receive events.
Description: Add `/ws` that accepts a token (query parameter or first message), rejects invalid tokens, and keeps a connection manager tracking connected users. Provide a `broadcast(event)` helper. Test connecting with a valid and an invalid token.

## 21. Broadcast events on changes
Goal: Push real-time events when household data changes.
Description: Emit JSON events such as `assignment.created`, `assignment.completed`, `board.posted`, `board.taken`, `chore.approved` and `member.approved` from the existing endpoints via the broadcast helper. Each event has a `type` and a small `payload` with ids. Test that a connected test client receives the event after the corresponding API call.

## 22. Export and validate the OpenAPI contract
Goal: Keep a committed `openapi.json` that matches the running API.
Description: Add a script that writes the FastAPI OpenAPI schema to `backend/openapi.json` and a test that fails if the committed file is out of date. Add response models and tags where missing so the schema is readable. Document WebSocket event shapes in a short `docs/events.md` since OpenAPI does not cover them.

## 23. Add backend integration tests for the main flow
Goal: Verify the whole happy path through the API.
Description: Write a test that registers an admin and two members, approves the members, proposes and approves a chore, generates assignments, completes one, lets one go overdue, posts one to the board and takes it. Use a fresh temporary database per test run. Assert the workload summary at the end.

## 24. Set up an empty frontend project with a passing test
Goal: Have a `frontend/` React and TypeScript project where the test runner passes.
Description: Create `frontend/` with Vite, React, TypeScript, Vitest and React Testing Library. Add one trivial test that renders the root component. Document install, dev and test commands in the README. No features yet.

## 25. Generate a typed API client from OpenAPI
Goal: Give the frontend typed access to the backend.
Description: Use `openapi-typescript` (or a similar tool) to generate types from `backend/openapi.json`, and write a small fetch wrapper that adds the bearer token and a configurable base URL. Add an npm script to regenerate types. Test the wrapper with a mocked `fetch`.

## 26. Build registration and login pages
Goal: Let a user register and log in from the UI.
Description: Add two forms with validation and error display that call the register and login endpoints. Store the token in memory plus `localStorage` and provide an auth context with the current user. Show a clear "waiting for admin approval" message after registering or when a pending user logs in.

## 27. Add routing and a protected layout
Goal: Have an app shell with navigation and route protection.
Description: Add React Router with a layout containing navigation links (Assignments, Chores, Board, Workload, Admin). Redirect unauthenticated users to login and hide the Admin link from members. Test the redirect and the link visibility.

## 28. Build the admin members page
Goal: Let an admin approve or reject pending registrations in the UI.
Description: Add an admin-only page that lists pending users from the API with Approve and Reject buttons, and refreshes the list after each action. Show an empty state when nobody is waiting. Test it with mocked API responses.

## 29. Build the chores page and proposal form
Goal: Let members see chores and propose new ones.
Description: Add a page listing active chores with title, period and weight, and a form to propose a new chore. Show the member's own proposals with their status. Test form validation and the list rendering with mocked data.

## 30. Add admin chore approval to the UI
Goal: Let an admin review proposed chores and manage active ones.
Description: In the chores page, show admins a "Proposed" section where they can set the weight and period and approve, plus edit and archive actions for active chores. Members must not see these controls. Test both roles with mocked data.

## 31. Build the "my assignments" page
Goal: Let a member see and complete their assignments.
Description: Show the current user's pending and overdue assignments sorted by due date, with a clear overdue indicator and a "Done" button that calls the complete endpoint. Add a "Post to board" button on each item. Test completing an assignment and the button states.

## 32. Build the board page
Goal: Let members browse and take chores others have posted.
Description: List everything on the board with its chore title, weight, due date and who posted it, plus a "Take" button that is hidden on the user's own postings. Add an empty state. Test the take action with a mocked API.

## 33. Build the workload page
Goal: Show how balanced the household is.
Description: Fetch the workload summary and show each member's open weight, debt and total as a simple bar or table. Highlight the member with the highest total. Test rendering with mocked data.

## 34. Add real-time updates on the frontend
Goal: Update the UI live when WebSocket events arrive.
Description: Add a WebSocket hook that connects with the auth token, reconnects on drop, and exposes incoming events. On each event type, invalidate the relevant cached data so assignments, board, chores and workload refresh automatically. Test the hook with a mocked WebSocket.

## 35. Write project documentation
Goal: Make the project runnable by someone new.
Description: Write a root README covering what the app does, the tech stack, how to install and run the backend and frontend, how to run all tests, and how to regenerate the OpenAPI file and client types. Include a short section on the assignment generation and overdue endpoints and how to trigger them manually.