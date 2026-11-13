#!/usr/bin/env node
/**
 * status-manager.js — single writer for factory state.
 *
 * Source of truth: .ai/memory/state.json
 * Generated from it: project-status.md, progress.md, current-phase.md, roadmap.md (auto block),
 *                    agent-status.md, completed-tasks.md, blockers.md, phase-reports.md
 * Append-only logs:  execution-log.md, retry-log.md
 *
 * Run `node .ai/scripts/status-manager.js help` for the command list.
 */
const fs = require('fs');
const path = require('path');

const AI_DIR = path.join(__dirname, '..');
const STATE_PATH = path.join(AI_DIR, 'memory/state.json');
const PM_DIR = path.join(AI_DIR, 'project-management');
const MEM_DIR = path.join(AI_DIR, 'memory');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', blue: '\x1b[34m', yellow: '\x1b[33m', red: '\x1b[31m', bold: '\x1b[1m' };
const log = (msg, color = colors.reset) => console.log(`${color}${msg}${colors.reset}`);
const fail = (msg) => { log(`✖ ${msg}`, colors.red); process.exit(1); };

const TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'RETRYING', 'BLOCKED'];
const PHASE_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'];
const PROJECT_STATUSES = {
  AWAITING_PRD: '🟡', PLANNING: '🔵', IN_PROGRESS: '🟢', BLOCKED: '🟠', FAILED: '🔴', COMPLETED: '✅', DEPLOYED: '🚀'
};
const AGENT_STATUSES = { ACTIVE: '🟢', IDLE: '⚪', PENDING: '🟡', ERROR: '🔴', COMPLETE: '🔵' };
const AGENTS = [
  ['super-agent', 'Orchestrator'], ['deep-plan-agent', 'Planning'], ['backend-agent', 'Backend Dev'],
  ['frontend-agent', 'Frontend Dev'], ['qa-agent', 'Testing'], ['code-review-agent', 'Code Review']
];
const STACK_KEYS = [
  'structure', 'dockerSetup', 'gitStrategy', 'dbEngine', 'cacheEngine', 'multiTenant',
  'mailProvider', 'storageProvider', 'loggingProvider', 'paymentProvider', 'realtime'
];
const MAX_RETRIES = 3;

// Every phase runs these four stages strictly in order: Backend -> Frontend -> QA -> Code Review.
const STAGES = [
  ['backend', 'backend-agent', 'Backend'],
  ['frontend', 'frontend-agent', 'Frontend'],
  ['qa', 'qa-agent', 'QA'],
  ['review', 'code-review-agent', 'Code Review']
];
const stageOf = (agent) => STAGES.findIndex((s) => s[1] === agent); // -1 = not a phase-pipeline agent
const MIN_PHASES = 5;
const MAX_PHASES = 10;
const MAX_REVIEW_ROUNDS = 3;

const today = () => new Date().toISOString().split('T')[0];
const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

// ---------- args ----------
function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) { flags[key] = next; i++; } else { flags[key] = true; }
    } else positional.push(a);
  }
  return { positional, flags };
}

// ---------- state ----------
function freshState(name = 'SaaS AI Factory') {
  const stack = {};
  STACK_KEYS.forEach((k) => { stack[k] = null; });
  return {
    project: { name, status: 'AWAITING_PRD', startedAt: today(), lastUpdated: today(), totalPhases: 0, completedPhases: 0, activeBlockers: 0 },
    stack,
    agents: {},
    phases: [],
    blockers: [],
    timeline: [{ event: 'Project Initialized', date: today(), notes: 'AI Factory workspace created' }]
  };
}

function normalizeStatus(value) {
  return String(value || '').replace(/[^A-Za-z_]/g, '').toUpperCase();
}

function loadState() {
  if (!fs.existsSync(STATE_PATH)) return freshState();
  let state;
  try {
    state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch (e) {
    fail(`state.json is not valid JSON (${e.message}). Fix it manually or delete it and run "init". Refusing to overwrite.`);
  }
  const base = freshState();
  state.project = { ...base.project, ...state.project, status: normalizeStatus(state.project && state.project.status) || 'AWAITING_PRD' };
  state.stack = { ...base.stack, ...(state.stack || {}) };
  state.agents = state.agents || {};
  state.phases = (state.phases || []).map((p) => ({ ...p, tasks: p.tasks || [] }));
  state.blockers = state.blockers || [];
  state.timeline = state.timeline || [];
  return state;
}

function atomicWrite(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

function allTasks(state) {
  return state.phases.flatMap((p) => p.tasks.map((t) => ({ ...t, phaseId: p.id })));
}

function findTask(state, taskId) {
  for (const phase of state.phases) {
    const task = phase.tasks.find((t) => t.id === taskId);
    if (task) return { phase, task };
  }
  return null;
}

function saveState(state) {
  state.project.lastUpdated = today();
  state.project.totalPhases = state.phases.length;
  state.project.completedPhases = state.phases.filter((p) => p.status === 'COMPLETED').length;
  const blockedTasks = allTasks(state).filter((t) => t.status === 'BLOCKED').length;
  const openBlockers = state.blockers.filter((b) => b.status !== 'RESOLVED').length;
  state.project.activeBlockers = Math.max(blockedTasks, openBlockers);
  atomicWrite(STATE_PATH, JSON.stringify(state, null, 2) + '\n');
  syncMarkdowns(state);
  log('✔ state.json saved and markdown files synced', colors.green);
}


// ---------- phase pipeline helpers ----------
function stageSummary(phase) {
  return STAGES.map(([key, agent, label]) => {
    const list = phase.tasks.filter((t) => t.agent === agent);
    const done = list.filter((t) => t.status === 'COMPLETED').length;
    let symbol = '—';
    if (list.length) {
      if (done === list.length) symbol = '✅';
      else if (list.some((t) => t.status === 'BLOCKED')) symbol = '🚫';
      else if (list.some((t) => ['IN_PROGRESS', 'RETRYING'].includes(t.status)) || done > 0) symbol = '🔄';
      else symbol = '⬜';
    }
    return { key, agent, label, done, total: list.length, symbol };
  });
}

// Earlier-stage tasks of the same phase that are not COMPLETED yet (a task may only start when this is empty).
function unfinishedEarlierStages(phase, task) {
  const rank = stageOf(task.agent);
  if (rank <= 0) return [];
  return phase.tasks.filter((t) => stageOf(t.agent) >= 0 && stageOf(t.agent) < rank && t.status !== 'COMPLETED');
}

function planProblems(state, { incremental = false } = {}) {
  const errors = [];
  const warnings = [];
  const phases = incremental ? state.phases.filter((p) => p.status === 'PENDING') : state.phases;
  if (!incremental) {
    if (state.phases.length < MIN_PHASES || state.phases.length > MAX_PHASES) {
      errors.push(`Plan must have ${MIN_PHASES}-${MAX_PHASES} phases (found ${state.phases.length}).`);
    }
  } else if (!phases.length) {
    errors.push('No PENDING phases to validate.');
  }
  const ids = new Set(allTasks(state).map((t) => t.id));
  phases.forEach((phase) => {
    if (!phase.tasks.length) { errors.push(`${phase.id}: has no tasks.`); return; }
    STAGES.forEach(([, agent, label]) => {
      if (!phase.tasks.some((t) => t.agent === agent)) {
        const msg = `${phase.id}: no ${label} task (${agent}).`;
        (agent === 'qa-agent' || agent === 'code-review-agent' ? errors : warnings).push(
          agent === 'qa-agent' || agent === 'code-review-agent' ? msg : `${msg} Allowed only for a purely backend/frontend phase — record why in decisions.md.`
        );
      }
    });
    phase.tasks.forEach((t) => {
      if (stageOf(t.agent) < 0) errors.push(`${t.id}: agent "${t.agent}" is not part of the phase pipeline (use backend/frontend/qa/code-review agents).`);
      if (!t.acceptance_criteria) errors.push(`${t.id}: missing acceptance criteria (--criteria).`);
      (t.dependencies || []).forEach((d) => {
        if (d === t.id) errors.push(`${t.id}: depends on itself.`);
        else if (!ids.has(d)) errors.push(`${t.id}: unknown dependency ${d}.`);
        else {
          const dep = findTask(state, d);
          const depPhaseIdx = state.phases.indexOf(dep.phase);
          const phaseIdx = state.phases.indexOf(phase);
          if (depPhaseIdx > phaseIdx) errors.push(`${t.id}: depends on ${d} from a LATER phase (${dep.phase.id}).`);
          if (dep.phase === phase && stageOf(dep.task.agent) > stageOf(t.agent) && stageOf(t.agent) >= 0) {
            errors.push(`${t.id}: depends on ${d}, which belongs to a later stage (${dep.task.agent}) of the same phase.`);
          }
        }
      });
    });
  });
  // cycle detection
  const visiting = new Set();
  const visited = new Set();
  const dfs = (id, trail) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) { errors.push(`Circular dependency: ${[...trail, id].join(' -> ')}`); return; }
    visiting.add(id);
    const found = findTask(state, id);
    ((found && found.task.dependencies) || []).forEach((d) => { if (ids.has(d)) dfs(d, [...trail, id]); });
    visiting.delete(id);
    visited.add(id);
  };
  allTasks(state).forEach((t) => dfs(t.id, []));
  return { errors: [...new Set(errors)], warnings };
}

function phaseReportMarkdown(state) {
  const done = state.phases.filter((p) => p.status === 'COMPLETED' && p.report);
  let md = `# Phase Reports\n\n${GEN_NOTE}\n\nOne entry per closed phase (written by \`status-manager.js complete-phase\`).\n\n---\n`;
  if (!done.length) return md + '\n_No phase has been closed yet._\n';
  done.forEach((p) => {
    const r = p.report;
    md += `\n## ${p.id}: ${cell(p.name)}\n\n| Field | Value |\n|-------|-------|\n| **Started** | ${p.startedAt || 'N/A'} |\n| **Completed** | ${r.completedAt} |\n| **Tasks** | ${r.tasks} |\n| **Total retries** | ${r.retries} |\n| **Review rounds** | ${r.reviewRounds} |\n\n`;
    md += `**Summary:** ${r.summary || '—'}\n\n| Stage | Agent | Done / Total |\n|-------|-------|--------------|\n`;
    md += r.stages.map((s) => `| ${s.label} | ${s.agent} | ${s.done}/${s.total} |`).join('\n') + '\n';
    md += `\n| Task | Title | Agent | Completed |\n|------|-------|-------|-----------|\n`;
    md += p.tasks.map((t) => `| ${t.id} | ${cell(t.title)} | ${t.agent} | ${t.completedDate || 'N/A'} |`).join('\n') + '\n';
  });
  return md;
}

// ---------- markdown generation ----------
const TASK_SYMBOL = { PENDING: '⬜', IN_PROGRESS: '🔄', RETRYING: '🔄', COMPLETED: '✅', FAILED: '❌', BLOCKED: '🚫' };
const cell = (v) => String(v === undefined || v === null || v === '' ? '—' : v).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const GEN_NOTE = '> Generated by `.ai/scripts/status-manager.js` from `.ai/memory/state.json`. Do not edit by hand — use the CLI.';

function agentStats(state) {
  const stats = {};
  AGENTS.forEach(([a]) => { stats[a] = { assigned: 0, completed: 0, inProgress: 0, failed: 0, blocked: 0, pending: 0 }; });
  allTasks(state).forEach((t) => {
    const a = t.agent || 'backend-agent';
    stats[a] = stats[a] || { assigned: 0, completed: 0, inProgress: 0, failed: 0, blocked: 0, pending: 0 };
    stats[a].assigned++;
    if (t.status === 'COMPLETED') stats[a].completed++;
    else if (t.status === 'IN_PROGRESS' || t.status === 'RETRYING') stats[a].inProgress++;
    else if (t.status === 'FAILED') stats[a].failed++;
    else if (t.status === 'BLOCKED') stats[a].blocked++;
    else stats[a].pending++;
  });
  return stats;
}

function writeRoadmap(state) {
  const file = path.join(PM_DIR, 'roadmap.md');
  const BEGIN = '<!-- AUTO:BEGIN task-board -->';
  const END = '<!-- AUTO:END task-board -->';
  let block = `${BEGIN}\n${GEN_NOTE}\n\n## Task Board\n`;
  if (!state.phases.length) block += '\n_No phases defined yet._\n';
  state.phases.forEach((phase) => {
    block += `\n### ${phase.id}: ${phase.name} (Status: ${phase.status})\n`;
    phase.tasks.forEach((t) => {
      block += `- **[${t.status}]** ${t.id}: ${t.title} (Agent: ${t.agent}, Priority: ${t.priority}${t.complexity ? `, Complexity: ${t.complexity}` : ''})\n`;
      if (t.dependencies && t.dependencies.length) block += `  * Depends on: ${t.dependencies.join(', ')}\n`;
      if (t.acceptance_criteria) block += `  * Criteria: ${t.acceptance_criteria}\n`;
    });
  });
  block += `\n${END}`;

  let existing = '';
  if (fs.existsSync(file)) existing = fs.readFileSync(file, 'utf8');
  let out;
  if (existing.includes(BEGIN) && existing.includes(END)) {
    out = existing.slice(0, existing.indexOf(BEGIN)) + block + existing.slice(existing.indexOf(END) + END.length);
  } else {
    // First run (or legacy file): keep any hand/agent-written planning narrative, add the block after it.
    const narrative = existing.replace(/^# Roadmap\s*/m, '').replace(/^> This file is automatically synced.*$/m, '').trim();
    out = `# Roadmap\n\nPlanning narrative (phase goals, architecture summary, schemas) goes in this file **outside** the auto block below.\n\n${narrative ? narrative + '\n\n' : ''}${block}\n`;
  }
  atomicWrite(file, out);
}

function syncMarkdowns(state) {
  const tasks = allTasks(state);
  const total = tasks.length;
  const count = (s) => tasks.filter((t) => t.status === s).length;
  const completed = count('COMPLETED');
  const inProgress = count('IN_PROGRESS') + count('RETRYING');
  const failed = count('FAILED');
  const blocked = count('BLOCKED');
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
  const stats = agentStats(state);
  const activePhase = state.phases.find((p) => p.status === 'IN_PROGRESS');
  const emoji = PROJECT_STATUSES[state.project.status] || '';

  // project-status.md
  const phaseRows = state.phases.map((p) => {
    const c = (s) => p.tasks.filter((t) => t.status === s).length;
    return `| ${p.id} | ${cell(p.name)} | ${p.status} | ${p.tasks.length} | ${c('COMPLETED')} | ${c('FAILED')} | ${c('BLOCKED')} |`;
  }).join('\n') || '| — | No phases defined | — | — | — | — | — |';
  const stackRows = STACK_KEYS.map((k) => `| ${k} | ${cell(state.stack[k])} |`).join('\n');
  atomicWrite(path.join(PM_DIR, 'project-status.md'), `# Project Status

${GEN_NOTE}

---

## Current Status

| Field | Value |
|-------|-------|
| **Project** | ${cell(state.project.name)} |
| **Status** | ${emoji} ${state.project.status} |
| **Current Phase** | ${activePhase ? `${activePhase.id} — ${cell(activePhase.name)}` : 'N/A'} |
| **Total Phases** | ${state.project.totalPhases} |
| **Completed Phases** | ${state.project.completedPhases} |
| **Active Blockers** | ${state.project.activeBlockers} |
| **Started At** | ${state.project.startedAt} |
| **Last Updated** | ${state.project.lastUpdated} |

## Status Legend

| Status | Meaning |
|-------|---------|
| 🟡 AWAITING_PRD | Initialized, waiting for PRD at \`doc/prd.md\` |
| 🔵 PLANNING | Discovery Q&A and architecture planning active |
| 🟢 IN_PROGRESS | Phase execution active |
| 🟠 BLOCKED | Halted due to unresolved blocker |
| 🔴 FAILED | Critical failure requiring human intervention |
| ✅ COMPLETED | All phases finished, ready for deployment |
| 🚀 DEPLOYED | Deployed to production |

## Chosen Stack (Discovery Q&A)

| Setting | Value |
|---------|-------|
${stackRows}

## Phase Summary

| Phase | Name | Status | Tasks | Completed | Failed | Blocked |
|-------|------|--------|-------|-----------|--------|---------|
${phaseRows}

## Key Metrics

| Metric | Value |
|-------|-------|
| Total Tasks | ${total} |
| Tasks Completed | ${completed} |
| Tasks In Progress | ${inProgress} |
| Tasks Failed | ${failed} |
| Tasks Blocked | ${blocked} |

## Timeline

| Event | Date | Notes |
|-------|------|-------|
${state.timeline.map((t) => `| ${cell(t.event)} | ${t.date} | ${cell(t.notes)} |`).join('\n')}

---

*Last updated: ${state.project.lastUpdated}*
`);

  // progress.md
  let progress = `# Progress Tracker

${GEN_NOTE}

---

## Overall Progress

\`\`\`
Total:     [${bar}] ${pct}%  (${completed}/${total} tasks)
${state.phases.map((p) => {
    const done = p.tasks.filter((t) => t.status === 'COMPLETED').length;
    return `${p.id}:   ${p.status} (${p.tasks.length ? Math.round((done / p.tasks.length) * 100) : 0}%)`;
  }).join('\n')}
\`\`\`

## Progress by Agent

| Agent | Assigned | Completed | In Progress | Failed | Blocked |
|-------|----------|-----------|-------------|--------|---------|
${Object.entries(stats).filter(([a]) => stats[a].assigned || a !== 'super-agent' && a !== 'deep-plan-agent').map(([a, s]) => `| ${a} | ${s.assigned} | ${s.completed} | ${s.inProgress} | ${s.failed} | ${s.blocked} |`).join('\n')}
| **Total** | **${total}** | **${completed}** | **${inProgress}** | **${failed}** | **${blocked}** |

## Task Status Legend

| Symbol | Status | Description |
|--------|--------|-------------|
| ⬜ | PENDING | Not yet started |
| 🔄 | IN_PROGRESS / RETRYING | Agent is working on it |
| ✅ | COMPLETED | Completed and validated |
| ❌ | FAILED | Failed (will be retried) |
| 🚫 | BLOCKED | Escalated to blockers.md |

## Detailed Task Progress
`;
  state.phases.forEach((phase) => {
    progress += `\n### ${phase.id}: ${cell(phase.name)}\n\nPipeline: ${stageSummary(phase).map((x) => `${x.label} ${x.done}/${x.total} ${x.symbol}`).join(' → ')}\n\n| # | Task ID | Title | Agent | Priority | Status | Retries |\n|---|---------|-------|-------|----------|--------|---------|\n`;
    phase.tasks.forEach((t, i) => {
      progress += `| ${i + 1} | ${t.id} | ${cell(t.title)} | ${t.agent} | ${t.priority} | ${TASK_SYMBOL[t.status] || '⬜'} ${t.status} | ${t.retries || 0}/${MAX_RETRIES} |\n`;
    });
  });
  atomicWrite(path.join(PM_DIR, 'progress.md'), progress);

  // current-phase.md
  let current = `# Current Phase\n\n${GEN_NOTE}\n\n---\n`;
  if (activePhase) {
    const rows = (pred) => activePhase.tasks.filter(pred).map((t) => `| ${t.id} | ${cell(t.title)} | ${t.agent} | ${t.priority} | ${t.status} |`).join('\n') || '| — | — | — | — | — |';
    const head = '| Task ID | Title | Agent | Priority | Status |\n|---------|-------|-------|----------|--------|';
    current += `
## Active Phase

| Field | Value |
|-------|-------|
| **Phase** | ${activePhase.id} |
| **Name** | ${cell(activePhase.name)} |
| **Status** | ${activePhase.status} |
| **Started At** | ${activePhase.startedAt || 'N/A'} |

---

## Phase Pipeline (strict order: Backend → Frontend → QA → Code Review)

| Stage | Agent | Done / Total | State |
|-------|-------|--------------|-------|
${stageSummary(activePhase).map((x) => `| ${x.label} | ${x.agent} | ${x.done}/${x.total} | ${x.symbol} |`).join('\n')}

Code review rounds used: ${activePhase.reviewRounds || 0}/${MAX_REVIEW_ROUNDS}

---

## Phase Tasks

${STAGES.map(([, agent, label]) => `### ${label} Tasks\n${head}\n${rows((t) => t.agent === agent)}`).join('\n\n')}
`;
  } else {
    current += `\n## No Active Phase\n\nProject Status: ${emoji} ${state.project.status}\n`;
  }
  atomicWrite(path.join(PM_DIR, 'current-phase.md'), current);

  writeRoadmap(state);

  // completed-tasks.md
  const done = tasks.filter((t) => t.status === 'COMPLETED');
  atomicWrite(path.join(MEM_DIR, 'completed-tasks.md'), `# Completed Tasks

${GEN_NOTE}

---

| Task ID | Title | Agent | Date Completed | Notes |
|---------|-------|-------|----------------|-------|
${done.map((t) => `| ${t.id} | ${cell(t.title)} | ${t.agent} | ${t.completedDate || 'N/A'} | ${cell(t.notes)} |`).join('\n') || '| — | No completed tasks yet | — | — | — |'}
`);

  atomicWrite(path.join(MEM_DIR, 'phase-reports.md'), phaseReportMarkdown(state));

  // agent-status.md
  const rowsAgents = AGENTS.map(([a, role]) => {
    const s = stats[a];
    const manual = state.agents[a] || {};
    const active = tasks.find((t) => t.agent === a && (t.status === 'IN_PROGRESS' || t.status === 'RETRYING'));
    let status = manual.status;
    if (!status) {
      if (active) status = 'ACTIVE';
      else if (s.pending) status = 'PENDING';
      else if (s.assigned && s.completed === s.assigned) status = 'COMPLETE';
      else status = 'IDLE';
    }
    const current = active ? active.id : (manual.task || '—');
    return `| ${AGENT_STATUSES[status] || ''} ${a} | ${role} | ${status} | ${current} | ${s.completed} | ${s.assigned - s.completed} | ${manual.lastActive || '—'} |`;
  }).join('\n');
  atomicWrite(path.join(PM_DIR, 'agent-status.md'), `# Agent Status

${GEN_NOTE}

---

## Agent Dashboard

| Agent | Role | Status | Current Task | Tasks Done | Tasks Remaining | Last Active |
|-------|------|--------|-------------|------------|-----------------|-------------|
${rowsAgents}

## Status Legend

| Symbol | Status | Description |
|--------|--------|-------------|
| 🟢 | ACTIVE | Executing a task |
| ⚪ | IDLE | Waiting for assignment |
| 🟡 | PENDING | Tasks queued, not started |
| 🔴 | ERROR | Error on current task |
| 🔵 | COMPLETE | All assigned tasks done |

Set manual status (for agents without tasks, e.g. planning): \`status-manager.js set-agent <agent> <STATUS> [task]\`.

---

*Last updated: ${state.project.lastUpdated}*
`);

  // blockers.md
  const open = state.blockers.filter((b) => b.status !== 'RESOLVED');
  const resolved = state.blockers.filter((b) => b.status === 'RESOLVED');
  atomicWrite(path.join(MEM_DIR, 'blockers.md'), `# Blockers

${GEN_NOTE}
Add with \`status-manager.js add-blocker "<title>" [--phase P] [--task T] [--severity HIGH]\`; close with \`resolve-blocker <id> "<resolution>"\`.
Tasks that exhaust ${MAX_RETRIES} retries are auto-blocked and listed here.

---

## Active Blockers

| ID | Date | Phase | Task | Description | Severity | Status |
|----|------|-------|------|-------------|----------|--------|
${open.map((b) => `| ${b.id} | ${b.date} | ${cell(b.phase)} | ${cell(b.task)} | ${cell(b.title)} | ${b.severity} | ${b.status} |`).join('\n') || '| — | — | — | — | No active blockers | — | — |'}

## Resolved Blockers

| ID | Date | Resolved | Description | Resolution |
|----|------|----------|-------------|------------|
${resolved.map((b) => `| ${b.id} | ${b.date} | ${b.resolvedDate || '—'} | ${cell(b.title)} | ${cell(b.resolution)} |`).join('\n') || '| — | — | — | No resolved blockers | — |'}
`);
}

// ---------- append-only logs ----------
function appendLog(file, header, line) {
  const target = path.join(MEM_DIR, file);
  if (!fs.existsSync(target)) fs.writeFileSync(target, header);
  fs.appendFileSync(target, line.endsWith('\n') ? line : line + '\n');
}
const EXEC_HEADER = '# Execution Log\n\n> Append-only. Written by `status-manager.js log "<message>" [agent] [LEVEL]`.\n\nFormat: `[YYYY-MM-DD HH:MM:SS] [LEVEL] [agent] — message` (INFO | WARN | ERROR | SUCCESS | PHASE | SYSTEM)\n\n---\n\n';
const RETRY_HEADER = '# Retry Log\n\n> Append-only. Written by `status-manager.js retry <taskId> "<reason>"`. Max retries per task: 3 (then BLOCKED).\n\n---\n\n';
const logExec = (msg, agent = 'super-agent', level = 'INFO') => appendLog('execution-log.md', EXEC_HEADER, `- [${now()}] [${level}] [${agent}] — ${msg}`);

// ---------- commands ----------
const commands = {};

commands.help = () => {
  console.log(`
Usage: node .ai/scripts/status-manager.js <command> [args] [--flags]

State
  init [name] [--force]                    Create a clean state (refuses if phases exist unless --force)
  status                                   Print a short summary
  sync                                     Regenerate all markdown from state.json
  set-stack <key> <value>                  Record a Discovery Q&A answer (${STACK_KEYS.join(', ')})
  update-project <status>                  ${Object.keys(PROJECT_STATUSES).join(' | ')}
  add-event <event> [notes]                Append to the project timeline

Phases & tasks
  add-phase <id> <name>
  set-phase <id> <${PHASE_STATUSES.join('|')}> [--force]
  add-task <phaseId> <taskId> <title> [agent] [priority] [--deps A,B] [--criteria "text"] [--complexity S|M|L|XL]
  update-task <taskId> <field> <value> [--force]     field: status | retries | notes | any custom field
  retry <taskId> "<reason>"                Count a retry; auto-BLOCKs after ${MAX_RETRIES} and opens a blocker
  next                                     Print the next runnable task (dependencies + stage order satisfied)
  validate-plan [--incremental]            Check the plan: ${MIN_PHASES}-${MAX_PHASES} phases, Backend/Frontend/QA/Review in every phase, DAG, criteria
  request-changes <phaseId> "<findings>" --tasks T1,T2 [--retest]   Code review CHANGES_REQUESTED: reopen tasks + re-review (max ${MAX_REVIEW_ROUNDS} rounds)
  complete-phase <phaseId> [--summary "..."] [--start-next]       Close a phase and refresh ALL status + memory files

Agents, blockers, logs
  set-agent <agent> <${Object.keys(AGENT_STATUSES).join('|')}> [task]
  add-blocker "<title>" [--phase P] [--task T] [--severity CRITICAL|HIGH|MEDIUM]
  resolve-blocker <id> "<resolution>"
  log "<message>" [agent] [LEVEL]            Append to execution-log.md
`);
};

commands.init = ({ positional, flags }) => {
  const existing = fs.existsSync(STATE_PATH) ? loadState() : null;
  if (existing && existing.phases.length && !flags.force) fail('state.json already has phases. Use --force to reset (this destroys progress).');
  const state = freshState(positional[0] || 'SaaS AI Factory');
  saveState(state);
  fs.writeFileSync(path.join(MEM_DIR, 'execution-log.md'), EXEC_HEADER);
  fs.writeFileSync(path.join(MEM_DIR, 'retry-log.md'), RETRY_HEADER);
  logExec('AI Factory state initialized', 'super-agent', 'SYSTEM');
};

commands.sync = () => saveState(loadState());

commands.status = () => {
  const state = loadState();
  const tasks = allTasks(state);
  const done = tasks.filter((t) => t.status === 'COMPLETED').length;
  log(`${state.project.name} — ${PROJECT_STATUSES[state.project.status] || ''} ${state.project.status}`, colors.bold);
  console.log(`Phases: ${state.project.completedPhases}/${state.phases.length} complete | Tasks: ${done}/${tasks.length} complete | Blockers: ${state.project.activeBlockers}`);
  const active = state.phases.find((p) => p.status === 'IN_PROGRESS');
  if (active) {
    console.log(`Active phase: ${active.id} — ${active.name}`);
    console.log('Pipeline: ' + stageSummary(active).map((x) => `${x.label} ${x.done}/${x.total} ${x.symbol}`).join(' → '));
  }
  const nextTask = pickNext(state);
  console.log(nextTask ? `Next task: ${nextTask.id} (${nextTask.agent}) — ${nextTask.title}` : 'Next task: none runnable');
  const missing = STACK_KEYS.filter((k) => state.stack[k] === null);
  if (missing.length) console.log(`Stack answers still missing: ${missing.join(', ')}`);
};

commands['set-stack'] = ({ positional }) => {
  const [key, ...rest] = positional;
  const value = rest.join(' ');
  if (!key || !value) fail(`Usage: set-stack <key> <value>. Keys: ${STACK_KEYS.join(', ')}`);
  if (!STACK_KEYS.includes(key)) fail(`Unknown stack key "${key}". Valid: ${STACK_KEYS.join(', ')}`);
  const state = loadState();
  const lowered = value.toLowerCase();
  state.stack[key] = lowered === 'true' ? true : lowered === 'false' ? false : value;
  logExec(`Stack decision: ${key} = ${value}`, 'super-agent', 'INFO');
  saveState(state);
};

commands['update-project'] = ({ positional }) => {
  const status = normalizeStatus(positional[0]);
  if (!PROJECT_STATUSES[status]) fail(`Invalid project status. Valid: ${Object.keys(PROJECT_STATUSES).join(', ')}`);
  const state = loadState();
  state.project.status = status;
  state.timeline.push({ event: `Project status → ${status}`, date: today(), notes: '' });
  saveState(state);
};

commands['add-event'] = ({ positional }) => {
  if (!positional[0]) fail('Usage: add-event <event> [notes]');
  const state = loadState();
  state.timeline.push({ event: positional[0], date: today(), notes: positional.slice(1).join(' ') });
  saveState(state);
};

commands['add-phase'] = ({ positional }) => {
  const [id, ...nameParts] = positional;
  const name = nameParts.join(' ');
  if (!id || !name) fail('Usage: add-phase <id> <name>');
  const state = loadState();
  if (state.phases.some((p) => p.id === id)) fail(`Phase ${id} already exists.`);
  state.phases.push({ id, name, status: 'PENDING', tasks: [] });
  saveState(state);
};

commands['set-phase'] = ({ positional, flags }) => {
  const [id, rawStatus] = positional;
  const status = normalizeStatus(rawStatus);
  if (!id || !PHASE_STATUSES.includes(status)) fail(`Usage: set-phase <id> <${PHASE_STATUSES.join('|')}>`);
  const state = loadState();
  const phase = state.phases.find((p) => p.id === id);
  if (!phase) fail(`Phase ${id} not found.`);
  if (status === 'IN_PROGRESS') {
    const other = state.phases.find((p) => p.status === 'IN_PROGRESS' && p.id !== id);
    if (other && !flags.force) fail(`Phase ${other.id} is still IN_PROGRESS. Complete it first (or use --force).`);
    const idx = state.phases.indexOf(phase);
    const unfinished = state.phases.slice(0, idx).find((p) => p.status !== 'COMPLETED');
    if (unfinished && !flags.force) fail(`Earlier phase ${unfinished.id} is not COMPLETED (phases run sequentially). Use --force to override.`);
    const everStarted = state.phases.some((p) => p.startedAt || p.status === 'COMPLETED');
    if (!everStarted && !flags.force) {
      const { errors } = planProblems(state);
      if (errors.length) fail(`Plan is not valid yet (${errors.length} problem(s)). Run "validate-plan" and fix it before starting Phase 1 (or use --force).\n  - ${errors.slice(0, 5).join('\n  - ')}`);
    }
    phase.startedAt = phase.startedAt || today();
    if (state.project.status === 'AWAITING_PRD' || state.project.status === 'PLANNING') state.project.status = 'IN_PROGRESS';
  }
  if (status === 'COMPLETED') {
    if (!flags.force) fail(`Use "complete-phase ${id} --summary \"...\"" to close a phase: it also writes the phase report and refreshes every status/memory file.`);
    const open = phase.tasks.filter((t) => t.status !== 'COMPLETED');
    if (open.length && !flags.force) fail(`Cannot complete ${id}: ${open.length} task(s) not COMPLETED (${open.map((t) => t.id).join(', ')}).`);
    phase.completedAt = today();
    state.timeline.push({ event: `${id} completed`, date: today(), notes: phase.name });
  }
  phase.status = status;
  logExec(`${id} → ${status}`, 'super-agent', 'PHASE');
  saveState(state);
};

commands['add-task'] = ({ positional, flags }) => {
  const [phaseId, taskId, title, agent = 'backend-agent', priority = 'P0'] = positional;
  if (!phaseId || !taskId || !title) fail('Usage: add-task <phaseId> <taskId> <title> [agent] [priority] [--deps A,B] [--criteria "text"] [--complexity M]');
  if (!AGENTS.some(([a]) => a === agent)) fail(`Unknown agent "${agent}". Valid: ${AGENTS.map(([a]) => a).join(', ')}`);
  const state = loadState();
  const phase = state.phases.find((p) => p.id === phaseId);
  if (!phase) fail(`Phase ${phaseId} not found.`);
  if (findTask(state, taskId)) fail(`Task ${taskId} already exists.`);
  const dependencies = flags.deps && flags.deps !== true ? String(flags.deps).split(',').map((s) => s.trim()).filter(Boolean) : [];
  const task = { id: taskId, title, agent, priority, status: 'PENDING', retries: 0, dependencies };
  if (flags.criteria && flags.criteria !== true) task.acceptance_criteria = flags.criteria;
  if (flags.complexity && flags.complexity !== true) task.complexity = flags.complexity;
  phase.tasks.push(task);
  // dependencies may point to tasks added later, so only warn for unknown ones after the whole plan is loaded (see "next")
  saveState(state);
};

commands['update-task'] = ({ positional, flags }) => {
  const [taskId, field, ...valueParts] = positional;
  const value = valueParts.join(' ');
  if (!taskId || !field || value === '') fail('Usage: update-task <taskId> <field> <value>');
  const state = loadState();
  const found = findTask(state, taskId);
  if (!found) fail(`Task ${taskId} not found.`);
  const { task } = found;
  if (field === 'status') {
    const status = normalizeStatus(value);
    if (!TASK_STATUSES.includes(status)) fail(`Invalid task status. Valid: ${TASK_STATUSES.join(', ')}`);
    if (task.status === 'COMPLETED' && status !== 'COMPLETED' && !flags.force) fail(`${taskId} is COMPLETED. Completed tasks are never re-run (use --force for a deliberate reopen).`);
    if (status === 'IN_PROGRESS') {
      const unmet = (task.dependencies || []).filter((d) => { const dep = findTask(state, d); return !dep || dep.task.status !== 'COMPLETED'; });
      if (unmet.length && !flags.force) fail(`${taskId} has unmet dependencies: ${unmet.join(', ')}`);
      const earlier = unfinishedEarlierStages(found.phase, task);
      if (earlier.length && !flags.force) fail(`${taskId} (${task.agent}) cannot start: earlier stage(s) of ${found.phase.id} are not finished (${earlier.map((t) => t.id).join(', ')}). Order is Backend → Frontend → QA → Code Review.`);
      const phase = found.phase;
      if (phase.status === 'PENDING') {
        phase.status = 'IN_PROGRESS';
        phase.startedAt = phase.startedAt || today();
      }
    }
    task.status = status;
    if (status === 'COMPLETED') task.completedDate = today();
    logExec(`${taskId} → ${status}`, task.agent, status === 'FAILED' || status === 'BLOCKED' ? 'WARN' : status === 'COMPLETED' ? 'SUCCESS' : 'INFO');
  } else if (field === 'retries') {
    const n = parseInt(value, 10);
    if (Number.isNaN(n) || n < 0) fail('retries must be a non-negative integer');
    task.retries = n;
  } else if (field === 'dependencies') {
    task.dependencies = value.split(',').map((s) => s.trim()).filter(Boolean);
  } else {
    task[field] = value;
  }
  saveState(state);
};

commands.retry = ({ positional }) => {
  const [taskId, ...reasonParts] = positional;
  const reason = reasonParts.join(' ') || 'unspecified';
  if (!taskId) fail('Usage: retry <taskId> "<reason>"');
  const state = loadState();
  const found = findTask(state, taskId);
  if (!found) fail(`Task ${taskId} not found.`);
  const { task, phase } = found;
  task.retries = (task.retries || 0) + 1;
  appendLog('retry-log.md', RETRY_HEADER, `- [${now()}] ${taskId} (${task.agent}) attempt ${task.retries}/${MAX_RETRIES} — ${reason}`);
  if (task.retries >= MAX_RETRIES) {
    task.status = 'BLOCKED';
    phase.status = 'BLOCKED';
    state.project.status = 'BLOCKED';
    const id = `BLOCKER-${String(state.blockers.length + 1).padStart(3, '0')}`;
    state.blockers.push({ id, date: today(), phase: phase.id, task: taskId, title: `Max retries exceeded: ${reason}`, severity: 'HIGH', status: 'OPEN' });
    logExec(`${taskId} exhausted ${MAX_RETRIES} retries → BLOCKED (${id}). Human input required.`, task.agent, 'ERROR');
    log(`🚫 ${taskId} is BLOCKED after ${MAX_RETRIES} retries (${id}). Halt phase and ask the user.`, colors.red);
  } else {
    task.status = 'RETRYING';
    logExec(`${taskId} retry ${task.retries}/${MAX_RETRIES}: ${reason}`, task.agent, 'WARN');
  }
  saveState(state);
};

function pickNext(state) {
  const phase = state.phases.find((p) => p.status === 'IN_PROGRESS') || state.phases.find((p) => p.status === 'PENDING');
  if (!phase) return null;
  const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
  const runnable = phase.tasks
    .filter((t) => ['PENDING', 'RETRYING', 'FAILED'].includes(t.status))
    .filter((t) => (t.dependencies || []).every((d) => { const dep = findTask(state, d); return dep && dep.task.status === 'COMPLETED'; }))
    .filter((t) => unfinishedEarlierStages(phase, t).length === 0);
  runnable.sort((a, b) => (stageOf(a.agent) - stageOf(b.agent)) || ((order[a.priority] ?? 9) - (order[b.priority] ?? 9)));
  return runnable[0] ? { ...runnable[0], phaseId: phase.id } : null;
}

commands.next = () => {
  const state = loadState();
  const unknown = allTasks(state).flatMap((t) => (t.dependencies || []).filter((d) => !findTask(state, d)).map((d) => `${t.id} → ${d}`));
  if (unknown.length) log(`⚠ Unknown dependencies: ${unknown.join(', ')}`, colors.yellow);
  const next = pickNext(state);
  if (!next) { console.log('No runnable task (all done, blocked, or waiting on dependencies).'); return; }
  console.log(JSON.stringify({ phase: next.phaseId, id: next.id, title: next.title, agent: next.agent, priority: next.priority, status: next.status }));
};

commands['set-agent'] = ({ positional }) => {
  const [agent, rawStatus, task] = positional;
  const status = normalizeStatus(rawStatus);
  if (!AGENTS.some(([a]) => a === agent) || !AGENT_STATUSES[status]) fail(`Usage: set-agent <${AGENTS.map(([a]) => a).join('|')}> <${Object.keys(AGENT_STATUSES).join('|')}> [task]`);
  const state = loadState();
  state.agents[agent] = { status, task: task || null, lastActive: now() };
  saveState(state);
};

commands['add-blocker'] = ({ positional, flags }) => {
  const title = positional.join(' ');
  if (!title) fail('Usage: add-blocker "<title>" [--phase P] [--task T] [--severity HIGH]');
  const state = loadState();
  const id = `BLOCKER-${String(state.blockers.length + 1).padStart(3, '0')}`;
  state.blockers.push({ id, date: today(), phase: flags.phase || '', task: flags.task || '', title, severity: String(flags.severity || 'HIGH').toUpperCase(), status: 'OPEN' });
  logExec(`Blocker ${id}: ${title}`, 'super-agent', 'ERROR');
  saveState(state);
};

commands['resolve-blocker'] = ({ positional }) => {
  const [id, ...resParts] = positional;
  if (!id) fail('Usage: resolve-blocker <id> "<resolution>"');
  const state = loadState();
  const blocker = state.blockers.find((b) => b.id === id);
  if (!blocker) fail(`Blocker ${id} not found.`);
  blocker.status = 'RESOLVED';
  blocker.resolution = resParts.join(' ');
  blocker.resolvedDate = today();
  // Re-open the linked task with a fresh retry budget so the phase can continue.
  const linked = blocker.task ? findTask(state, blocker.task) : null;
  if (linked && linked.task.status === 'BLOCKED') {
    linked.task.status = 'PENDING';
    linked.task.retries = 0;
    if (linked.phase.status === 'BLOCKED') linked.phase.status = 'IN_PROGRESS';
  }
  const stillBlocked = allTasks(state).some((t) => t.status === 'BLOCKED');
  if (!stillBlocked && state.project.status === 'BLOCKED') state.project.status = 'IN_PROGRESS';
  logExec(`Blocker ${id} resolved: ${blocker.resolution}`, 'super-agent', 'SUCCESS');
  saveState(state);
};

commands.log = ({ positional }) => {
  const [message, agent, level] = positional;
  if (!message) fail('Usage: log "<message>" [agent] [LEVEL]');
  logExec(message, agent || 'super-agent', (level || 'INFO').toUpperCase());
  log('✔ logged', colors.green);
};

commands['validate-plan'] = ({ flags }) => {
  const state = loadState();
  const { errors, warnings } = planProblems(state, { incremental: Boolean(flags.incremental) });
  warnings.forEach((w) => log(`⚠ ${w}`, colors.yellow));
  if (errors.length) {
    errors.forEach((e) => log(`✖ ${e}`, colors.red));
    log(`Plan is INVALID (${errors.length} error(s)). Fix with add-phase / add-task / update-task dependencies, then re-run validate-plan.`, colors.red);
    process.exit(1);
  }
  state.phases.forEach((p) => {
    console.log(`${p.id} ${cell(p.name)}: ` + stageSummary(p).map((s) => `${s.label} ${s.total}`).join(' → '));
  });
  state.plan = { ...(state.plan || {}), validatedAt: now(), phases: state.phases.length, incremental: Boolean(flags.incremental) };
  logExec(`Plan validated: ${state.phases.length} phases, ${allTasks(state).length} tasks`, 'super-agent', 'SYSTEM');
  saveState(state);
  log(`✔ Plan is valid: ${state.phases.length} phases, ${allTasks(state).length} tasks, every phase runs Backend → Frontend → QA → Code Review.`, colors.green);
};

commands['request-changes'] = ({ positional, flags }) => {
  const [phaseId, ...findingParts] = positional;
  const findings = findingParts.join(' ');
  const taskIds = flags.tasks && flags.tasks !== true ? String(flags.tasks).split(',').map((s) => s.trim()).filter(Boolean) : [];
  if (!phaseId || !findings || !taskIds.length) fail('Usage: request-changes <phaseId> "<review findings>" --tasks T1,T2 [--retest]');
  const state = loadState();
  const phase = state.phases.find((p) => p.id === phaseId);
  if (!phase) fail(`Phase ${phaseId} not found.`);
  if (phase.status === 'COMPLETED') fail(`${phaseId} is already COMPLETED.`);
  const bad = taskIds.filter((id) => !phase.tasks.some((t) => t.id === id && ['backend-agent', 'frontend-agent'].includes(t.agent)));
  if (bad.length) fail(`--tasks must be backend/frontend tasks of ${phaseId}. Invalid: ${bad.join(', ')}`);
  phase.reviewRounds = (phase.reviewRounds || 0) + 1;
  appendLog('retry-log.md', RETRY_HEADER, `- [${now()}] ${phaseId} code review round ${phase.reviewRounds}/${MAX_REVIEW_ROUNDS} — CHANGES_REQUESTED: ${findings} (rework: ${taskIds.join(', ')})`);
  if (phase.reviewRounds >= MAX_REVIEW_ROUNDS) {
    phase.status = 'BLOCKED';
    state.project.status = 'BLOCKED';
    const id = `BLOCKER-${String(state.blockers.length + 1).padStart(3, '0')}`;
    state.blockers.push({ id, date: today(), phase: phaseId, task: '', title: `Code review still failing after ${MAX_REVIEW_ROUNDS} rounds: ${findings}`, severity: 'HIGH', status: 'OPEN' });
    logExec(`${phaseId} code review failed ${MAX_REVIEW_ROUNDS} times → BLOCKED (${id}). Human input required.`, 'code-review-agent', 'ERROR');
    saveState(state);
    log(`🚫 ${phaseId} is BLOCKED after ${MAX_REVIEW_ROUNDS} review rounds (${id}). Ask the user.`, colors.red);
    return;
  }
  const reopen = (t, note) => { t.status = 'PENDING'; t.retries = 0; delete t.completedDate; t.notes = note; };
  phase.tasks.forEach((t) => {
    if (taskIds.includes(t.id)) reopen(t, `Review round ${phase.reviewRounds}: ${findings}`);
    else if (t.agent === 'code-review-agent') reopen(t, `Re-review after round ${phase.reviewRounds}`);
    else if (t.agent === 'qa-agent' && flags.retest) reopen(t, `Re-test after review round ${phase.reviewRounds}`);
  });
  phase.status = 'IN_PROGRESS';
  logExec(`${phaseId} review round ${phase.reviewRounds}: CHANGES_REQUESTED — reopened ${taskIds.join(', ')}${flags.retest ? ' + QA' : ''} + review. ${findings}`, 'code-review-agent', 'WARN');
  saveState(state);
};

commands['complete-phase'] = ({ positional, flags }) => {
  const [id] = positional;
  if (!id) fail('Usage: complete-phase <phaseId> [--summary "what was delivered"] [--start-next] [--force]');
  const state = loadState();
  const phase = state.phases.find((p) => p.id === id);
  if (!phase) fail(`Phase ${id} not found.`);
  if (phase.status === 'COMPLETED') fail(`${id} is already COMPLETED.`);
  if (!flags.force) {
    const open = phase.tasks.filter((t) => t.status !== 'COMPLETED');
    if (open.length) fail(`Cannot close ${id}: ${open.length} task(s) not COMPLETED (${open.map((t) => `${t.id}:${t.status}`).join(', ')}).`);
    const missingStage = STAGES.filter(([, a]) => ['qa-agent', 'code-review-agent'].includes(a) && !phase.tasks.some((t) => t.agent === a));
    if (missingStage.length) fail(`Cannot close ${id}: no ${missingStage.map((s) => s[2]).join(' / ')} task — QA and Code Review are mandatory for every phase.`);
    const openBlockers = state.blockers.filter((b) => b.status !== 'RESOLVED' && b.phase === id);
    if (openBlockers.length) fail(`Cannot close ${id}: open blockers ${openBlockers.map((b) => b.id).join(', ')}.`);
  }
  const summary = flags.summary && flags.summary !== true ? String(flags.summary) : '';
  phase.status = 'COMPLETED';
  phase.completedAt = today();
  phase.report = {
    completedAt: today(),
    summary,
    tasks: phase.tasks.length,
    retries: phase.tasks.reduce((n, t) => n + (t.retries || 0), 0),
    reviewRounds: phase.reviewRounds || 0,
    stages: stageSummary(phase).map(({ label, agent, done, total }) => ({ label, agent, done, total }))
  };
  STAGES.forEach(([, agent]) => { state.agents[agent] = { lastActive: now() }; }); // clear manual overrides; status is recomputed
  state.timeline.push({ event: `${id} completed`, date: today(), notes: `${phase.name}${summary ? ' — ' + summary : ''}` });
  logExec(`${id} CLOSED: ${phase.tasks.length} tasks, ${phase.report.retries} retries, ${phase.report.reviewRounds} review round(s). ${summary}`, 'super-agent', 'PHASE');

  // decisions.md (manual, append-only file): add a closing entry
  const decisionsPath = path.join(MEM_DIR, 'decisions.md');
  let decisions = fs.existsSync(decisionsPath) ? fs.readFileSync(decisionsPath, 'utf8').replace(/\r\n/g, '\n') : '# Decisions\n';
  decisions = decisions.replace(/\n---\n\n\*Last updated:[^\n]*\*\s*$/, '\n');
  decisions = decisions.replace(/\s+$/, '\n') +
    `\n### ${id} closed — ${phase.name} (${today()})\n\n- **Delivered**: ${summary || 'see phase-reports.md'}\n- **Stats**: ${phase.tasks.length} tasks, ${phase.report.retries} retries, ${phase.report.reviewRounds} review round(s)\n- **Details**: [phase-reports.md](phase-reports.md)\n\n---\n\n*Last updated: ${today()}*\n`;
  fs.writeFileSync(decisionsPath, decisions);

  const idx = state.phases.indexOf(phase);
  const next = state.phases.slice(idx + 1).find((p) => p.status === 'PENDING');
  if (!next) {
    state.project.status = 'COMPLETED';
    state.timeline.push({ event: 'All phases completed', date: today(), notes: 'Ready for deployment (/factory-deployment)' });
  } else if (flags['start-next']) {
    next.status = 'IN_PROGRESS';
    next.startedAt = next.startedAt || today();
    state.project.status = 'IN_PROGRESS';
    logExec(`${next.id} → IN_PROGRESS`, 'super-agent', 'PHASE');
  }
  saveState(state);
  log(`✔ ${id} closed. Updated: project-status, progress, current-phase, roadmap, agent-status (project-management/); completed-tasks, phase-reports, blockers, execution-log, retry-log, decisions, state.json (memory/).`, colors.green);
  if (!next) log('🎉 All phases are complete. Next: /factory-testing (full regression) and /factory-deployment.', colors.green);
  else if (flags['start-next']) log(`▶ ${next.id} (${next.name}) is now IN_PROGRESS. Next task: run "next".`, colors.blue);
  else log(`Next: node .ai/scripts/status-manager.js set-phase ${next.id} IN_PROGRESS`, colors.blue);
};

// ---------- main ----------
const [command, ...rest] = process.argv.slice(2);
const handler = commands[command || 'help'];
if (!handler) {
  log(`Unknown command "${command}".`, colors.red);
  commands.help();
  process.exit(1);
}
handler(parseArgs(rest));
