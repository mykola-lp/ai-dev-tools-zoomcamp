# Development Process

## Roles

- **Orchestrator** — the main session. Picks the next issue and launches PM, Engineer and QA as subagents in order. Does not groom, implement or test anything itself.
- **PM** — grooms a task before anyone implements it, follows `_docs/team/pm.md`.
- **Engineer** — implements one groomed task, follows `_docs/team/software-engineer.md`.
- **QA** — checks the result against the acceptance criteria, follows `_docs/team/qa-engineer.md`.

## Task tracking

- GitHub issues are the active source of work.
- Work on one issue at a time. Do not begin the next issue without approval.
- `_docs/tasks.md` is the original backlog and a reference only.

## Issue lifecycle

The orchestrator runs every issue through these steps, in order, without skipping any:

1. Pick the next open issue on GitHub whose dependencies (linked issues under "Depends on") are closed.
2. **PM** grooms it: rewrites it using `_docs/task-template.md`, with checkable acceptance criteria and anything out of scope filed as a linked follow-up issue.
3. **Engineer** implements the groomed issue only. Commits in small steps, with messages that reference the issue (for example `add login endpoint (#4)`). Runs the checks from "How to Verify" before finishing, but does not close the issue.
4. **QA** checks the result against the acceptance criteria and posts a `PASS` or `FAIL` comment on the issue, with reasons for a `FAIL`.
5. On `FAIL`: back to step 3. The engineer reads QA's comment and revises. QA never edits code itself, only reports.
6. On `PASS`: the **orchestrator** closes the issue and ticks its box in the tracking issue.
7. Repeat from step 1 until the backlog is empty.

## Rules

- Step 2 (PM grooming) is never skipped, even for a small issue.
- The engineer never closes an issue, `PASS` or not.
- QA never fixes code — only `PASS` or `FAIL` with reasons.
- The orchestrator closes an issue only after a `PASS` from QA, never earlier.
- If QA reports `FAIL` three times on the same issue, the orchestrator stops the loop and asks the user for direction instead of retrying again.
