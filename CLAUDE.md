# Claude Code Rules

@AGENTS.md

## Claude Code specifics

- Sub-agents: `.claude/agents/` (generated). Skills and workflow skills: `.claude/skills/` (generated). Invoke workflows as slash commands, e.g. `/factory-prd-to-plan`, `/factory-phase-execution`.
- Source of truth is `.ai/`. After editing anything in `.ai/`, run `node .ai/scripts/sync-adapters.js`.
