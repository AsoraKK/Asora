const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const { resolve } = require('node:path');

const drillPath = resolve(__dirname, '../dsr-drills/live-dsr-queue-drill.mjs');
const drill = readFileSync(drillPath, 'utf8');
const jobsConfigPath = resolve(__dirname, '../../apps/lythaus-jobs/wrangler.jsonc');
const jobsConfig = readFileSync(jobsConfigPath, 'utf8');

test('live DSR drill requires successful terminal states', () => {
  assert.match(drill, /export: new Set\(\['awaiting_review', 'ready_to_release', 'released', 'succeeded'\]\)/);
  assert.match(drill, /delete: new Set\(\['succeeded'\]\)/);
  assert.match(drill, /const failedPoll = report\.polls\.find\(item => !item\.passed\)/);
});

test('live DSR drill uses isolated synthetic identities', () => {
  assert.match(drill, /DSR_DRILL_EXPORT_USER_ID is required/);
  assert.match(drill, /DSR_DRILL_DELETE_USER_ID \|\| uuidv7\(\)/);
  assert.match(jobsConfig, /"PRIVACY_QUEUE"/);
  assert.match(jobsConfig, /"ACCOUNT_DELETE"/);
  assert.match(jobsConfig, /"ACCOUNT_EXPORT"/);
});

test('live DSR evidence hashes failures and user identifiers', () => {
  assert.match(drill, /failureReasonHash/);
  assert.match(drill, /targetUserHashes/);
  assert.doesNotMatch(drill, /failureReason\.slice/);
});
