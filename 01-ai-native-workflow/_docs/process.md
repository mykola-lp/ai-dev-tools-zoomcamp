# Process

How work is organized in this project.

- Tasks are GitHub issues, one at a time. Take the next open issue whose dependencies are closed
- Read the issue before starting: Goal, Requirements, Out of scope, and "How to verify" (the acceptance criteria)
- Stay inside the issue. If something outside it needs changing, open a new issue instead of expanding this one
- Commit regularly, in small steps, with messages that reference the issue (for example `Add login endpoint (#4)`)
- Before closing, run the checks from "How to verify" and confirm every requirement is met
- Close the issue only when its tests pass and the working tree is committed. Then tick its box in the backlog issue (#1)
- If a requirement is unclear or the issue contradicts the code, stop and ask rather than guess