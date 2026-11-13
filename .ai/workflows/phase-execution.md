---
name: "phase-execution"
description: "Execute the active phase in order Backend, Frontend, QA, Code Review with retry rules and validation gates before advancing. Use when a phase is active and its tasks must be implemented."
---

# Phase Execution Workflow

## Identity
- **Name**: Phase Execution
- **Trigger**: Phase initialized by roadmap-to-phase workflow
- **Owner**: Super Agent (orchestrates all sub-agents)

## Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    PHASE EXECUTION LOOP                       │
│                                                               │
│  ┌─────────────────────────────┐                             │
│  │  STEP 1: BACKEND AGENT      │                             │
│  │  Execute all backend tasks   │                             │
│  │  for current phase           │                             │
│  └──────────────┬──────────────┘                             │
│                 │                                             │
│        ┌────────┴────────┐                                   │
│        │                 │                                    │
│        ▼                 ▼                                    │
│    [SUCCESS]         [FAILURE]                                │
│        │                 │                                    │
│        │                 ▼                                    │
│        │      ┌───────────────────┐                          │
│        │      │ RETRY PROTOCOL     │                          │
│        │      │ Retry ≤ 3 times    │                          │
│        │      │ Failed task only   │                          │
│        │      │ Preserve completed │                          │
│        │      └────────┬──────────┘                          │
│        │               │                                     │
│        │      ┌────────┴────────┐                            │
│        │      │                 │                             │
│        │      ▼                 ▼                             │
│        │  [RETRY OK]    [MAX RETRIES]                        │
│        │      │                 │                             │
│        │      │                 ▼                             │
│        │      │      ┌──────────────┐                        │
│        │      │      │ LOG BLOCKER   │                        │
│        │      │      │ HALT PHASE    │                        │
│        │      │      │ REQUEST INPUT │                        │
│        │      │      └──────────────┘                        │
│        │      │                                              │
│        ▼      ▼                                              │
│  ┌─────────────────────────────┐                             │
│  │  STEP 2: FRONTEND AGENT     │                             │
│  │  Execute all frontend tasks  │                             │
│  │  for current phase           │                             │
│  │  (same retry protocol)       │                             │
│  └──────────────┬──────────────┘                             │
│                 │                                             │
│                 ▼                                             │
│  ┌─────────────────────────────┐                             │
│  │  STEP 3: QA AGENT           │                             │
│  │  Run all test suites         │                             │
│  │  Unit + Integration + E2E   │                             │
│  │  (same retry protocol)       │                             │
│  └──────────────┬──────────────┘                             │
│                 │                                             │
│                 ▼                                             │
│  ┌─────────────────────────────┐                             │
│  │  STEP 4: CODE REVIEW AGENT  │                             │
│  │  Review all phase changes    │                             │
│  │  Security + Performance +   │                             │
│  │  Quality + Scalability      │                             │
│  └──────────────┬──────────────┘                             │
│                 │                                             │
│        ┌────────┴────────┐                                   │
│        │                 │                                    │
│        ▼                 ▼                                    │
│   [APPROVED]    [CHANGES REQUESTED]                          │
│        │                 │                                    │
│        │                 ▼                                    │
│        │      ┌───────────────────┐                          │
│        │      │ Send findings to   │                          │
│        │      │ responsible agent   │                          │
│        │      │ (backend/frontend) │                          │
│        │      │ Re-execute ONLY    │                          │
│        │      │ affected tasks     │                          │
│        │      │ Then re-review     │                          │
│        │      └───────────────────┘                          │
│        │                                                     │
│        ▼                                                     │
│  ┌─────────────────────────────┐                             │
│  │  STEP 5: VALIDATION         │                             │
│  │  All tests pass             │                             │
│  │  Code review approved       │                             │
│  │  Doc updated               │                             │
│  │  No blockers                │                             │
│  └──────────────┬──────────────┘                             │
│                 │                                             │
│                 ▼                                             │
│  ┌─────────────────────────────┐                             │
│  │  STEP 6: PHASE COMPLETE     │                             │
│  │  complete-phase PHASE-0X    │                             │
│  │  → report + all .md files   │                             │
│  │  → decisions.md entry       │                             │
│  │  → start next phase         │                             │
│  └─────────────────────────────┘                             │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Execution Order (Strict)

```
1. Backend Agent    → All backend tasks for phase
2. Frontend Agent   → All frontend tasks for phase (depends on backend APIs)
3. QA Agent         → All test suites (depends on backend + frontend)
4. Code Review Agent → Full code review (depends on all code + tests)
```

Agents execute sequentially — the next agent only starts after the previous one completes successfully.

## Retry Protocol

```yaml
retry_policy:
  max_retries: 3
  scope: "FAILED_TASK_ONLY"
  preserve: "ALL_SUCCESSFUL_TASKS"
  backoff:
    default: "none"                # retry immediately with the failure analysis
    transient_errors: [5, 15, 45]  # seconds, only for network/registry/rate-limit errors
  
  on_failure:
    1. node .ai/scripts/status-manager.js retry <TASK-ID> "<reason>"   # logs, counts, auto-BLOCKs on the 3rd
    2. Analyze failure reason
    3. Provide failure context to the agent
    4. Re-execute ONLY the failed task
    5. Validate result
  
  on_max_retries_exceeded:
    1. (automatic) task becomes BLOCKED and a blocker is added to blockers.md
    2. Halt phase execution
    3. Request human input
    4. Do NOT advance to next step
```

## Task State Machine

```
PENDING → IN_PROGRESS → COMPLETED
                      → FAILED → RETRYING → COMPLETED
                                           → FAILED (max retries) → BLOCKED
```

## Executable Steps (per phase)

A phase always runs its four stages in this order. The CLI enforces it: a task cannot start while an earlier-stage task of the same phase is unfinished (`next` only returns runnable tasks).

```bash
# --- start (done automatically by the previous phase's complete-phase --start-next) ---
node .ai/scripts/status-manager.js set-phase PHASE-0X IN_PROGRESS

# --- repeat for every task, stage by stage: Backend -> Frontend -> QA -> Code Review ---
node .ai/scripts/status-manager.js next                                   # next runnable task + its agent
node .ai/scripts/status-manager.js update-task <ID> status IN_PROGRESS
node .ai/scripts/status-manager.js set-agent <agent> ACTIVE <ID>
# ... the agent implements the task (src + its tests) ...
node .ai/scripts/validate-project.js --tsc                                # architecture rules + type-check
# run the tests of the touched codebase: npm test (+ npm run test:e2e in codebase/backend when relevant)
node .ai/scripts/status-manager.js update-task <ID> status COMPLETED      # only after validate + tests pass
git add -A && git commit -m "feat(<scope>): <task title> [<ID>]"          # checkpoint commit per task
```

**Failure:** `status-manager.js retry <ID> "<reason>"` (see Retry Protocol; 3 strikes → BLOCKED).

**Code Review verdict (stage 4):**
- `APPROVED` → `update-task PHASE-0X-CR-001 status COMPLETED`.
- `CHANGES_REQUESTED` → `status-manager.js request-changes PHASE-0X "<findings>" --tasks <ids> [--retest]` — reopens only the named backend/frontend tasks (+ QA with `--retest`) and the review, then repeat the stages for those tasks. After 3 rounds the phase is BLOCKED and the user is asked.

## Phase Close-Out (mandatory, after Code Review is APPROVED)

1. Confirm: every task COMPLETED, full test run green, `validate-project.js --tsc` clean, no open blockers for the phase.
2. Append architectural decisions made in this phase to `.ai/memory/decisions.md` (manual, append-only).
3. Close the phase — one command refreshes everything:
   ```bash
   node .ai/scripts/status-manager.js complete-phase PHASE-0X --summary "<what was delivered, 1-2 sentences>" --start-next
   ```
4. Commit and tag: `git add -A && git commit -m "chore(phase): close PHASE-0X" && git tag phase-0X`. With the 3-repo strategy also run `node .ai/scripts/git-sync.js push-all`.
5. Tell the user a 3–5 line summary (delivered features, tests/coverage, review rounds, anything deferred), then continue with the next phase. After the last phase the project status becomes `COMPLETED` → run `/factory-testing` (full regression) and `/factory-deployment`.

`complete-phase` refuses to close a phase with unfinished tasks, a missing QA/Code Review stage or open blockers. It refreshes:

| Folder | Files updated |
|--------|---------------|
| `.ai/project-management/` | `project-status.md`, `progress.md`, `current-phase.md` (moves to the next phase), `roadmap.md` (task board), `agent-status.md` (agents reset to idle) |
| `.ai/memory/` | `state.json`, `completed-tasks.md`, `phase-reports.md` (new report for the phase), `blockers.md`, `execution-log.md` (PHASE entry), `retry-log.md`, `decisions.md` (closing entry appended) |

## Documentation Updates (Automatic)

Every `status-manager.js` call regenerates `progress.md`, `current-phase.md`, `project-status.md`, `agent-status.md`, `completed-tasks.md`, `phase-reports.md`, `blockers.md` and the roadmap task board from `.ai/memory/state.json` (`execution-log.md` and `retry-log.md` are appended). Do not edit those files by hand. Only `.ai/memory/decisions.md` is written manually (append-only).

## Validation Checklist (Before Phase Advancement)

- [ ] All backend tasks completed
- [ ] All frontend tasks completed
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Code review approved (zero CRITICAL/HIGH findings)
- [ ] Swagger documentation complete
- [ ] No unresolved blockers
- [ ] All documentation updated
