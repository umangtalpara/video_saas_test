# SaaS AI Factory

An autonomous, multi-agent software factory. Give it a Product Requirements Document (PRD); cooperating AI agents ask a short discovery questionnaire, scaffold the project, plan phases, write the code, test, review and prepare it for deployment.

It works with **Claude Code**, **Cursor**, **Google Antigravity** and any tool that reads `AGENTS.md` / Agent Skills (`SKILL.md`).

## Repository Structure

```
saasAiAgentWorkFLow/
├── AGENTS.md              ← Shared entry point & rules (read by every tool)
├── CLAUDE.md              ← Claude Code: imports @AGENTS.md
├── GEMINI.md              ← Antigravity: extra notes (AGENTS.md is loaded automatically)
├── README.md              ← This file
│
├── .ai/                   ← SINGLE SOURCE OF TRUTH (edit here)
│   ├── settings.json      ← Directory layout, workflow config, git remotes
│   ├── context/           ← Coding, naming, architecture, tech-stack, UI rules
│   ├── agents/            ← Super, Deep-Plan, Backend, Frontend, QA, Code-Review personas
│   ├── skills/            ← Knowledge skills (backend, database, prisma-sql, auth, payments, ...)
│   ├── workflows/         ← prd-to-plan, roadmap-to-phase, phase-execution, testing, deployment, bug-fix, feature-addition
│   ├── templates/         ← PRD, API, bug, feature, test, review, component, docker templates
│   ├── memory/            ← state.json (machine state) + generated logs, decisions.md (manual)
│   ├── project-management/← GENERATED status dashboards (roadmap, progress, current phase, ...)
│   └── scripts/           ← status-manager, scaffold-starter, validate-project, sync-adapters, git-sync, verify-ssh
│
├── .claude/  .cursor/  .agents/   ← GENERATED adapters. Never edit by hand — run `node .ai/scripts/sync-adapters.js`
│
├── doc/                   ← prd.md, bugs/, features/, how-to-use-ai.md
└── codebase/              ← Generated apps: backend/ (NestJS 11) and frontend/ (Next.js 14)
```

## Tool Compatibility

| Capability | Claude Code | Cursor | Google Antigravity |
|---|---|---|---|
| Shared rules | `CLAUDE.md` → `@AGENTS.md` | `AGENTS.md` + `.cursor/rules/*.mdc` | `AGENTS.md` + `GEMINI.md` + `.agents/rules/*.md` |
| Skills (knowledge + workflows) | `.claude/skills/<name>/SKILL.md` | reads `.claude/skills`, `.agents/skills` | `.agents/skills/<name>/SKILL.md` |
| Slash commands | `/factory-prd-to-plan`, `/factory-testing`, ... | `/factory-*` (`.cursor/commands`) + skills | skills `factory-*` |
| Specialist subagents | `.claude/agents/*.md` | reads `.claude/agents` | `.agents/agents/*.md` |
| Super Agent (orchestrator) | the main session itself (subagents cannot spawn subagents) | main chat | main agent |

The **Super Agent** is the main session: `AGENTS.md` tells whichever tool you use to act as the Super Agent and follow `.ai/agents/super-agent.md`. Backend / Frontend / QA / Code-Review / Deep-Plan agents run as subagents where the tool supports them, or as roles the main agent adopts.

## How to Get Started

1. Fill in **[doc/prd.md](doc/prd.md)**.
2. Open the folder in your tool and say:
   > *I have completed my PRD at doc/prd.md. Ingest it and start the factory.*
   (or run `/factory-prd-to-plan`)
3. Answer the 11 discovery questions in chat. The agent records them, scaffolds `codebase/`, splits the PRD into **5–10 phases**, then builds them one by one. Each phase runs **Backend → Frontend → QA → Code Review** and is closed with `complete-phase`, which refreshes every file in `.ai/project-management/` and `.ai/memory/`.
4. Watch progress in `.ai/project-management/` (generated) or run `node .ai/scripts/status-manager.js status`.

Details: **[doc/how-to-use-ai.md](doc/how-to-use-ai.md)**.

## Maintaining the Factory

`.ai/` is canonical. After editing anything in `.ai/agents`, `.ai/skills`, `.ai/workflows` or `.ai/context`:

```bash
node .ai/scripts/sync-adapters.js          # regenerate .claude / .cursor / .agents
node .ai/scripts/sync-adapters.js --check  # CI: fail if adapters are out of date
```

## Developer CLI

| Command | Purpose |
|---|---|
| `node .ai/scripts/status-manager.js status` | Summary of project, phase and tasks |
| `node .ai/scripts/status-manager.js next` | Next runnable task (respects stage order) |
| `node .ai/scripts/status-manager.js validate-plan` | Plan must have 5–10 phases, each with Backend/Frontend/QA/Review |
| `node .ai/scripts/status-manager.js complete-phase PHASE-0X --summary "…" --start-next` | Close a phase, refresh all status + memory files, start the next |
| `node .ai/scripts/status-manager.js help` | All commands (init, set-stack, add-phase, add-task, update-task, retry, add-blocker, resolve-blocker, log, sync ...) |
| `node .ai/scripts/scaffold-starter.js [--help]` | Generate package.json, tsconfig, jest/playwright config, `.env`, docker-compose from the discovery answers |
| `node .ai/scripts/validate-project.js [--tsc] [--path <dir>]` | Architecture / naming / type-safety audit |
| `node .ai/scripts/verify-ssh.js <ssh-url> ...` | Verify git SSH access before pushing |
| `node .ai/scripts/git-sync.js push-all` | 3-repo strategy: push `backend/` and `frontend/` subtrees |

`status-manager.js` is the only writer of the status markdown files; they are regenerated from `.ai/memory/state.json`.

## Test Layout

Tests travel with each codebase so decoupled repos stay self-contained:

- Backend: unit tests `codebase/backend/src/**/*.spec.ts`; integration/API tests `codebase/backend/test/*.e2e-spec.ts`.
- Frontend: unit tests `codebase/frontend/src/**/*.test.tsx`; Playwright E2E `codebase/frontend/e2e/`.

## Post-Development Maintenance

- **Bug**: copy `.ai/templates/bug-template.md` to `doc/bugs/<name>.md`, then run `/factory-bug-fix` or tell the agent to fix it.
- **Feature**: copy `.ai/templates/feature-template.md` to `doc/features/<name>.md`, then run `/factory-feature-addition`.

## Stack

NestJS 11 · Node 24 LTS · TypeScript 5 · MongoDB (Mongoose 8) or PostgreSQL/MySQL (Prisma 5) · Redis + BullMQ (optional) · Next.js 14 · React 18 · Tailwind 3 · Shadcn UI (`shadcn@2.3.0`). Newer majors exist (see `.ai/context/tech-stack.md` → *Upgrade Path*); the factory is intentionally pinned to the tested set.
