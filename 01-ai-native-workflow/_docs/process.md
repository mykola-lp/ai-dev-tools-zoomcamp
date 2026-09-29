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
2. Read the issue before starting: Goal, Context, Acceptance Criteria, Out of Scope, and "How to Verify"
3. Implement only the approved issue scope.
4. Commit regularly, in small steps, with messages that reference the issue (for example `Add login endpoint (#4)`)
5. Before closing, run the checks from "How to verify" and confirm every requirement is met
6. QA checks the result against the acceptance criteria and posts PASS or FAIL as a comment
7. On PASS, the PM (or whoever asked for the work) closes the issue and ticks its box 
