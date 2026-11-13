#!/usr/bin/env node
/**
 * verify-ssh.js — checks that git remotes are reachable and authorized over SSH.
 * Works with any git host (GitHub, GitLab, Bitbucket, Azure DevOps, self-hosted).
 *
 *   node .ai/scripts/verify-ssh.js <ssh-url> [<ssh-url> ...]
 */
const { execFileSync } = require('child_process');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', blue: '\x1b[34m', yellow: '\x1b[33m', red: '\x1b[31m', bold: '\x1b[1m' };
const log = (msg, color = colors.reset) => console.log(`${color}${msg}${colors.reset}`);

// scp-like (git@host:owner/repo.git) or ssh://[user@]host[:port]/path ; no whitespace or shell metacharacters.
const SCP_LIKE = /^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+:[A-Za-z0-9._~/-]+$/;
const SSH_URL = /^ssh:\/\/([A-Za-z0-9._-]+@)?[A-Za-z0-9.-]+(:\d+)?\/[A-Za-z0-9._~/-]+$/;

const urls = process.argv.slice(2);
if (urls.length === 0) {
  log('SaaS AI Factory — SSH Repository Connection Verifier', colors.bold + colors.blue);
  console.log('\nUsage: node verify-ssh.js <ssh-url-1> [ssh-url-2] ...\n');
  process.exit(0);
}

log(`Validating ${urls.length} remote repository SSH link(s)...\n`, colors.bold + colors.blue);
let hasFailure = false;

urls.forEach((url, index) => {
  log(`[${index + 1}/${urls.length}] Testing: ${url}`, colors.yellow);
  if (!SCP_LIKE.test(url) && !SSH_URL.test(url)) {
    log('✖ Not a valid SSH remote URL. Expected git@host:owner/repo.git or ssh://git@host/owner/repo.git\n', colors.red);
    hasFailure = true;
    return;
  }
  try {
    // execFileSync (no shell) + BatchMode so a missing key fails fast instead of hanging on a prompt.
    execFileSync('git', ['ls-remote', '--heads', url], {
      stdio: 'ignore',
      timeout: 15000,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND || 'ssh -o BatchMode=yes -o ConnectTimeout=10' }
    });
    log('✔ Connection successful. Access is verified.\n', colors.green);
  } catch (err) {
    log(`✖ Connection failed for ${url}`, colors.red);
    log('  Possible causes:', colors.red);
    log('  1. The repository does not exist or the URL is misspelled.', colors.yellow);
    log('  2. Your SSH public key is not registered with the git host.', colors.yellow);
    log('  3. ssh-agent does not have the correct key loaded.', colors.yellow);
    log('  * Test the host directly, e.g.: ssh -T git@github.com\n', colors.blue);
    hasFailure = true;
  }
});

if (hasFailure) process.exit(1);
log('✔ All repository SSH connections are working.', colors.bold + colors.green);
process.exit(0);
