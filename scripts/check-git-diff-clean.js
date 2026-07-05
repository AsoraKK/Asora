#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');

const argv = process.argv.slice(2);
const paths = [];
const ignores = [];

function normalizeGitPath(value) {
  return value.replace(/\\/gu, '/').replace(/\/+/gu, '/').replace(/\/$/u, '');
}

function runGit(args) {
  return spawnSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i];

  if (arg === '--ignore') {
    const ignorePath = argv[i + 1];
    if (!ignorePath) {
      console.error('Usage: node scripts/check-git-diff-clean.js <path> [<path> ...] [--ignore <path>]');
      process.exit(1);
    }
    ignores.push(normalizeGitPath(ignorePath));
    i += 1;
    continue;
  }

  if (arg.startsWith('-')) {
    console.error(`Unknown option "${arg}".`);
    process.exit(1);
  }

  paths.push(normalizeGitPath(arg));
}

if (paths.length === 0) {
  console.error('Usage: node scripts/check-git-diff-clean.js <path> [<path> ...] [--ignore <path>]');
  process.exit(1);
}

function isIgnored(changedPath) {
  return ignores.some((ignorePath) => changedPath === ignorePath || changedPath.startsWith(`${ignorePath}/`));
}

const status = runGit(['status', '--short', '--untracked-files=all', '--', ...paths]);

if (status.status !== 0) {
  process.stderr.write(status.stderr || 'git status failed\n');
  process.exit(status.status ?? 1);
}

const changed = status.stdout
  .split(/\r?\n/u)
  .map((line) => line.replace(/\r$/u, ''))
  .filter(Boolean)
  .map((line) => {
    const rawPath = line.slice(3);
    const changedPath = normalizeGitPath(rawPath.split(' -> ').pop() || rawPath);
    return { line, changedPath };
  })
  .filter(({ changedPath }) => !isIgnored(changedPath));

if (changed.length > 0) {
  console.error('Generated artifacts are out of date. Regenerate and commit these paths:');
  for (const changedEntry of changed) {
    console.error(`  ${changedEntry.line}`);
  }
  process.exit(1);
}

const suffix = ignores.length > 0 ? ` (ignoring ${ignores.join(', ')})` : '';
console.log(`OK: no tracked diff under ${paths.join(', ')}${suffix}`);
