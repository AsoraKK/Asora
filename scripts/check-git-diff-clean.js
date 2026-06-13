#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');

const paths = process.argv.slice(2);

if (paths.length === 0) {
  console.error('Usage: node scripts/check-git-diff-clean.js <path> [<path> ...]');
  process.exit(1);
}

function runGit(args) {
  return spawnSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const status = runGit(['status', '--short', '--untracked-files=all', '--', ...paths]);

if (status.status !== 0) {
  process.stderr.write(status.stderr || 'git status failed\n');
  process.exit(status.status ?? 1);
}

const changed = status.stdout
  .split(/\r?\n/u)
  .map((line) => line.trim())
  .filter(Boolean);

if (changed.length > 0) {
  console.error('Generated artifacts are out of date. Regenerate and commit these paths:');
  for (const changedEntry of changed) {
    console.error(`  ${changedEntry}`);
  }
  process.exit(1);
}

console.log(`OK: no tracked diff under ${paths.join(', ')}`);
