#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const target = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npm, ['audit', '--omit=dev', '--json'], {
  cwd: target,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(`Unable to execute npm audit for ${target}: ${result.error.message}`);
  process.exit(2);
}

let report;
try {
  report = JSON.parse(result.stdout || '{}');
} catch {
  console.error(`Unable to parse npm audit JSON for ${target}.`);
  if (result.stderr) console.error(result.stderr.trim());
  process.exit(2);
}

const counts = report.metadata?.vulnerabilities;
if (!counts || typeof counts.high !== 'number' || typeof counts.critical !== 'number') {
  console.error(`npm audit did not return vulnerability counts for ${target}.`);
  if (report.error?.summary) console.error(report.error.summary);
  process.exit(2);
}

console.log(
  `${target}: low=${counts.low} moderate=${counts.moderate} high=${counts.high} critical=${counts.critical}`
);

if (counts.high > 0 || counts.critical > 0) {
  console.error(`Blocking production dependency findings remain in ${target}.`);
  process.exit(1);
}
