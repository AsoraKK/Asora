import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'infrastructure/cloudflare/production-gates.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const requirePass = process.argv.includes('--require-pass');
const expectedSha = process.env.RELEASE_SHA ?? '';
const allowedStatuses = new Set(['COMPLETED', 'IN PROGRESS', 'BLOCKED', 'DEFERRED BY ARCHITECTURE', 'FAILED ACCEPTANCE']);
const requiredGates = [
  'gate1OwnershipIsolation',
  'gate2RegionTopology',
  'gate3DatabaseCryptography',
  'gate4RuntimeProduct',
  'gate5RecoveryCutover',
];
const failures = [];

if (manifest.schemaVersion !== 'lythaus-production-gates-v1') failures.push('unsupported production gate manifest schema');
if (typeof manifest.releaseSha !== 'string' || !/^[0-9a-f]{40}$/.test(manifest.releaseSha)) failures.push('releaseSha must be a full 40-character commit SHA');
if (expectedSha && manifest.releaseSha !== expectedSha) failures.push(`manifest releaseSha ${manifest.releaseSha} does not match requested release ${expectedSha}`);
if (manifest.azureDeletionAuthorized !== false) failures.push('Azure deletion authorization must remain false in the production gate manifest');
for (const gate of requiredGates) {
  const record = manifest.gates?.[gate];
  if (!record) {
    failures.push(`missing ${gate}`);
    continue;
  }
  if (!allowedStatuses.has(record.status)) failures.push(`${gate} has unsupported status ${record.status}`);
  if (!Array.isArray(record.evidence) || record.evidence.length === 0) failures.push(`${gate} must cite evidence`);
}
if (requirePass) {
  if (manifest.cutoverAuthorized !== true) failures.push('cutoverAuthorized must be true for production deployment');
  for (const gate of requiredGates) {
    if (manifest.gates?.[gate]?.status !== 'COMPLETED') failures.push(`${gate} is not COMPLETED`);
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated production gate manifest${requirePass ? ' for cutover' : ''}.`);
}
