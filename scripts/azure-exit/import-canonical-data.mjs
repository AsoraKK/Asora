import crypto from 'node:crypto';
import fs from 'node:fs';
import pg from 'pg';
import { canonicalJson } from './canonical-hash.mjs';

const { Client } = pg;
const importPath = process.env.LYTHAUS_CANONICAL_IMPORT_PATH ?? '';
const expectedHash = process.env.LYTHAUS_CANONICAL_IMPORT_SHA256 ?? '';
const databaseUrl = process.env.PLANETSCALE_ADMIN_DATABASE_URL ?? '';
const branch = process.env.PSCALE_BRANCH_NAME ?? '';
const approval = process.env.PLANETSCALE_DATA_IMPORT_APPROVED ?? '';
const usageApproval = process.env.PLANETSCALE_MIGRATION_USAGE_APPROVED ?? '';
const usageMaxUsd = Number(process.env.PLANETSCALE_MIGRATION_USAGE_MAX_USD ?? '0');
const localPg17Test = process.env.LYTHAUS_ALLOW_LOCAL_PG17_IMPORT_TEST === 'true';
const piiEncryptionKey = process.env.PII_ENCRYPTION_KEY_V1 ?? '';
const piiHmacKey = process.env.PII_HMAC_KEY_V1 ?? '';

if (branch !== 'main') throw new Error('canonical data import requires PSCALE_BRANCH_NAME=main');
if (approval !== 'approved') throw new Error('canonical data import requires PLANETSCALE_DATA_IMPORT_APPROVED=approved');
if (usageApproval !== 'approved' || !Number.isFinite(usageMaxUsd) || usageMaxUsd < 0) {
  throw new Error('canonical data import requires measured non-negative usage approval');
}
if (!databaseUrl) throw new Error('PLANETSCALE_ADMIN_DATABASE_URL is required');
if (!importPath || !fs.existsSync(importPath)) throw new Error('LYTHAUS_CANONICAL_IMPORT_PATH must reference the protected canonical import');
if (!/^[0-9a-f]{64}$/i.test(expectedHash)) throw new Error('LYTHAUS_CANONICAL_IMPORT_SHA256 is required');
if (!piiHmacKey) throw new Error('PII_HMAC_KEY_V1 is required for migration contact lookups');
const encryptionKey = Buffer.from(piiEncryptionKey, 'base64');
if (encryptionKey.length !== 32) throw new Error('PII_ENCRYPTION_KEY_V1 must be a base64-encoded 32-byte key');
const connection = new URL(databaseUrl);
if (localPg17Test) {
  if (!['127.0.0.1', 'localhost'].includes(connection.hostname)) {
    throw new Error('local PostgreSQL 17 import test is restricted to loopback');
  }
} else if (connection.searchParams.get('sslmode') !== 'verify-full') {
  throw new Error('production import requires sslmode=verify-full');
}

const document = JSON.parse(fs.readFileSync(importPath, 'utf8'));
if (document.formatVersion !== 'lythaus-canonical-import-v1') throw new Error('unsupported canonical import format');
const actualHash = crypto.createHash('sha256').update(canonicalJson(document)).digest('hex');
if (actualHash !== expectedHash.toLowerCase()) throw new Error('canonical import hash mismatch');
const importOrder = [
  'identity.users',
  'identity.contact_emails',
  'social.profiles',
  'privacy.requests',
  'privacy.request_events',
  'privacy.legal_holds',
  'privacy.deletion_tombstones',
  'privacy.subject_data_locations',
];
const allowedColumns = {
  'identity.users': ['id', 'status', 'display_name', 'created_at', 'updated_at', 'deleted_at'],
  'identity.contact_emails': ['user_id', 'email_plaintext', 'source_provider', 'verified_at'],
  'social.profiles': ['user_id', 'bio', 'avatar_object_id', 'public_visibility', 'trust_passport_visibility', 'updated_at'],
  'privacy.requests': ['id', 'subject_id', 'request_type', 'state', 'created_at', 'completed_at'],
  'privacy.request_events': ['id', 'request_id', 'event_type', 'metadata', 'created_at'],
  'privacy.legal_holds': ['id', 'subject_id', 'reason', 'active', 'created_at', 'released_at'],
  'privacy.deletion_tombstones': ['subject_id', 'completed_at', 'evidence_hash'],
  'privacy.subject_data_locations': [
    'subject_id',
    'store_type',
    'resource_reference',
    'entity_type',
    'entity_id',
    'authoritative_or_derived',
    'retention_class',
    'legal_hold_state',
    'deletion_state',
    'last_verified_at',
  ],
};
for (const table of Object.keys(document.tables ?? {})) {
  if (!importOrder.includes(table)) throw new Error(`canonical import contains an unapproved table: ${table}`);
}
const recordsByTable = Object.fromEntries(importOrder.map((table) => [table, document.tables?.[table] ?? []]));
const expectedTotal = Object.values(recordsByTable).reduce((total, records) => total + records.length, 0);
if (expectedTotal === 0) throw new Error('canonical import contains no records');

const quote = (identifier) => `"${identifier.replaceAll('"', '""')}"`;
const encryptEmail = (email) => {
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, nonce);
  const ciphertext = Buffer.concat([cipher.update(email, 'utf8'), cipher.final(), cipher.getAuthTag()]);
  return `${nonce.toString('base64')}.${ciphertext.toString('base64')}`;
};
const emailHmac = (email) => crypto.createHmac('sha256', piiHmacKey).update(email.trim().toLowerCase()).digest('base64');
const client = new Client(localPg17Test
  ? { connectionString: databaseUrl, ssl: false }
  : { connectionString: databaseUrl, ssl: { rejectUnauthorized: true } });
await client.connect();
try {
  const schemaCheck = await client.query(`
    SELECT to_regclass('identity.users') AS users,
           to_regclass('privacy.requests') AS privacy_requests,
           to_regclass('system.schema_migrations') AS migrations
  `);
  if (!schemaCheck.rows[0]?.users || !schemaCheck.rows[0]?.privacy_requests || !schemaCheck.rows[0]?.migrations) {
    throw new Error('canonical schema is not applied to PlanetScale main');
  }
  const baseline = {};
  for (const table of importOrder) {
    const result = await client.query(`SELECT count(*)::bigint AS count FROM ${table}`);
    baseline[table] = Number(result.rows[0]?.count ?? 0);
    if (baseline[table] !== 0) throw new Error(`refusing import because ${table} is not empty`);
  }

  await client.query('BEGIN');
  try {
    for (const table of importOrder) {
      const columns = allowedColumns[table];
      for (const record of recordsByTable[table]) {
        const unknown = Object.keys(record).filter((column) => !columns.includes(column));
        if (unknown.length) throw new Error(`unapproved columns for ${table}: ${unknown.join(',')}`);
        const insertColumns = table === 'identity.contact_emails'
          ? ['user_id', 'email_ciphertext', 'email_lookup_hmac', 'encryption_key_version', 'source_provider', 'verified_at']
          : columns;
        const values = table === 'identity.contact_emails'
          ? [
              record.user_id,
              encryptEmail(record.email_plaintext),
              emailHmac(record.email_plaintext),
              'v1',
              record.source_provider,
              record.verified_at,
            ]
          : columns.map((column) => column === 'metadata' ? JSON.stringify(record[column] ?? {}) : record[column] ?? null);
        const placeholders = insertColumns.map((_, index) => {
          if (table === 'identity.contact_emails' && index === 1) return `convert_to($${index + 1}, 'utf8')`;
          if (table === 'identity.contact_emails' && index === 2) return `decode($${index + 1}, 'base64')`;
          return `$${index + 1}`;
        }).join(', ');
        await client.query(
          `INSERT INTO ${table} (${insertColumns.map(quote).join(', ')}) VALUES (${placeholders})`,
          values,
        );
      }
    }
    const orphanChecks = await client.query(`
      SELECT
        (SELECT count(*)::bigint FROM social.profiles p LEFT JOIN identity.users u ON u.id = p.user_id WHERE u.id IS NULL) AS profile_orphans,
        (SELECT count(*)::bigint FROM privacy.requests r LEFT JOIN identity.users u ON u.id = r.subject_id WHERE u.id IS NULL) AS request_orphans,
        (SELECT count(*)::bigint FROM privacy.request_events e LEFT JOIN privacy.requests r ON r.id = e.request_id WHERE r.id IS NULL) AS event_orphans,
        (SELECT count(*)::bigint FROM privacy.legal_holds h LEFT JOIN identity.users u ON u.id = h.subject_id WHERE u.id IS NULL) AS hold_orphans
    `);
    if (Object.values(orphanChecks.rows[0] ?? {}).some((value) => Number(value) !== 0)) {
      throw new Error('relationship reconciliation found canonical orphans');
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  }

  const imported = {};
  for (const table of importOrder) {
    const result = await client.query(`SELECT count(*)::bigint AS count FROM ${table}`);
    imported[table] = Number(result.rows[0]?.count ?? 0);
    if (imported[table] !== recordsByTable[table].length) {
      throw new Error(`row reconciliation failed for ${table}`);
    }
  }
  const stateCounts = await client.query(`
    SELECT
      (SELECT count(*)::bigint FROM identity.users WHERE status = 'relink_required') AS relink_required,
      (SELECT count(*)::bigint FROM identity.users WHERE status = 'deleted') AS deleted,
      (SELECT count(*)::bigint FROM privacy.requests WHERE state = 'awaiting_review') AS awaiting_review,
      (SELECT count(*)::bigint FROM privacy.legal_holds WHERE active) AS active_holds
  `);
  console.log(JSON.stringify({
    branch,
    canonicalImportSha256: actualHash,
    imported,
    stateCounts: stateCounts.rows[0],
    usageMaximumUsd: usageMaxUsd,
  }, null, 2));
} finally {
  await client.end();
}
