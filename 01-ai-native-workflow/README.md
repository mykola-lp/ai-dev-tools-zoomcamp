# Household Chores

Web app for one household that automatically rotates recurring chores (daily, weekly, monthly) between members, weighted by difficulty. Overdue chores count as debt, members can swap chores through an open board, and the UI updates in real time.

Status: project skeleton. Features are tracked as GitHub issues.

## Stack

- Backend: FastAPI (SQLAlchemy, SQLite and Alembic come with later tasks)
- Frontend: React, Vite, TypeScript, Vitest

## Layout

- `backend/` - FastAPI app and tests
- `frontend/` - React app and tests
- `_docs/` - scope, task list and process

## Run

**Backend** needs Python 3.12 and [uv](https://docs.astral.sh/uv/).

```bash
cd backend
uv sync
uv run pytest                           # run the tests
uv run uvicorn app.main:app --reload    # http://127.0.0.1:8000/docs
```

Environment variables (all optional in development):

- `DATABASE_URL` - default `sqlite:///./app.db`
- `SECRET_KEY` - key used to sign login tokens; the built-in default is for development only, set your own value elsewhere

**Frontend** needs Node.js:

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```

## Test

```bash
cd backend && uv run pytest
cd frontend && npm test
```