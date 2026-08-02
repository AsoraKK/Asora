import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'infrastructure/cloudflare/production-gates.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const phaseIndex = process.argv.indexOf('--phase');
const phase = phaseIndex === -1 ? null : process.argv[phaseIndex + 1];
const expectedSha = process.env.RELEASE_SHA ?? '';
const allowedStatuses = new Set(['COMPLETED', 'IN PROGRESS', 'BLOCKED', 'DEFERRED TO ADR 003', 'FAILED ACCEPTANCE']);
const failures = [];

function isApprovedGoogleOAuthDeferral(groupName, gateName, record) {
  return groupName === 'final'
    && gateName === 'googleOAuthAcceptance'
    && record?.status === 'DEFERRED TO ADR 003'
    && record?.ownerApproved === true
    && record?.launchBlocking === true
    && record?.scope === 'Google OAuth end-to-end session acceptance only'
    && record?.decisionDate === '2026-08-02'
    && record?.expiresWhen === 'ADR 003 authentication acceptance completes';
}

if (manifest.schemaVersion !== 'lythaus-production-gates-v2') failures.push('unsupported production gate manifest schema');
if (manifest.releaseSha !== null && (typeof manifest.releaseSha !== 'string' || !/^[0-9a-f]{40}$/.test(manifest.releaseSha))) failures.push('releaseSha must be null before merge or a full 40-character commit SHA');
if (manifest.releaseShaPolicy !== 'workflow input must equal the checked-out merged main SHA') failures.push('releaseShaPolicy must require the merged main checkout');
if (manifest.azureDeletionAuthorized !== false) failures.push('Azure deletion authorization must remain false in the production gate manifest');
if (manifest.azureDeletionExecution !== 'NOT STARTED') failures.push('Azure deletion execution must remain NOT STARTED');
if (typeof manifest.estimatedIncrementalCostUsd !== 'number' || manifest.estimatedIncrementalCostUsd < 0) failures.push('estimatedIncrementalCostUsd must be a non-negative number');
if (manifest.estimatedIncrementalCostUsd === 0) {
  if (manifest.migrationUsageAuthorized !== false || manifest.migrationUsageMaxUsd !== 0) {
    failures.push('zero-cost deployment requires migration usage authorization false and maximum US$0');
  }
} else if (manifest.migrationUsageAuthorized !== true
  || typeof manifest.migrationUsageMaxUsd !== 'number'
  || manifest.migrationUsageMaxUsd < manifest.estimatedIncrementalCostUsd) {
  failures.push('paid migration usage requires explicit authorization covering the full estimated cost');
}

if (phase !== null && phase !== 'predeploy' && phase !== 'final') failures.push(`unsupported production gate phase ${phase}`);

for (const groupName of ['predeploy', 'final']) {
  const group = manifest.gates?.[groupName];
  if (!group || typeof group !== 'object' || Array.isArray(group)) {
    failures.push(`missing ${groupName} gate group`);
    continue;
  }
  for (const [gateName, record] of Object.entries(group)) {
    if (!allowedStatuses.has(record?.status)) failures.push(`${groupName}.${gateName} has unsupported status ${record?.status}`);
    if (!Array.isArray(record?.evidence) || record.evidence.length === 0) failures.push(`${groupName}.${gateName} must cite evidence`);
    if (record?.status === 'DEFERRED TO ADR 003' && !isApprovedGoogleOAuthDeferral(groupName, gateName, record)) {
      failures.push(`${groupName}.${gateName} may not use DEFERRED TO ADR 003`);
    }
  }
}

if (phase === 'predeploy' || phase === 'final') {
  if (manifest.cutoverAuthorized !== true) failures.push('cutoverAuthorized must be true for production deployment');
  if (!/^[0-9a-f]{40}$/.test(expectedSha)) failures.push('RELEASE_SHA must be the full merged main SHA');
  if (manifest.releaseSha !== null && manifest.releaseSha !== expectedSha) failures.push(`manifest releaseSha ${manifest.releaseSha} does not match requested release ${expectedSha}`);
  for (const [gateName, record] of Object.entries(manifest.gates?.predeploy ?? {})) {
    if (record.status !== 'COMPLETED') failures.push(`predeploy.${gateName} is not COMPLETED`);
  }
}

if (phase === 'final') {
  for (const [gateName, record] of Object.entries(manifest.gates?.final ?? {})) {
    if (record.status !== 'COMPLETED' && !isApprovedGoogleOAuthDeferral('final', gateName, record)) {
      failures.push(`final.${gateName} is not COMPLETED`);
    }
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated production gate manifest${phase ? ` for ${phase}` : ''}.`);
}
