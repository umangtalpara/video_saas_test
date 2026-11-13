#!/usr/bin/env node
/**
 * validate-project.js — static architecture/naming/type-safety audit of the generated codebase.
 *
 *   node .ai/scripts/validate-project.js            # static checks on ./codebase
 *   node .ai/scripts/validate-project.js --tsc      # + `tsc --noEmit` in backend/frontend (needs npm install)
 *   node .ai/scripts/validate-project.js --path <dir>
 *
 * Exit code 0 = clean, 1 = violations.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', blue: '\x1b[34m', yellow: '\x1b[33m', red: '\x1b[31m', bold: '\x1b[1m' };
const log = (msg, color = colors.reset) => console.log(`${color}${msg}${colors.reset}`);

const argv = process.argv.slice(2);
const pathIdx = argv.indexOf('--path');
const codebaseDir = path.resolve(pathIdx >= 0 && argv[pathIdx + 1] ? argv[pathIdx + 1] : path.join(__dirname, '../../codebase'));
const runTsc = argv.includes('--tsc');

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', 'out', 'migrations', '.next', '.git']);
const ALLOWED_NAMES = new Set(['Dockerfile', 'README', 'LICENSE', 'Makefile', 'CHANGELOG', 'Procfile', 'CODEOWNERS']);
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_CLASS_LINES = 200;

let violations = 0;
const rel = (file) => path.relative(codebaseDir, file) || '.';
function report(file, rule, detail) {
  violations++;
  console.log(`${colors.red}[VIOLATION]${colors.reset} ${colors.bold}${rel(file)}${colors.reset}\n  Rule:   ${rule}\n  Detail: ${detail}\n`);
}

// Next.js special names that are valid and intentionally not kebab-case.
function isFrameworkName(name) {
  return /^\(.+\)$/.test(name)          // route groups: (auth)
    || /^\[\[?\.{0,3}[A-Za-z0-9_-]+\]?\]$/.test(name) // dynamic segments: [id], [...slug], [[...slug]]
    || name.startsWith('@')             // parallel routes
    || name.startsWith('_');            // private folders / _app
}

function checkName(entry, fullPath) {
  const name = entry.name;
  if (isFrameworkName(name)) return;
  const stem = name.split('.')[0];
  if (!stem || ALLOWED_NAMES.has(stem)) return;
  if (isFrameworkName(stem)) return; // e.g. [id].tsx
  if (!KEBAB.test(stem)) {
    report(fullPath, 'Naming (kebab-case)', `"${name}" must be lowercase kebab-case.`);
  }
}

// Blank out comments and string/template literals (keeps line structure) so regexes only see code.
function stripNoise(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { out += src[i] === '\n' ? '\n' : ' '; i++; }
      i += 2; continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      out += quote; i++;
      while (i < n && src[i] !== quote) {
        if (src[i] === '\\') { out += ' '; i++; }
        out += src[i] === '\n' ? '\n' : ' ';
        i++;
      }
      out += quote; i++; continue;
    }
    out += c; i++;
  }
  return out;
}

const ANY_PATTERN = /(:\s*any\b|\bas\s+any\b|<\s*any\s*[>,[]|\bany\s*\[\])/;
const MODEL_ACCESS = [
  [/@InjectModel\s*\(/, '@InjectModel() (Mongoose model injected)'],
  [/from\s+['"]@nestjs\/mongoose['"]/, "import from '@nestjs/mongoose'"],
  [/from\s+['"]mongoose['"]/, "import from 'mongoose'"],
  [/from\s+['"]@prisma\/client['"]/, "import from '@prisma/client'"],
  [/\bPrismaService\b/, 'PrismaService used directly'],
  [/this\.prisma\b/, 'this.prisma access'],
  [/this\.\w*Model\./, 'direct Mongoose model call']
];

function checkFile(file) {
  const ext = path.extname(file);
  if (!['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(ext)) return;
  if (file.endsWith('.d.ts')) return;
  const base = path.basename(file);
  const isSpec = /\.(spec|test|e2e-spec|api-spec)\.[tj]sx?$/.test(base);
  const raw = fs.readFileSync(file, 'utf8');
  const rawLines = raw.split(/\r?\n/);
  const code = stripNoise(raw);
  const lines = code.split('\n');
  const posix = file.split(path.sep).join('/');

  const isService = base.endsWith('.service.ts') && !isSpec;
  const isController = base.endsWith('.controller.ts') && !isSpec;
  const isRepository = base.endsWith('.repository.ts') && !isSpec;
  const isInfra = /\/database\//.test(posix) || base === 'prisma.service.ts';

  if ((isService || isController || isRepository) && rawLines.length > MAX_CLASS_LINES) {
    report(file, `Class length (<= ${MAX_CLASS_LINES} lines)`, `${rawLines.length} lines.`);
  }

  if ((isService || isController) && !isInfra) {
    const layer = isService ? 'Services' : 'Controllers';
    const seen = new Set();
    lines.forEach((line, idx) => {
      MODEL_ACCESS.forEach(([re, label]) => {
        if (re.test(line) && !seen.has(label)) {
          seen.add(label);
          report(file, 'Repository pattern', `Line ${idx + 1}: ${label}. ${layer} must go through a repository.`);
        }
      });
    });
  }

  lines.forEach((line, idx) => {
    if (!ANY_PATTERN.test(line)) return;
    const here = rawLines[idx] || '';
    const prev = rawLines[idx - 1] || '';
    if (/eslint-disable(-next-line)?[^\n]*no-explicit-any/.test(here) || /eslint-disable-next-line[^\n]*no-explicit-any/.test(prev)) return;
    report(file, 'Type safety (no any)', `Line ${idx + 1}: 'any' is forbidden. Use a specific type or 'unknown'.`);
  });
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    checkName(entry, full);
    if (entry.isDirectory()) walk(full); else checkFile(full);
  }
}

function runTypeCheck() {
  const packages = [path.join(codebaseDir, 'backend'), path.join(codebaseDir, 'frontend')];
  for (const pkg of packages) {
    if (!fs.existsSync(path.join(pkg, 'tsconfig.json'))) { log(`- tsc: ${rel(pkg)} has no tsconfig.json (skipped)`, colors.yellow); continue; }
    if (!fs.existsSync(path.join(pkg, 'node_modules'))) { log(`- tsc: ${rel(pkg)} has no node_modules — run npm install first (skipped)`, colors.yellow); continue; }
    log(`- tsc --noEmit in ${rel(pkg)} ...`, colors.blue);
    // Fixed arguments only (no user input), shell needed for npx.cmd on Windows.
    const res = spawnSync('npx tsc --noEmit', { cwd: pkg, shell: true, encoding: 'utf8' });
    if (res.status !== 0) {
      violations++;
      console.log(`${colors.red}[VIOLATION]${colors.reset} TypeScript compile errors in ${rel(pkg)}\n${(res.stdout || '') + (res.stderr || '')}`);
    } else log(`  ✔ ${rel(pkg)} compiles`, colors.green);
  }
}

log('SaaS AI Factory — project validation', colors.bold + colors.blue);
if (!fs.existsSync(codebaseDir)) {
  log(`Codebase directory not found: ${codebaseDir}`, colors.red);
  process.exit(1);
}
walk(codebaseDir);
if (runTsc) runTypeCheck();

if (violations === 0) {
  log('✔ All checks passed. Codebase complies with the workspace rules.', colors.green);
  process.exit(0);
}
log(`✘ ${violations} violation(s) found. Fix them before marking the task COMPLETED.`, colors.red);
process.exit(1);
