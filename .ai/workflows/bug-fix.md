---
name: "bug-fix"
description: "Fix a bug from doc/bugs/*.md using TDD: reproduce with a failing test, fix, verify, regression test and record. Use when a bug report exists."
---

# Bug-Fixing Workflow (Hotfixes & Patches)

## Identity
- **Name**: Bug Fixing Pipeline
- **Trigger**: Bug report file created or updated under `doc/bugs/[bug-name-or-id].md`
- **Owner**: Super Agent → Developer Agent (Backend/Frontend) → QA Agent

## Flow Diagram

```
┌─────────────────────────────────┐
│     1. INGEST BUG REPORT        │
│  Super Agent reads description, │
│  error logs, & reproduction.    │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│   2. REPRODUCE WITH TEST CASE   │
│  QA/Developer agent writes a    │
│  failing test that reproduces   │
│  the reported issue (TDD).      │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│        3. ISOLATE & FIX         │
│  Developer makes code edits to  │
│  resolve the bug root cause.    │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│    4. VERIFY TEST PASSES        │
│  Run the new test case and make │
│  sure it now passes.            │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│      5. REGRESSION TESTING      │
│  QA Agent runs full test suite  │
│  to assert no other features    │
│  were broken by the fix.        │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│      6. SYNC & VALIDATE         │
│  Run validate-project.js and    │
│  status-manager.js to document  │
│  the fix in completed-tasks.md. │
└─────────────────────────────────┘
```

## How to Execute the Bug Fix

### Step 1: Create a Bug Report
Copy `.ai/templates/bug-template.md` to `doc/bugs/[bug-name-or-id].md` and fill it in (minimum structure shown below):
```markdown
# Bug Report: [Title]

## Description
[Explain what is happening and what the expected behavior is]

## Steps to Reproduce
1. Go to '/login'
2. Submit empty fields
3. Observe crash...

## Error Logs / Console Output
```
[Paste any terminal, API, or browser logs here]
```
```

### Step 2: Message the AI Agent
Prompt the agent in the chat:
> *"I have created a bug report at doc/bugs/[bug-name-or-id].md. Please investigate, write a reproducing test, and patch the codebase."*

### Step 3: Automated Resolution
The AI agent will:
1. Read the bug report.
2. Search the codebase for the offending file.
3. Write a test case (unit or integration test) that specifically targets the bug and fails.
4. Correct the code.
5. Verify the test passes and run `node .ai/scripts/validate-project.js`.
6. Track it: `node .ai/scripts/status-manager.js add-phase HOTFIX-<n> "<bug title>"` + `add-task HOTFIX-<n> HOTFIX-<n>-TASK-001 "<title>" backend-agent HIGH`, then move it `IN_PROGRESS` → `COMPLETED` with `update-task <ID> status <STATUS>` and record notes with `log "<resolution notes>"`. Regenerated files (`completed-tasks.md`, `progress.md`) must not be edited by hand.
6a. Commit: `git commit -m "fix(<scope>): <summary> [<ID>]"`.
7. Inform the user of the fix.
