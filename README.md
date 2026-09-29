# ai-dev-tools-zoomcamp
Coursework and projects from the DataTalksClub AI Dev Tools Zoomcamp 2026.

## Related articles

A five-part series by Alexey Grigorev (course author) on [aishippingblog.com](https://aishippingblog.com), one article per module. Everything in `AGENTS.md`, `_docs/task-template.md` and the PM/Engineer/QA roles in `_docs/team/` comes from Part 1.

1. [AI-Native Development: Specifications, Loop and Graph Engineering](https://aishippingblog.com/p/ai-native-development-specifications) — turns a vague idea into a spec, then a backlog, then GitHub issues. Introduces the PM/Engineer/QA agent roles, `AGENTS.md` for context engineering, `/goal` loops, and an orchestrator that runs the whole PM→Engineer→QA cycle automatically.
2. [Build and Ship a Full-Stack App with AI Coding Assistants](https://aishippingblog.com/p/build-and-ship-a-full-stack-app-with) — goes from spec to a working app: frontend, an OpenAPI contract so AI-generated frontend and backend code stay in sync, a FastAPI or Django backend, database integration, and unit/integration tests.
3. [Deploy a Full-Stack App with AI Coding Assistants](https://aishippingblog.com/p/deploy-a-full-stack-app-with-ai-coding) — containerizes the app with Docker, moves it to Postgres, and sets up deployment and a CI/CD pipeline with AI assistance.
4. [DevOps and Observability for an AI-Built App](https://aishippingblog.com/p/devops-and-observability-for-an-ai) — adds logging, metrics and tracing (OpenTelemetry, Prometheus, Grafana) to an AI-built app, plus alerting, so problems in production are visible and diagnosable.
5. [Coding Agent Building Blocks: Reusable Skills, Subagents, and MCP](https://aishippingblog.com/p/coding-agent-building-blocks-reusable) — covers the reusable pieces behind coding agents: skills, subagents, custom commands, worktrees and MCP servers.

Separately, the longer, more personal write-up behind Part 1's orchestrator section:

- [I Built an AI Agent Team for Software Development](https://aishippingblog.com/p/i-built-an-ai-agent-team-for-software) — the full story of building a multi-agent PM/Engineer/QA/orchestrator setup for a real project, with more detail and results than the condensed version in Part 1.

## Team roles: inspiration

The PM / Engineer / QA split in this repo follows [Alexey Grigorev's aishippingblog series](#related-articles). A more advanced version of the same idea, with a fourth role, lives in the [AI Shipping Labs website repo](https://github.com/AI-Shipping-Labs/website/tree/main/.claude/agents):

- [Product Manager](https://github.com/AI-Shipping-Labs/website/blob/main/.claude/agents/product-manager.md) — turns a raw task into a spec with user stories and acceptance criteria, then signs off on the finished result from the user's point of view.
- [Software Engineer](https://github.com/AI-Shipping-Labs/website/blob/main/.claude/agents/software-engineer.md) — writes the code and its tests.
- [Tester](https://github.com/AI-Shipping-Labs/website/blob/main/.claude/agents/tester.md) — runs the tests, checks every acceptance criterion, and reports pass or fail with evidence.
- [On-Call Engineer](https://github.com/AI-Shipping-Labs/website/blob/main/.claude/agents/oncall-engineer.md) — watches CI/CD after a push and fixes pipeline failures.

Splitting the work this way keeps each role narrow, makes it harder to skip a step, and — most importantly — keeps the agent that writes the code from being the same one that decides whether it's correct.

We are not adopting the On-Call Engineer role yet: it assumes a CI/CD pipeline, which is module 3/4 territory. Once we containerize and add CI, it's worth revisiting.
