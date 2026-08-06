import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const retiredBrand = ['as', 'ora'].join('');
const retiredProvider = ['az', 'ure'].join('');
const retiredDatabase = ['cos', 'mos'].join('');
const retiredClassifier = ['hi', 've'].join('');
const trackedFiles = execFileSync('git', ['ls-files', '-z'], {
  cwd: root,
  encoding: 'utf8',
}).split('\0').filter(Boolean);

const excludedPaths = [
  /^docs\/history\//,
  /^docs\/security\/azure-github-secret-removal-2026-08-06\.md$/,
  /^apps\/lythaus-(?:public-api|admin-api|jobs)\/src\/worker-configuration\.d\.ts$/,
  /^AGENTS\.md$/,
  /^README\.md$/,
  /^\.github\/copilot-instructions\.md$/,
  /^scripts\/validate-no-retired-provider-dependencies\.mjs$/,
];

const forbidden = [
  { name: 'retired brand', pattern: new RegExp(`\\b${retiredBrand}\\b|${retiredBrand}_|_${retiredBrand}|package:${retiredBrand}|com\\.${retiredBrand}|${retiredBrand}\\.co\\.za|${retiredBrand}:\\/\\/`, 'i') },
  { name: 'retired provider', pattern: new RegExp(`\\b${retiredProvider}\\b|${retiredProvider}_|${retiredProvider}websites|@${retiredProvider}\\/|${retiredProvider}-functions|${retiredProvider}webjobsstorage|keyvault|applicationinsights`, 'i') },
  { name: 'retired database', pattern: new RegExp(`\\b${retiredDatabase}\\b|${retiredDatabase}client`, 'i') },
  { name: 'retired classifier', pattern: new RegExp(`\\b${retiredClassifier}\\b|${retiredClassifier}-client|the${retiredClassifier}`, 'i') },
  { name: 'retired authentication', pattern: /flutter_appauth|google_sign_in|signinwithgoogle|signinwithapple|world.?id|google_auth_enabled|apple_auth_enabled|world_id_auth_enabled/i },
];

const failures = [];
const immutablePreRetirementAuthMigration = /^database\/planetscale\/migrations\/0002_core_tables\.sql$/;

for (const relative of trackedFiles) {
  const normalized = relative.replaceAll('\\', '/');
  if (excludedPaths.some((pattern) => pattern.test(normalized))) continue;

  for (const rule of forbidden) {
    if (rule.name === 'retired authentication' && immutablePreRetirementAuthMigration.test(normalized)) continue;
    if (rule.pattern.test(normalized)) {
      failures.push(`${normalized}: ${rule.name} appears in active path`);
    }
  }

  const file = path.join(root, relative);
  let contents;
  try {
    contents = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  if (contents.includes('\0')) continue;

  for (const rule of forbidden) {
    // Applied migrations are checksum-immutable. Migration 0011 removes these
    // provider records with a forward-only change.
    if (rule.name === 'retired authentication' && immutablePreRetirementAuthMigration.test(normalized)) continue;
    if (rule.pattern.test(contents)) {
      failures.push(`${normalized}: ${rule.name} appears in active content`);
    }
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${trackedFiles.length} tracked files contain no active retired brand, provider, database, classifier, or authentication references.`);
}
