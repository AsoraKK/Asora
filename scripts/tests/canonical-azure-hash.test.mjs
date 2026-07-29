import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalDatasetHash,
  canonicalJson,
  deterministicUuidv7,
} from '../azure-exit/canonical-hash.mjs';

test('canonical JSON stabilizes object key ordering', () => {
  assert.equal(canonicalJson({ z: 1, a: null }), '{"a":null,"z":1}');
});

test('missing, null, and empty values hash differently', () => {
  const missing = canonicalDatasetHash([{ id: '1' }]);
  const nullValue = canonicalDatasetHash([{ id: '1', value: null }]);
  const emptyValue = canonicalDatasetHash([{ id: '1', value: '' }]);
  assert.notEqual(missing, nullValue);
  assert.notEqual(nullValue, emptyValue);
  assert.notEqual(missing, emptyValue);
});

test('record order does not affect the dataset hash', () => {
  const first = canonicalDatasetHash([{ id: 'b', value: 2 }, { id: 'a', value: 1 }]);
  const second = canonicalDatasetHash([{ value: 1, id: 'a' }, { value: 2, id: 'b' }]);
  assert.equal(first, second);
});

test('UUIDv7 mapping is deterministic and versioned', () => {
  const key = '00'.repeat(32);
  const first = deterministicUuidv7('legacy-user-1', '2026-07-28T00:00:00.000Z', key);
  const second = deterministicUuidv7('legacy-user-1', '2026-07-28T00:00:00.000Z', key);
  assert.equal(first, second);
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});
