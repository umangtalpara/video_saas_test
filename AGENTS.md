# AI Agent Workspace Rules

This repository is a cooperative AI agent software factory (PRD → SaaS app). The canonical source of every rule, agent, skill and workflow lives in `.ai/`. Tool-specific folders (`.claude/`, `.cursor/`, `.agents/`) are **generated adapters** — never edit them by hand; edit `.ai/` and run `node .ai/scripts/sync-adapters.js`.

## Entry Point (read this first)

When the user asks to build, plan or continue the product from a PRD:

1. Act as the **Super Agent** — read `.ai/agents/super-agent.md` and follow it.
2. Run the workflow `.ai/workflows/prd-to-plan.md` (PRD validation → 11 compulsory Discovery Q&A → scaffolding → deep planning).
3. Then run `.ai/workflows/roadmap-to-phase.md` and `.ai/workflows/phase-execution.md` phase by phase (5–10 phases; each phase = Backend → Frontend → QA → Code Review, closed with `complete-phase`).
4. Delegate to sub-agents by reading their persona file in `.ai/agents/` (`deep-plan-agent`, `backend-agent`, `frontend-agent`, `qa-agent`, `code-review-agent`). Tools with native sub-agent support (Claude Code, Cursor, Antigravity) should use the generated sub-agents of the same name.

Other triggers:

| User intent | Workflow |
|-------------|----------|
| Bug report in `doc/bugs/*.md` | `.ai/workflows/bug-fix.md` |
| Feature spec in `doc/features/*.md` | `.ai/workflows/feature-addition.md` |
| Run the test suites | `.ai/workflows/testing.md` |
| Prepare / perform deployment | `.ai/workflows/deployment.md` |

If resuming (state already exists), read `.ai/memory/state.json` via `node .ai/scripts/status-manager.js status` and continue from the first incomplete task — never redo completed tasks.

## Core Directives

1. **Stack source of truth**: the *chosen* stack lives in `.ai/memory/state.json` → `stack` (filled from the Discovery Q&A). Supported options and versions live in [.ai/context/tech-stack.md](.ai/context/tech-stack.md); layout defaults in [.ai/settings.json](.ai/settings.json).
2. **Coding standards**:
   - Backend: NestJS 11.x, TypeScript 5.x (strict). Database is **MongoDB + Mongoose 8** *or* **PostgreSQL/MySQL + Prisma**, per Q&A. Follow [.ai/context/coding-rules.md](.ai/context/coding-rules.md).
   - Frontend: Next.js 14.x, React 18.x, TypeScript 5.x, Tailwind CSS 3.x, Shadcn UI (Tailwind-v3 compatible CLI). Follow [.ai/context/ui-guidelines.md](.ai/context/ui-guidelines.md).
3. **Background jobs**: no RabbitMQ. If Redis was chosen (Q5) use **BullMQ + Redis**; if local cache was chosen use `@nestjs/schedule` + event emitters.
4. **Architecture**: clean modular monolith; each domain has controller, service, repository and entity layers. Follow [.ai/context/architecture-rules.md](.ai/context/architecture-rules.md).
5. **Naming**: `kebab-case` files/folders, `PascalCase` classes. Follow [.ai/context/naming-rules.md](.ai/context/naming-rules.md).
6. **Skills**: before domain work, load the matching skill (`api`, `architecture`, `backend`, `database`, `frontend`, `security`, `testing`, … see `.ai/skills/`).

## Task Execution & Logging

Progress and status files are **generated** from `.ai/memory/state.json`. Do **not** hand-edit `progress.md`, `current-phase.md`, `project-status.md`, `agent-status.md`, `completed-tasks.md` or the auto block in `roadmap.md`. Use the CLI (`node .ai/scripts/status-manager.js help` lists everything):

```bash
node .ai/scripts/status-manager.js set-stack <key> <value>        # record a Q&A answer
node .ai/scripts/status-manager.js add-phase PHASE-01 "Foundation"
node .ai/scripts/status-manager.js add-task PHASE-01 PHASE-01-BE-001 "User registration" backend-agent P0 --criteria "..."
node .ai/scripts/status-manager.js validate-plan                  # 5-10 phases, each Backend>Frontend>QA>Code Review
node .ai/scripts/status-manager.js set-phase PHASE-01 IN_PROGRESS
node .ai/scripts/status-manager.js request-changes PHASE-01 "findings" --tasks T1,T2   # review CHANGES_REQUESTED
node .ai/scripts/status-manager.js complete-phase PHASE-01 --summary "..." --start-next # close phase, refresh ALL files
node .ai/scripts/status-manager.js update-task PHASE-01-BE-001 status IN_PROGRESS
node .ai/scripts/status-manager.js retry PHASE-01-BE-001 "reason"  # logs retry, auto-BLOCKS after 3
node .ai/scripts/status-manager.js log "message" [agent]          # execution-log.md
node .ai/scripts/status-manager.js next                           # next runnable task
```

Free-form records you write directly: architectural decisions → [.ai/memory/decisions.md](.ai/memory/decisions.md). Blockers → `status-manager.js add-blocker` (renders into [.ai/memory/blockers.md](.ai/memory/blockers.md)).

After code changes run `node .ai/scripts/validate-project.js --tsc` and fix violations before marking a task COMPLETED.
