import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  canonicalDatasetHash,
  canonicalJson,
  deterministicUuidv7,
  sourceIdentifier,
} from './canonical-hash.mjs';
import {
  CLASSIFICATIONS,
  classifyLegalHold,
  classifyPrivacyRequest,
  classifyRecord,
  isExplicitTestUser,
} from './source-disposition.mjs';

const arg = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const sourceDir = arg('--source-dir');
const outputPath = arg('--output');
const evidencePath = arg('--evidence');
if (!sourceDir || !outputPath || !evidencePath) {
  throw new Error('prepare requires --source-dir, --output, and --evidence');
}
const evidenceKeyHex = process.env.MIGRATION_EVIDENCE_KEY ?? '';
if (!/^[0-9a-f]{64}$/i.test(evidenceKeyHex)) {
  throw new Error('MIGRATION_EVIDENCE_KEY must be a 32-byte hex key');
}
const repoRoot = path.resolve(process.cwd()) + path.sep;
for (const target of [outputPath, evidencePath]) {
  if (path.resolve(target).startsWith(repoRoot)) {
    throw new Error('canonical output and evidence must be outside the Git repository');
  }
}

const cosmosDir = path.join(sourceDir, 'cosmos');
const sourceManifest = JSON.parse(fs.readFileSync(path.join(sourceDir, 'manifest.json'), 'utf8'));
const dsrManifest = JSON.parse(fs.readFileSync(path.join(sourceDir, 'blobs', 'dsr-exports-manifest.json'), 'utf8'));
const readContainer = (name) => JSON.parse(fs.readFileSync(path.join(cosmosDir, `${name}.json`), 'utf8'));
const containers = Object.fromEntries(sourceManifest.cosmos.map(({ container }) => [container, readContainer(container)]));
const validUuid = (value) => typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const hmac = (value) => crypto.createHmac('sha256', Buffer.from(evidenceKeyHex, 'hex')).update(String(value)).digest('hex');
const toIso = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = typeof value === 'number' ? (value > 1e12 ? value : value * 1000) : value;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.valueOf())) throw new Error('invalid source timestamp');
  return parsed.toISOString();
};
const stableId = (value, createdAt, namespace) => {
  if (validUuid(value)) return value;
  return deterministicUuidv7(`${namespace}:${value}`, createdAt, evidenceKeyHex);
};
const sourceIdFor = (record) => sourceIdentifier(record);
const tables = {
  'identity.users': [],
  'identity.contact_emails': [],
  'social.profiles': [],
  'privacy.requests': [],
  'privacy.request_events': [],
  'privacy.legal_holds': [],
  'privacy.deletion_tombstones': [],
  'privacy.subject_data_locations': [],
};
const tableKeys = new Map(Object.keys(tables).map((table) => [table, new Set()]));
const addRecord = (table, key, record) => {
  if (tableKeys.get(table).has(key)) return;
  tableKeys.get(table).add(key);
  tables[table].push(record);
};
const usersById = new Map();
const addUser = ({ id, status = 'relink_required', displayName = '', createdAt, updatedAt = createdAt }) => {
  if (!validUuid(id)) throw new Error('canonical identity requires a UUID source or mapped UUID');
  const existing = usersById.get(id);
  const next = {
    id,
    status: existing?.status === 'deleted' || status === 'deleted' ? 'deleted' : status,
    display_name: String(existing?.display_name || displayName || '').slice(0, 160),
    created_at: existing?.created_at && existing.created_at < createdAt ? existing.created_at : createdAt,
    updated_at: existing?.updated_at && existing.updated_at > updatedAt ? existing.updated_at : updatedAt,
    deleted_at: status === 'deleted' ? updatedAt : existing?.deleted_at ?? null,
  };
  usersById.set(id, next);
};

const explicitTestUserIds = new Set(containers.users.filter(isExplicitTestUser).map((record) => record.id));
const testPostIds = new Set(
  containers.posts
    .filter((record) => classifyRecord('posts', record).classification === CLASSIFICATIONS.DISCARD)
    .flatMap((record) => [record.id, record.postId])
    .filter(Boolean),
);
const migratedHoldSubjects = new Set(
  containers.legal_holds
    .filter((record) => classifyLegalHold(record).classification === CLASSIFICATIONS.MIGRATE)
    .map((record) => record.scopeId),
);
const disposition = [];
const dispositionCounts = {};
const recordDisposition = (container, record, result) => {
  dispositionCounts[container] ??= {};
  dispositionCounts[container][result.classification] = (dispositionCounts[container][result.classification] ?? 0) + 1;
  disposition.push({
    container,
    sourceIdentifierHmac: hmac(sourceIdFor(record)),
    classification: result.classification,
    reason: result.reason,
  });
};

for (const [container, records] of Object.entries(containers)) {
  for (const record of records) {
    const result = classifyRecord(container, record, {
      explicitTestUserIds,
      testPostIds,
      hasMigratedActiveHold: container === 'privacy_requests' && migratedHoldSubjects.has(record.userId),
    });
    recordDisposition(container, record, result);
  }
}

for (const record of containers.users) {
  const result = classifyRecord('users', record);
  if (result.classification !== CLASSIFICATIONS.MIGRATE) continue;
  const createdAt = toIso(record.createdAt ?? record._ts, new Date(0).toISOString());
  const userId = stableId(record.id, createdAt, 'user');
  addUser({
    id: userId,
    displayName: record.displayName,
    createdAt,
    updatedAt: toIso(record.updatedAt ?? record.lastLoginAt, createdAt),
  });
  if (typeof record.email === 'string' && record.email.trim()) {
    addRecord('identity.contact_emails', userId, {
      user_id: userId,
      email_plaintext: record.email.trim().toLowerCase(),
      source_provider: 'migration',
      verified_at: null,
    });
  }
}

for (const record of containers.profiles) {
  const result = classifyRecord('profiles', record, { explicitTestUserIds });
  if (result.classification !== CLASSIFICATIONS.MIGRATE) continue;
  const updatedAt = toIso(record.updatedAt ?? record._ts, new Date(0).toISOString());
  const userId = stableId(record.userId, updatedAt, 'profile-user');
  addUser({ id: userId, displayName: record.displayName, createdAt: updatedAt, updatedAt });
  addRecord('social.profiles', userId, {
    user_id: userId,
    bio: String(record.bio ?? '').slice(0, 2000),
    avatar_object_id: null,
    public_visibility: true,
    trust_passport_visibility: 'public_minimal',
    updated_at: updatedAt,
  });
}

const migratedRequests = [];
for (const record of containers.privacy_requests) {
  const result = classifyPrivacyRequest(record, { hasMigratedActiveHold: migratedHoldSubjects.has(record.userId) });
  if (result.classification !== CLASSIFICATIONS.MIGRATE) continue;
  const createdAt = toIso(record.requestedAt ?? record._ts, new Date(0).toISOString());
  const requestId = stableId(record.id, createdAt, 'privacy-request');
  const subjectId = stableId(record.userId, createdAt, 'privacy-subject');
  const terminal = ['succeeded', 'failed', 'canceled'].includes(record.status);
  addUser({
    id: subjectId,
    status: record.type === 'delete' && record.status === 'succeeded' ? 'deleted' : 'relink_required',
    createdAt,
    updatedAt: toIso(record.completedAt, createdAt),
  });
  addRecord('privacy.requests', requestId, {
    id: requestId,
    subject_id: subjectId,
    request_type: record.type,
    state: record.status,
    created_at: createdAt,
    completed_at: terminal ? toIso(record.completedAt, createdAt) : null,
  });
  migratedRequests.push({ record, requestId, subjectId });
  for (const [index, event] of (Array.isArray(record.audit) ? record.audit : []).entries()) {
    const eventAt = toIso(event.at, createdAt);
    const eventId = deterministicUuidv7(`${requestId}:event:${index}:${event.event ?? 'legacy'}`, eventAt, evidenceKeyHex);
    addRecord('privacy.request_events', eventId, {
      id: eventId,
      request_id: requestId,
      event_type: String(event.event ?? 'legacy_imported').slice(0, 120),
      metadata: {
        imported_from: 'azure-cosmos',
        source_event_hmac: hmac(`${requestId}:${index}`),
      },
      created_at: eventAt,
    });
  }
  if (record.type === 'delete' && record.status === 'succeeded') {
    addRecord('privacy.deletion_tombstones', subjectId, {
      subject_id: subjectId,
      completed_at: toIso(record.completedAt, createdAt),
      evidence_hash: canonicalDatasetHash([record]),
    });
  }
}

for (const record of containers.legal_holds) {
  const result = classifyLegalHold(record);
  if (result.classification !== CLASSIFICATIONS.MIGRATE) continue;
  const createdAt = toIso(record.startedAt ?? record._ts, new Date(0).toISOString());
  const holdId = stableId(record.id, createdAt, 'legal-hold');
  const subjectId = stableId(record.scopeId, createdAt, 'legal-subject');
  addUser({ id: subjectId, createdAt, updatedAt: createdAt });
  addRecord('privacy.legal_holds', holdId, {
    id: holdId,
    subject_id: subjectId,
    reason: String(record.reason ?? 'legacy active hold').slice(0, 2000),
    active: true,
    created_at: createdAt,
    released_at: null,
  });
}

for (const record of usersById.values()) {
  addRecord('identity.users', record.id, record);
}
const locationRows = [];
const addLocation = (subjectId, table, entityType, entityId, retentionClass, legalHoldState = 'none') => {
  const key = `${subjectId}:${table}:${entityType}:${entityId ?? 'aggregate'}`;
  if (locationRows.some((row) => row.key === key)) return;
  locationRows.push({
    key,
    record: {
      subject_id: subjectId,
      store_type: 'planetscale',
      resource_reference: table,
      entity_type: entityType,
      entity_id: entityId,
      authoritative_or_derived: 'authoritative',
      retention_class: retentionClass,
      legal_hold_state: legalHoldState,
      deletion_state: table === 'privacy.deletion_tombstones' ? 'deleted' : 'present',
      last_verified_at: null,
    },
  });
};
for (const user of tables['identity.users']) addLocation(user.id, 'identity.users', 'user', user.id, 'account');
for (const email of tables['identity.contact_emails']) addLocation(email.user_id, 'identity.contact_emails', 'contact_email', email.user_id, 'account');
for (const profile of tables['social.profiles']) addLocation(profile.user_id, 'social.profiles', 'profile', profile.user_id, 'account');
for (const request of tables['privacy.requests']) addLocation(request.subject_id, 'privacy.requests', 'privacy_request', request.id, 'privacy');
for (const hold of tables['privacy.legal_holds']) addLocation(hold.subject_id, 'privacy.legal_holds', 'legal_hold', hold.id, 'legal', 'active');
for (const tombstone of tables['privacy.deletion_tombstones']) addLocation(tombstone.subject_id, 'privacy.deletion_tombstones', 'deletion_tombstone', tombstone.subject_id, 'legal');
for (const { key, record } of locationRows) addRecord('privacy.subject_data_locations', key, record);

const dsrByName = new Map(dsrManifest.map((entry) => [entry.sourceName, entry]));
const dsrObjects = migratedRequests.flatMap(({ record, requestId, subjectId }) => {
  if (!record.exportBlobPath) return [];
  const sourceObject = dsrByName.get(record.exportBlobPath);
  if (!sourceObject) throw new Error('migrated export request is missing its DSR package');
  return [{
    request_id: requestId,
    subject_id: subjectId,
    source_file: sourceObject.sourceNameSha256,
    source_package_sha256: sourceObject.contentSha256,
    source_bytes: sourceObject.bytes,
    destination_bucket: 'lythaus-private-exports-dev',
    destination_key: `protected-migration/dsr/${requestId}.zip.gpg`,
  }];
});

for (const records of Object.values(tables)) {
  records.sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
}
dsrObjects.sort((left, right) => left.request_id.localeCompare(right.request_id));
const canonicalImport = {
  formatVersion: 'lythaus-canonical-import-v1',
  source: 'azure-cosmos-lythaus',
  tables,
  dsrObjects,
};
const transformedSha256 = crypto.createHash('sha256').update(canonicalJson(canonicalImport)).digest('hex');
fs.writeFileSync(outputPath, JSON.stringify(canonicalImport, null, 2), { encoding: 'utf8', mode: 0o600 });

const identityMapping = [...usersById.keys()].map((id) => ({
  sourceIdentifier: id,
  destinationIdentifier: id,
}));
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(evidenceKeyHex, 'hex'), iv);
const ciphertext = Buffer.concat([cipher.update(JSON.stringify(identityMapping), 'utf8'), cipher.final()]);
const encryptedIdentityMapping = {
  algorithm: 'aes-256-gcm',
  iv: iv.toString('base64'),
  tag: cipher.getAuthTag().toString('base64'),
  ciphertext: ciphertext.toString('base64'),
};
const containerEvidence = sourceManifest.cosmos.map((entry) => {
  const counts = dispositionCounts[entry.container] ?? {};
  const classifications = Object.keys(counts);
  return {
    container: entry.container,
    sourceCount: entry.recordCount,
    sourceSha256: entry.sourceSha256,
    schemaVersions: entry.schemaVersions,
    lastWriteAt: entry.lastWriteAt,
    partitionKey: entry.partitionKey,
    classification: entry.recordCount === 0
      ? CLASSIFICATIONS.EVIDENCE
      : classifications.length === 1 ? classifications[0] : 'MIXED — RECORD LEVEL',
    recordDispositionCounts: counts,
  };
});
const evidence = {
  formatVersion: 'lythaus-migration-evidence-v1',
  canonicalization: 'stable-key-ordering; stable source-identifier ordering; UTF-8; null/missing/empty distinct',
  hashAlgorithm: 'sha256',
  sourceManifestSha256: crypto.createHash('sha256').update(canonicalJson(sourceManifest)).digest('hex'),
  transformedSha256,
  sourceRecords: sourceManifest.cosmos.reduce((total, entry) => total + entry.recordCount, 0),
  importedRecordsByTable: Object.fromEntries(Object.entries(tables).map(([table, records]) => [table, records.length])),
  dsrPackagesSelected: dsrObjects.length,
  dsrBytesSelected: dsrObjects.reduce((total, object) => total + object.source_bytes, 0),
  containers: containerEvidence,
  recordDisposition: disposition.sort((left, right) => left.sourceIdentifierHmac.localeCompare(right.sourceIdentifierHmac)),
  encryptedIdentityMapping,
  generatedAt: new Date().toISOString(),
};
fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2), { encoding: 'utf8', mode: 0o600 });
console.log(canonicalJson({
  sourceRecords: evidence.sourceRecords,
  importedRecordsByTable: evidence.importedRecordsByTable,
  dsrPackagesSelected: evidence.dsrPackagesSelected,
  dsrBytesSelected: evidence.dsrBytesSelected,
  transformedSha256,
}));
