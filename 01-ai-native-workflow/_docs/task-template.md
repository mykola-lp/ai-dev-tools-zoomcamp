# Task template

Use this template when grooming or writing an issue. Keep section names and order exactly as below so every issue in the repo reads the same way.

```markdown
## Goal
<One sentence: what can the user or system do once this is done. Not "implement X" — say what becomes possible.>

## Context
<Two or three sentences of what an implementer needs to know before touching this: what already exists, what files or modules it lives in or near, what this depends on. End with `Depends on: #N` if this issue cannot start before another one is done, or "Depends on: nothing" if it can start immediately.>

## Acceptance Criteria
<A checklist. Each line is one fact someone can verify by looking at the running result or the test output — not a restatement of the requirement. If a criterion needs a judgment call to check, rewrite it until it doesn't.>
- [ ] <criterion 1>
- [ ] <criterion 2>
- [ ] ...

## Out of Scope
<Things a reasonable person could assume are included, but are not. For each one that came from the original request, remove it here and add "→ see #N" once the follow-up issue is filed. Never drop something silently — if it's not in this task, say where it went.>
- <item> → see #N
- <item> (not filed yet, needs a follow-up issue)

## How to Verify
<Exact commands to run, and what result means done. For an API or backend task, include the pytest command and the list of cases the tests must cover. For a UI task, describe what to click and what should appear on screen.>
​```bash
<command>
​```
<what passing looks like>
```

## Guidance for whoever grooms the issue

- **Acceptance Criteria vs Requirements.** A requirement says what to build ("add a status filter"). An acceptance criterion says what proves it works ("`GET /admin/users?status=pending` returns only pending users, oldest first"). Write criteria, not a restated requirement list — someone should be able to point at the screen or the test output and say yes or no, with no judgment call.
- **Edge cases.** Before finishing a task, ask: what happens with an empty list, a duplicate action, an invalid input, the wrong role, an id that does not exist, doing the same thing twice? Add the ones that are relevant as their own acceptance criteria.
- **Scope creep.** If the original issue as filed mixes in something that is really a separate task, take it out, file it as its own issue, and link it under Out of Scope. Do not just delete it.
- **Self-contained.** An engineer who has never talked to you should be able to implement the task from this issue plus whatever it links to (other issues, `SCOPE.md`, the README) — nothing that lives only in someone's head.