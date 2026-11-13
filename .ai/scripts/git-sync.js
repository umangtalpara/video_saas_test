#!/usr/bin/env node
/**
 * git-sync.js — pushes/pulls codebase/backend and codebase/frontend to their own repositories
 * via `git subtree` (3-repository strategy). Remotes come from .ai/settings.json -> git_remotes.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', blue: '\x1b[34m', yellow: '\x1b[33m', red: '\x1b[31m', bold: '\x1b[1m' };
const log = (msg, color = colors.reset) => console.log(`${color}${msg}${colors.reset}`);

const settingsPath = path.join(__dirname, '../settings.json');
if (!fs.existsSync(settingsPath)) { log('settings.json not found in .ai/', colors.red); process.exit(1); }
let settings;
try { settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')); } catch (e) { log(`settings.json is not valid JSON: ${e.message}`, colors.red); process.exit(1); }

const remotes = settings.git_remotes || {};
const command = process.argv[2];
const targetBranch = process.argv[3] || 'main';

if (!/^[A-Za-z0-9._/-]+$/.test(targetBranch)) { log(`Invalid branch name: ${targetBranch}`, colors.red); process.exit(1); }

function git(args) {
  log(`Executing: git ${args.join(' ')}`, colors.blue);
  try {
    execFileSync('git', args, { stdio: 'inherit' });
    log('Command executed successfully!\n', colors.green);
  } catch (err) {
    log(`git failed: ${err.message}`, colors.red);
    process.exit(1);
  }
}

function usable(prefix, remoteUrl) {
  if (!remoteUrl || remoteUrl.includes('yourusername')) {
    log(`Remote for "${prefix}" is not configured. Set git_remotes.${prefix.split('/').pop()} in .ai/settings.json (the Super Agent does this during Discovery Q3).`, colors.red);
    return false;
  }
  if (!fs.existsSync(path.join(process.cwd(), prefix))) {
    log(`Directory "${prefix}" does not exist yet — nothing to sync.`, colors.red);
    return false;
  }
  return true;
}

function push(prefix, remoteUrl) {
  if (!usable(prefix, remoteUrl)) return;
  log(`Pushing "${prefix}" to ${remoteUrl} (${targetBranch})...`, colors.bold + colors.yellow);
  git(['subtree', 'push', `--prefix=${prefix}`, remoteUrl, targetBranch]);
}

function pull(prefix, remoteUrl) {
  if (!usable(prefix, remoteUrl)) return;
  log(`Pulling "${prefix}" from ${remoteUrl} (${targetBranch})...`, colors.bold + colors.yellow);
  git(['subtree', 'pull', `--prefix=${prefix}`, remoteUrl, targetBranch, '--squash', '-m', `Merge updates from downstream ${prefix} repo`]);
}

const BE = 'codebase/backend';
const FE = 'codebase/frontend';
switch (command) {
  case 'push-backend': push(BE, remotes.backend); break;
  case 'push-frontend': push(FE, remotes.frontend); break;
  case 'push-all': push(BE, remotes.backend); push(FE, remotes.frontend); break;
  case 'pull-backend': pull(BE, remotes.backend); break;
  case 'pull-frontend': pull(FE, remotes.frontend); break;
  default:
    console.log(`
SaaS AI Factory — Downstream Repositories Git Sync CLI

Usage: node .ai/scripts/git-sync.js <command> [target-branch]

Commands:
  push-backend | push-frontend | push-all
  pull-backend | pull-frontend

Run from the repository root. Default branch: main. Commit your changes first (git subtree needs a clean tree).
`);
}
