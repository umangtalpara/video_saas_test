# How to Use the SaaS AI Factory

This workspace turns a Product Requirements Document (PRD) into a working SaaS application. Cooperating AI agents ask you a short questionnaire, scaffold the project, plan phases, write and test the code, review it and prepare deployment.

It works in **Claude Code**, **Cursor** and **Google Antigravity** (see the [README](../README.md#tool-compatibility)). You do not run setup steps by hand — you answer questions and approve results.

---

## Getting Started

### Step 1: Fill in your PRD
Edit **[doc/prd.md](prd.md)** (template with guidance: `.ai/templates/prd-template.md`). The more specific the PRD — features, user roles, key screens, acceptance criteria — the better the generated code.

### Step 2: Start the factory
In your AI tool, say:
> *I have completed my PRD at doc/prd.md. Please ingest it and start the factory.*

Or run the slash command / skill **`/factory-prd-to-plan`**.

### Step 3: Answer the discovery questions
The agent asks these in chat and records each answer itself (you never edit config files). Items marked **compulsory** are always asked.

| # | Question | Typical answers |
|---|----------|-----------------|
| 1 | Project structure *(compulsory)* | Shared monorepo (with `shared/` package) · Decoupled standalone backend/frontend |
| 2 | Deployment *(compulsory)* | Docker/Compose · Manual / PaaS (Vercel, Render, ...) |
| 3 | Git strategy | Single repo · 3-repo setup (main + backend + frontend) · Skip. SSH links are verified before use |
| 4 | Database *(compulsory)* | MongoDB (Mongoose) · PostgreSQL/MySQL (Prisma) |
| 5 | Caching | Redis (needed for BullMQ queues) · Local in-memory |
| 6 | Multi-tenancy *(compulsory)* | Multi-tenant SaaS with RBAC · Single organisation |
| 7 | Email *(compulsory)* | SMTP · Resend · SendGrid · Amazon SES · Mailgun |
| 8 | File storage *(compulsory)* | AWS S3 · DigitalOcean Spaces · Cloudinary · Local disk |
| 9 | Logging *(compulsory)* | Datadog · ELK · CloudWatch · Console only |
| 10 | Payments *(compulsory)* | Stripe · PayPal · Razorpay · None |
| 11 | Real-time *(compulsory)* | WebSockets · SSE · None |

---

## What Happens Next

```
PRD ingestion → Discovery Q&A → Scaffold → Planning → Phase execution → QA → Code review → Deployment prep
```

1. **Ingestion** – Super Agent validates `doc/prd.md` against the template.
2. **Discovery** – the 11 questions above; answers saved to `.ai/memory/state.json`.
3. **Scaffold** – `scaffold-starter.js` generates `package.json`, `tsconfig`, Jest/Playwright config, `.env`/`.env.example` (with a random JWT secret) and an infrastructure `docker-compose.yml`. Then `npm install` is run in each app.
4. **Planning** – Deep Planning Agent designs architecture, DB schema and API, then splits the PRD into **5–10 phases**. Every phase contains Backend, Frontend, QA and Code Review tasks. `validate-plan` must pass before development starts.
5. **Execution, one phase at a time** – each phase runs four stages in strict order:
   1. **Backend** – all backend tasks of the phase (code + tests)
   2. **Frontend** – all frontend tasks (against the finished APIs)
   3. **QA** – unit, API-contract and Playwright E2E tests, coverage
   4. **Code Review** – security / performance / quality gate. `CHANGES_REQUESTED` sends only the affected tasks back (max 3 rounds), then the review repeats.

   Every task is validated (`validate-project.js --tsc`), tested and committed. A task that fails 3 times is **BLOCKED** and the agent asks you.
6. **Phase close-out** – when the review is APPROVED the agent runs `complete-phase`, which refreshes **every** file in `.ai/project-management/` and `.ai/memory/` (status, progress, current phase, roadmap, agent status, completed tasks, phase report, blockers, execution/retry logs, decisions), commits and tags the phase, tells you what was delivered and starts the next phase.
7. **Deployment prep** – after the last phase, `/factory-testing` and `/factory-deployment`.

```
Phase 1 ─ Backend → Frontend → QA → Review ─ close-out ─┐
Phase 2 ─ Backend → Frontend → QA → Review ─ close-out ─┤  (5–10 phases)
   …                                                     │
Phase N ─ Backend → Frontend → QA → Review ─ close-out ─┘ → testing → deployment
```

If a session stops, just say *"continue"* — the agent resumes from `.ai/memory/state.json` (`status-manager.js status` / `next`).

---

## Monitoring Progress

Open the generated dashboards in **`.ai/project-management/`**: [project-status.md](../.ai/project-management/project-status.md), [progress.md](../.ai/project-management/progress.md), [roadmap.md](../.ai/project-management/roadmap.md), [current-phase.md](../.ai/project-management/current-phase.md), [agent-status.md](../.ai/project-management/agent-status.md). Blockers are in `.ai/memory/blockers.md`.

These files are **generated** — don't edit them. Quick view in a terminal:

```bash
node .ai/scripts/status-manager.js status
```

### If a task is BLOCKED
Read the blocker in `.ai/memory/blockers.md`, tell the agent what to do (or fix the cause), and it will run `status-manager.js resolve-blocker` and continue.

---

## Slash Commands / Skills

| Command | Purpose |
|---------|---------|
| `/factory-prd-to-plan` | PRD → discovery → scaffold → plan |
| `/factory-roadmap-to-phase` | Activate the next phase |
| `/factory-phase-execution` | Run the active phase |
| `/factory-testing` | Full test pipeline |
| `/factory-deployment` | Deployment checklist, Docker, CI/CD |
| `/factory-bug-fix` | Hotfix loop |
| `/factory-feature-addition` | Add a feature as a new phase |

(Claude Code and Antigravity expose them as skills; Cursor also as `.cursor/commands`.)

---

## Developer CLI

```bash
node .ai/scripts/status-manager.js help        # full command list
node .ai/scripts/validate-project.js --tsc     # architecture + naming + type-check
node .ai/scripts/scaffold-starter.js --help    # scaffold options
node .ai/scripts/sync-adapters.js              # regenerate .claude/.cursor/.agents after editing .ai/
node .ai/scripts/git-sync.js push-all          # 3-repo strategy: push backend/frontend subtrees
```

---

## Post-Development Maintenance

### Fix a bug
1. Copy `.ai/templates/bug-template.md` to `doc/bugs/<bug-name>.md` and fill it in.
2. Run `/factory-bug-fix` or tell the agent:
   > *I created a bug report at doc/bugs/<bug-name>.md. Investigate, write a reproducing test and fix it.*

### Add a feature
1. Copy `.ai/templates/feature-template.md` to `doc/features/<feature-name>.md` and fill it in.
2. Run `/factory-feature-addition` or tell the agent:
   > *I added a feature request at doc/features/<feature-name>.md. Analyse the impact, add it as a new phase and implement it.*

---

## Customising the Factory

Edit only the canonical sources in `.ai/` (`agents/`, `skills/`, `workflows/`, `context/`), then run `node .ai/scripts/sync-adapters.js`. Files in `.claude/`, `.cursor/` and `.agents/` are generated and will be overwritten.
