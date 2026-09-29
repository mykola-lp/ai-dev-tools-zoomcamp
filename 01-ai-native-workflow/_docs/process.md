# Development Process

## Task tracking

- GitHub issues are the active source of work.
- Work on one issue at a time. Do not begin the next issue without approval.
- `_docs/tasks.md` is the original backlog and a reference only.
- PM - grooms a task before anyone implements it, follows _docs/team/pm.md.
- Engineer - implements one groomed task, follows _docs/team/software-engineer.md.
- QA - checks the result against the acceptance criteria, follows _docs/team/qa-engineer.md.

## Issue workflow

1. Tasks are GitHub issues, one at a time. Take the next open issue whose dependencies are closed
2. Read the issue before starting: Goal, Requirements, Out of scope, and "How to verify" (the acceptance criteria)
3. Implement only the approved issue scope.
4. Commit regularly, in small steps, with messages that reference the issue (for example `Add login endpoint (#4)`)
5. Before closing, run the checks from "How to verify" and confirm every requirement is met
6. Close the issue only when its tests pass and the working tree is committed. Then tick its box in the backlog issue (#1)
7. If a requirement is unclear or the issue contradicts the code, stop and ask rather than guess
