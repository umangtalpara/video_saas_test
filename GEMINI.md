# Google Antigravity Rules

`AGENTS.md` (same folder) is loaded by Antigravity automatically alongside this file and holds all shared factory rules. Do not duplicate them here.

## Antigravity specifics

- Rules: `.agents/rules/` (generated, with `trigger` frontmatter). Skills and workflow skills: `.agents/skills/` (generated). Custom agents: `.agents/agents/` (generated).
- Invoke workflows as slash commands, e.g. `/factory-prd-to-plan`, `/factory-phase-execution`.
- Source of truth is `.ai/`. After editing anything in `.ai/`, run `node .ai/scripts/sync-adapters.js`.
