#!/usr/bin/env node
/**
 * verify-dist-structure.cjs
 *
 * Usage:
 *   node scripts/verify-dist-structure.cjs ../functions-dist.zip
 *
 * Unzips the packaged function app, verifies required files exist,
 * and prints a summary of HTTP/timer functions detected.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function exitWith(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

const inputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, '..', '..', 'functions-dist.zip');

if (!fs.existsSync(inputPath)) {
  exitWith(`Zip artifact not found at ${inputPath}. Build and zip dist/ first.`);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'asora-functions-'));

try {
  console.log(`🔍 Inspecting ${inputPath}`);
  const unzipResult = spawnSync('unzip', ['-qq', inputPath, '-d', tempDir], { stdio: 'inherit' });
  if (unzipResult.status !== 0) {
    exitWith('Failed to unzip artifact. Ensure the zip file is valid.');
  }

  const requiredEntries = [
    'index.js',
    'host.json',
    'package.json',
    'package-lock.json',
    'src/index.js',
    'src/notifications/http/devicesApi.function.js',
    'src/notifications/http/preferencesApi.function.js',
    'src/notifications/http/notificationsApi.function.js',
    'src/notifications/timers/processPendingNotifications.function.js',
    'node_modules/@azure/functions/package.json',
  ];

  const missing = requiredEntries.filter((relPath) =>
    !fs.existsSync(path.join(tempDir, relPath))
  );

  if (missing.length > 0) {
    missing.forEach((m) => console.error(`  - Missing ${m}`));
    exitWith('One or more required files are missing from the artifact.');
  }

  const httpFunctions = [];
  const timerFunctions = [];

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!entry.name.endsWith('.js')) {
        continue;
      }

      const relPath = path.relative(tempDir, fullPath);
      const contents = fs.readFileSync(fullPath, 'utf8');
      if (contents.includes('app.http(')) {
        httpFunctions.push(relPath);
      }
      if (contents.includes('app.timer(')) {
        timerFunctions.push(relPath);
      }
    }
  }

  walk(path.join(tempDir, 'src'));

  console.log('✅ Verified required files.');
  console.log(`• HTTP functions detected: ${httpFunctions.length}`);
  httpFunctions.forEach((fn) => console.log(`   - ${fn}`));
  console.log(`• Timer functions detected: ${timerFunctions.length}`);
  timerFunctions.forEach((fn) => console.log(`   - ${fn}`));
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('🎯 Artifact structure looks good.');