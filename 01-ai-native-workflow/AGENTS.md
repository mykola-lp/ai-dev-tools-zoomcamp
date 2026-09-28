# AGENTS.md

Household chores app: recurring chores (daily, weekly, monthly) rotate between members of one household. Rotation is round-robin, weighted by chore difficulty; overdue chores add their weight to the person's workload as debt. Members swap chores through an open board, and the UI updates in real time over WebSocket.

Stack: FastAPI, SQLAlchemy, SQLite, Alembic (`backend/`); React, Vite, TypeScript, Vitest (`frontend/`).
Scope: `SCOPE.md`. Tasks: `_docs/tasks.md`. Each task is a GitHub issue.

## Documents

- `_docs/process.md` - how work is organized

## Commands

Backend (run in `backend/`):

- `uv sync` - install dependencies
- `uv run pytest` - the whole suite
- `uv run pytest tests/test_x.py` - one test file
- `uv run uvicorn app.main:app --reload` - dev server on :8000
- `uv run alembic upgrade head` - apply migrations
- `uv run alembic revision --autogenerate -m "message"` - new migration
- `uv run python scripts/export_openapi.py` - regenerate `openapi.json`

Frontend (run in `frontend/`):

- `npm install` - install dependencies
- `npm run dev` - dev server on :5173
- `npm test` - the whole suite
- `npm run build` - type check and build
- `npm run gen:api` - regenerate `src/api/schema.d.ts` from `../backend/openapi.json`

## Rules

- Dependencies are added in `pyproject.toml` or `package.json`. Do not add one without asking
- Every change comes with a test; run the relevant suite before finishing
- Any schema change gets an Alembic migration. Never edit an applied migration
- After changing an endpoint or its models, regenerate `openapi.json` and the frontend types, and commit both
- Business logic (rotation, workload, overdue) lives in pure service functions, not in route handlers. Pass dependencies like "pick next member" as parameters so tests can stub them
- Frontend calls the API only through `apiFetch` in `src/api/client.ts`. Do not write raw `fetch` calls
- Keep to the issue: respect its "Out of scope" section. Do not add Docker, Postgres, CI, notifications, chore editing or archiving, or multiple households
- Roles are `admin` and `member`. Protect endpoints with the existing auth dependencies, and never expose password hashes
- Real-time events are `{type, payload}` with ids only. Event names are documented in the README; update it when adding one