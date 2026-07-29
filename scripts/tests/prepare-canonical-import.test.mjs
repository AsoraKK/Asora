import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value), 'utf8');

test('prepares only canonical records from synthetic Azure fixtures', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lythaus-azure-transform-'));
  const source = path.join(root, 'raw');
  const cosmos = path.join(source, 'cosmos');
  const blobs = path.join(source, 'blobs');
  fs.mkdirSync(cosmos, { recursive: true });
  fs.mkdirSync(blobs, { recursive: true });
  const ids = {
    real: '01900000-0000-7000-8000-000000000001',
    test: '01900000-0000-7000-8000-000000000002',
    profile: '01900000-0000-7000-8000-000000000003',
    deleted: '01900000-0000-7000-8000-000000000004',
    held: '01900000-0000-7000-8000-000000000005',
  };
  const fixtures = {
    users: [
      { id: ids.real, displayName: 'Possible user', email: 'possible@person.invalid', createdAt: '2026-07-01T00:00:00Z' },
      { id: ids.test, displayName: 'Synthetic user', isTest: true, createdAt: '2026-07-01T00:00:00Z' },
    ],
    posts: [
      { id: '01900000-0000-7000-8000-000000000010', authorId: ids.test, content: 'acceptance drill post' },
    ],
    profiles: [
      { id: '01900000-0000-7000-8000-000000000011', userId: ids.profile, displayName: 'Profile', bio: 'Bio', _ts: 1782864000 },
    ],
    privacy_requests: [
      {
        id: '01900000-0000-7000-8000-000000000020',
        userId: ids.profile,
        type: 'export',
        status: 'awaiting_review',
        requestedAt: '2026-07-02T00:00:00Z',
        exportBlobPath: 'exports/profile.zip',
        audit: [{ at: '2026-07-02T00:00:01Z', event: 'export.uploaded' }],
      },
      {
        id: '01900000-0000-7000-8000-000000000021',
        userId: ids.profile,
        type: 'export',
        status: 'awaiting_review',
        requestedAt: '2026-07-02T00:00:00Z',
        note: 'DSR drill',
      },
      {
        id: '01900000-0000-7000-8000-000000000022',
        userId: ids.deleted,
        type: 'delete',
        status: 'succeeded',
        requestedAt: '2026-07-03T00:00:00Z',
        completedAt: '2026-07-03T00:01:00Z',
      },
      {
        id: '01900000-0000-7000-8000-000000000023',
        userId: ids.held,
        type: 'delete',
        status: 'canceled',
        requestedAt: '2026-07-04T00:00:00Z',
        completedAt: '2026-07-04T00:01:00Z',
      },
    ],
    legal_holds: [
      {
        id: '01900000-0000-7000-8000-000000000030',
        scopeId: ids.held,
        active: true,
        reason: 'hold pending disposition',
        startedAt: '2026-07-04T00:00:00Z',
      },
      {
        id: '01900000-0000-7000-8000-000000000031',
        scopeId: ids.test,
        active: true,
        reason: 'legal drill hold',
        startedAt: '2026-07-04T00:00:00Z',
      },
    ],
  };
  for (const [container, records] of Object.entries(fixtures)) writeJson(path.join(cosmos, `${container}.json`), records);
  writeJson(path.join(source, 'manifest.json'), {
    formatVersion: 'fixture',
    cosmos: Object.entries(fixtures).map(([container, records]) => ({
      container,
      recordCount: records.length,
      sourceSha256: '00'.repeat(32),
      schemaVersions: [],
      lastWriteAt: null,
    })),
    blobs: {},
  });
  writeJson(path.join(blobs, 'dsr-exports-manifest.json'), [{
    sourceName: 'exports/profile.zip',
    sourceNameSha256: '11'.repeat(32),
    contentSha256: '22'.repeat(32),
    bytes: 100,
  }]);
  const output = path.join(root, 'canonical.json');
  const evidence = path.join(root, 'evidence.json');
  const result = spawnSync(
    process.execPath,
    [
      path.resolve('scripts/azure-exit/prepare-canonical-import.mjs'),
      '--source-dir',
      source,
      '--output',
      output,
      '--evidence',
      evidence,
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, MIGRATION_EVIDENCE_KEY: 'ab'.repeat(32) },
    },
  );
  assert.equal(result.status, 0, result.stderr);
  const prepared = JSON.parse(fs.readFileSync(output, 'utf8'));
  assert.equal(prepared.tables['identity.users'].length, 4);
  assert.equal(prepared.tables['identity.contact_emails'].length, 1);
  assert.equal(prepared.tables['privacy.requests'].length, 3);
  assert.equal(prepared.tables['privacy.legal_holds'].length, 1);
  assert.equal(prepared.tables['privacy.deletion_tombstones'].length, 1);
  assert.equal(prepared.tables['social.profiles'].length, 1);
  assert.equal(prepared.dsrObjects.length, 1);
  assert.equal(prepared.tables['identity.users'].filter((row) => row.status === 'deleted').length, 1);
  assert.equal(
    prepared.tables['identity.users'].some((row) => row.id === ids.test),
    false,
  );
  const sanitizedEvidence = fs.readFileSync(evidence, 'utf8');
  assert.equal(sanitizedEvidence.includes('possible@person.invalid'), false);
  assert.equal(sanitizedEvidence.includes(ids.real), false);
});
