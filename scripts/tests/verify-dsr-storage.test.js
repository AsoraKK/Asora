const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const { resolve } = require('node:path');

const verifierPath = resolve(__dirname, '../../infra/scripts/verify-dsr-storage.sh');
const verifier = readFileSync(verifierPath, 'utf8');

test('management policy checks use the current Azure CLI account argument', () => {
  const calls = [
    ...verifier.matchAll(
      /az storage account management-policy show \\\r?\n\s+(--[^\r\n]+)/g
    ),
  ];

  assert.equal(calls.length, 4);
  assert.ok(
    calls.every((call) => call[1].startsWith('--account-name "$STORAGE_ACCOUNT"'))
  );
  assert.doesNotMatch(
    verifier,
    /az storage account management-policy show \\\r?\n\s+--name/
  );
});

test('retention checks follow the current management policy response shape', () => {
  assert.match(
    verifier,
    /definition\.actions\.baseBlob\.delete\.daysAfterModificationGreaterThan/
  );
  assert.match(
    verifier,
    /definition\.actions\.snapshot\.delete\.daysAfterCreationGreaterThan/
  );
});
