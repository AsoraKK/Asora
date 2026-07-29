import crypto from 'node:crypto';
import fs from 'node:fs';
import pg from 'pg';
import { canonicalJson } from './canonical-hash.mjs';

const { Client } = pg;
const manifestPath = process.env.LYTHAUS_DSR_UPLOAD_MANIFEST_PATH ?? '';
const evidencePath = process.env.LYTHAUS_DSR_IMPORT_EVIDENCE_PATH ?? '';
const expectedRawHash = process.env.LYTHAUS_DSR_UPLOAD_MANIFEST_SHA256 ?? '';
const databaseUrl = process.env.PLANETSCALE_ADMIN_DATABASE_URL ?? '';
const branch = process.env.PSCALE_BRANCH_NAME ?? '';
const approval = process.env.PLANETSCALE_DATA_IMPORT_APPROVED ?? '';
const usageApproval = process.env.PLANETSCALE_MIGRATION_USAGE_APPROVED ?? '';
const usageMaxUsd = Number(process.env.PLANETSCALE_MIGRATION_USAGE_MAX_USD ?? '0');

if (branch !== 'main') throw new Error('DSR evidence import requires PSCALE_BRANCH_NAME=main');
if (approval !== 'approved') throw new Error('DSR evidence import requires PLANETSCALE_DATA_IMPORT_APPROVED=approved');
if (usageApproval !== 'approved' || !Number.isFinite(usageMaxUsd) || usageMaxUsd < 0) {
  throw new Error('DSR evidence import requires measured non-negative usage approval');
}
if (!databaseUrl) throw new Error('PLANETSCALE_ADMIN_DATABASE_URL is required');
if (!manifestPath || !fs.existsSync(manifestPath)) throw new Error('protected DSR upload manifest is required');
if (!/^[0-9a-f]{64}$/i.test(expectedRawHash)) throw new Error('DSR upload manifest SHA-256 is required');

const connection = new URL(databaseUrl);
if (connection.searchParams.get('sslmode') !== 'verify-full') {
  throw new Error('production import requires sslmode=verify-full');
}

const raw = fs.readFileSync(manifestPath);
const rawHash = crypto.createHash('sha256').update(raw).digest('hex');
if (rawHash !== expectedRawHash.toLowerCase()) throw new Error('DSR upload manifest raw hash mismatch');
const entries = JSON.parse(raw.toString('utf8').replace(/^\uFEFF/, ''));
if (!Array.isArray(entries) || entries.length === 0) throw new Error('DSR upload manifest must contain records');

const allowedBucket = 'lythaus-private-exports-dev';
const allowedPrefix = 'protected-migration/dsr/';
const requiredKeys = [
  'requestId',
  'subjectId',
  'destinationBucket',
  'destinationKey',
  'sourcePackageSha256',
  'sourceBytes',
  'encryptedFile',
  'encryptedSha256',
  'encryptedBytes',
  'restoreVerified',
];
for (const entry of entries) {
  const unknown = Object.keys(entry).filter((key) => !requiredKeys.includes(key));
  if (unknown.length) throw new Error(`unapproved DSR manifest fields: ${unknown.join(',')}`);
  if (requiredKeys.some((key) => !(key in entry))) throw new Error('DSR manifest record is incomplete');
  if (entry.destinationBucket !== allowedBucket || !entry.destinationKey.startsWith(allowedPrefix)) {
    throw new Error('DSR destination is outside the approved protected prefix');
  }
  if (!/^[0-9a-f]{64}$/i.test(entry.sourcePackageSha256) || !/^[0-9a-f]{64}$/i.test(entry.encryptedSha256)) {
    throw new Error('DSR package hashes must be SHA-256');
  }
  if (!Number.isSafeInteger(entry.sourceBytes) || entry.sourceBytes <= 0
      || !Number.isSafeInteger(entry.encryptedBytes) || entry.encryptedBytes <= 0) {
    throw new Error('DSR package sizes must be positive integers');
  }
  if (entry.restoreVerified !== true) throw new Error('DSR package restore verification is required');
}

const sortedEntries = [...entries].sort((left, right) =>
  left.requestId.localeCompare(right.requestId) || left.destinationKey.localeCompare(right.destinationKey));
const sourceSemanticHash = crypto.createHash('sha256').update(canonicalJson(sortedEntries)).digest('hex');

function uuidv7(now = Date.now()) {
  const bytes = crypto.randomBytes(16);
  const timestamp = BigInt(now) & 0xffffffffffffn;
  for (let index = 0; index < 6; index += 1) {
    bytes[index] = Number(timestamp >> BigInt((5 - index) * 8)) & 0xff;
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: true } });
await client.connect();
try {
  await client.query('BEGIN');
  const mappings = [];
  try {
    for (const entry of sortedEntries) {
      const request = await client.query(
        'SELECT id, subject_id FROM privacy.requests WHERE id = $1',
        [entry.requestId],
      );
      if (request.rowCount !== 1 || request.rows[0].subject_id !== entry.subjectId) {
        throw new Error('DSR request and subject relationship does not reconcile');
      }
      const activeHold = await client.query(
        'SELECT EXISTS (SELECT 1 FROM privacy.legal_holds WHERE subject_id = $1 AND active) AS active',
        [entry.subjectId],
      );
      const existing = await client.query(
        'SELECT id, package_hash FROM privacy.export_manifests WHERE request_id = $1 AND object_key = $2',
        [entry.requestId, entry.destinationKey],
      );
      if (existing.rowCount === 1 && existing.rows[0].package_hash !== entry.encryptedSha256) {
        throw new Error('existing DSR export manifest has a conflicting package hash');
      }
      const manifestId = existing.rows[0]?.id ?? uuidv7();
      await client.query(
        `INSERT INTO privacy.export_manifests (id, request_id, object_key, package_hash, expires_at)
         VALUES ($1, $2, $3, $4, '2099-12-31T23:59:59Z'::timestamptz)
         ON CONFLICT (request_id, object_key) DO UPDATE
         SET package_hash = EXCLUDED.package_hash,
             expires_at = EXCLUDED.expires_at`,
        [manifestId, entry.requestId, entry.destinationKey, entry.encryptedSha256],
      );
      const resourceReference = `r2://${entry.destinationBucket}/${entry.destinationKey}`;
      await client.query(
        `INSERT INTO privacy.subject_data_locations
           (subject_id, store_type, resource_reference, entity_type, entity_id,
            authoritative_or_derived, retention_class, legal_hold_state, deletion_state, last_verified_at)
         VALUES ($1, 'r2', $2, 'privacy.export_manifest', $3,
                 'authoritative', 'migration-evidence', $4, 'present', now())
         ON CONFLICT (subject_id, store_type, resource_reference, entity_type, entity_key) DO UPDATE
         SET authoritative_or_derived = EXCLUDED.authoritative_or_derived,
             retention_class = EXCLUDED.retention_class,
             legal_hold_state = EXCLUDED.legal_hold_state,
             deletion_state = EXCLUDED.deletion_state,
             last_verified_at = EXCLUDED.last_verified_at`,
        [entry.subjectId, resourceReference, entry.requestId, activeHold.rows[0]?.active ? 'active' : 'none'],
      );
      mappings.push({
        requestId: entry.requestId,
        subjectId: entry.subjectId,
        manifestId,
        objectKey: entry.destinationKey,
        encryptedSha256: entry.encryptedSha256,
      });
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  }

  const destination = await client.query(
    `SELECT m.id, m.request_id, r.subject_id, m.object_key, m.package_hash, m.expires_at,
            l.resource_reference, l.retention_class, l.legal_hold_state, l.deletion_state
       FROM privacy.export_manifests m
       JOIN privacy.requests r ON r.id = m.request_id
       JOIN privacy.subject_data_locations l
         ON l.subject_id = r.subject_id
        AND l.entity_type = 'privacy.export_manifest'
        AND l.entity_id = m.request_id
        AND l.resource_reference = 'r2://' || $1 || '/' || m.object_key
      WHERE m.object_key LIKE $2
      ORDER BY m.request_id, m.object_key`,
    [allowedBucket, `${allowedPrefix}%`],
  );
  if (destination.rowCount !== sortedEntries.length) throw new Error('DSR destination row reconciliation failed');
  const destinationSemanticHash = crypto.createHash('sha256').update(canonicalJson(destination.rows)).digest('hex');
  const evidence = {
    formatVersion: 'lythaus-dsr-import-evidence-v1',
    createdAt: new Date().toISOString(),
    branch,
    sourceRawSha256: rawHash,
    sourceSemanticSha256: sourceSemanticHash,
    destinationSemanticSha256: destinationSemanticHash,
    importedExportManifests: destination.rowCount,
    importedSubjectLocations: destination.rowCount,
    usageMaximumUsd: usageMaxUsd,
    mappings,
  };
  if (evidencePath) fs.writeFileSync(evidencePath, `${canonicalJson(evidence)}\n`, { encoding: 'utf8', mode: 0o600 });
  console.log(JSON.stringify({
    branch,
    sourceRawSha256: rawHash,
    sourceSemanticSha256: sourceSemanticHash,
    destinationSemanticSha256: destinationSemanticHash,
    importedExportManifests: destination.rowCount,
    importedSubjectLocations: destination.rowCount,
    usageMaximumUsd: usageMaxUsd,
  }, null, 2));
} finally {
  await client.end();
}
