#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const roots = process.argv.slice(2);

if (roots.length === 0) {
  console.error('Usage: node scripts/trim-trailing-whitespace.js <path> [<path> ...]');
  process.exit(1);
}

// Keep generated OpenAPI client diffs stable by removing trailing spaces only.
const textExtensions = new Set([
  '.dart',
  '.json',
  '.md',
  '.ts',
  '.yaml',
  '.yml',
]);

function isTextFile(filePath) {
  return textExtensions.has(path.extname(filePath).toLowerCase());
}

function walk(targetPath) {
  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(targetPath).sort()) {
      walk(path.join(targetPath, entry));
    }
    return;
  }
  if (!stat.isFile() || !isTextFile(targetPath)) {
    return;
  }

  const original = fs.readFileSync(targetPath, 'utf8');
  const trimmed = original
    .replace(/[ \t]+$/gmu, '')
    .replace(/(?:\r?\n)*$/u, '\n');
  if (trimmed !== original) {
    fs.writeFileSync(targetPath, trimmed, 'utf8');
  }
}

for (const root of roots) {
  walk(path.resolve(root));
}
