import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {
  canonicalDataset,
  canonicalDatasetHash,
  canonicalJson,
  deterministicUuidv7,
  sourceIdentifier,
} from './canonical-hash.mjs';

const arg = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const inputPath = arg('--input');
const outputPath = arg('--output');
const evidencePath = arg('--evidence');
const source = arg('--source');
if (!inputPath || !outputPath || !evidencePath || !source) throw new Error('transform requires --source, --input, --output, and --evidence');
if (!fs.existsSync(inputPath)) throw new Error(`input does not exist: ${inputPath}`);
const evidenceKeyHex = process.env.MIGRATION_EVIDENCE_KEY ?? '';
if (!/^[0-9a-f]{64}$/i.test(evidenceKeyHex)) throw new Error('MIGRATION_EVIDENCE_KEY must be a 32-byte hex key for encrypted identity evidence');
const repoRoot = path.resolve(process.cwd()) + path.sep;
for (const target of [outputPath, evidencePath]) {
  if (path.resolve(target).startsWith(repoRoot)) throw new Error('canonical output and evidence must be outside the Git repository');
}

const mappingFile = new URL('../../infrastructure/azure-exit/migration-mappings.json', import.meta.url);
const mappings = JSON.parse(fs.readFileSync(mappingFile, 'utf8')).mappings;
const mapping = mappings.find((candidate) => candidate.source === source);
if (!mapping) throw new Error(`no explicit mapping exists for source: ${source}`);
if (/BLOCKED|PRESERVE AS EVIDENCE/i.test(mapping.classification)) throw new Error(`source is not importable until authority/access review: ${source}`);

const validUuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const first = (document, keys) => keys.map((key) => document[key]).find((value) => value !== undefined && value !== null);
const idFor = (document, createdAt) => {
  const sourceId = first(document, ['id', 'userId', 'postId', 'commentId', 'requestId', 'appealId']);
  if (typeof sourceId !== 'string' || sourceId.trim() === '') throw new Error('record has no stable source identifier');
  return {
    sourceId,
    id: validUuid(sourceId)
      ? sourceId
      : deterministicUuidv7(sourceId, createdAt, evidenceKeyHex),
  };
};
const timestamp = (document, keys, fallback = new Date().toISOString()) => {
  const value = first(document, keys);
  if (value === undefined) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) throw new Error(`invalid timestamp: ${value}`);
  return parsed.toISOString();
};
const mode = (document) => {
  const value = first(document, ['declaredCreationMode', 'declared_creation_mode', 'creationMode']);
  if (value === 'human' || value === 'human-authored') return 'human';
  if (value === 'ai_assisted' || value === 'ai-assisted') return 'ai_assisted';
  if (value === 'ai_generated' || value === 'ai-generated') return 'ai_generated';
  throw new Error('content declaration is missing or invalid');
};
const uuidReference = (value, label) => {
  if (!validUuid(value)) throw new Error(`${label} requires a resolved canonical UUID; identity mapping required before import`);
  return value;
};

function transformDocument(document) {
  const createdAt = timestamp(document, ['createdAt', 'created_at', '_ts']);
  const { sourceId, id } = idFor(document, createdAt);
  if (source === 'Cosmos asora/users') {
    const status = first(document, ['status', 'accountStatus']) ?? 'active';
    if (!['active', 'suspended', 'deleted', 'locked'].includes(status)) throw new Error(`invalid account status: ${status}`);
    return { destinationTable: 'identity.users', sourceId, generatedId: id !== sourceId, record: { id, status, display_name: String(first(document, ['displayName', 'display_name', 'name']) ?? ''), created_at: createdAt, updated_at: timestamp(document, ['updatedAt', 'updated_at'], createdAt) } };
  }
  if (source === 'Cosmos asora/comments') {
    const authorId = first(document, ['authorId', 'author_id', 'userId']);
    const postId = first(document, ['postId', 'post_id']);
    const body = first(document, ['body', 'text', 'content']);
    if (!authorId || !postId || typeof body !== 'string' || body.trim() === '') throw new Error('comment requires author, post, and body');
    const parentId = first(document, ['parentId', 'parent_id']);
    return { destinationTable: 'content.comments', sourceId, generatedId: id !== sourceId, record: { id, author_id: uuidReference(authorId, 'comment author'), post_id: uuidReference(postId, 'comment post'), parent_id: parentId === undefined || parentId === null ? null : uuidReference(parentId, 'comment parent'), body, moderation_state: first(document, ['moderationState', 'moderation_state']) ?? 'under_review', created_at: createdAt } };
  }
  if (source === 'Cosmos asora/likes') {
    const userId = first(document, ['userId', 'user_id']);
    const postId = first(document, ['postId', 'post_id']);
    if (!userId || !postId) throw new Error('like requires user and post');
    return { destinationTable: 'social.reactions', sourceId, generatedId: false, record: { user_id: uuidReference(userId, 'like user'), post_id: uuidReference(postId, 'like post'), reaction_type: 'like', created_at: createdAt } };
  }
  throw new Error(`explicit field transformer is not implemented for ${source}; classify it before import`);
}

const lines = fs.readFileSync(inputPath, 'utf8').split(/\r?\n/).filter(Boolean);
const parsedSource = lines.map((line) => JSON.parse(line));
const sourceSha256 = canonicalDatasetHash(parsedSource);
const output = [];
const rejects = [];
const seen = new Set();
const idMappings = [];
let duplicateCount = 0;
for (const [index, document] of [...parsedSource].sort((left, right) => sourceIdentifier(left).localeCompare(sourceIdentifier(right))).entries()) {
  try {
    const transformed = transformDocument(document);
    const key = `${transformed.destinationTable}:${transformed.record.id ?? `${transformed.record.user_id}:${transformed.record.post_id}`}`;
    if (seen.has(key)) {
      duplicateCount += 1;
      throw new Error(`duplicate canonical key: ${key}`);
    }
    seen.add(key);
    idMappings.push({ sourceId: transformed.sourceId, destinationId: transformed.record.id ?? null, destinationTable: transformed.destinationTable });
    const sourceIdentifierHmac = crypto.createHmac('sha256', Buffer.from(evidenceKeyHex, 'hex')).update(transformed.sourceId).digest('hex');
    output.push({ sourceSystem: 'azure-cosmos', source, sourceIdentifierHmac, destinationTable: transformed.destinationTable, record: transformed.record });
  } catch (error) {
    rejects.push({ line: index + 1, reason: error instanceof Error ? error.message : 'record_rejected' });
  }
}
const canonicalOutput = canonicalDataset(output, (record) => record.sourceIdentifierHmac);
fs.writeFileSync(outputPath, canonicalOutput, { encoding: 'utf8', mode: 0o600 });
const digest = canonicalDatasetHash(output, (record) => record.sourceIdentifierHmac);
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(evidenceKeyHex, 'hex'), iv);
const ciphertext = Buffer.concat([cipher.update(JSON.stringify(idMappings), 'utf8'), cipher.final()]);
const encryptedIdentityMapping = { algorithm: 'aes-256-gcm', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') };
fs.writeFileSync(evidencePath, JSON.stringify({
  source,
  destination: mapping.destination,
  sourceClassification: mapping.classification,
  canonicalization: 'lythaus-canonical-json-v1',
  hashAlgorithm: 'sha256',
  exportedRows: lines.length,
  transformedRows: output.length,
  rejectedRows: rejects.length,
  duplicateCount,
  rejects,
  encryptedIdentityMapping,
  rawSourceSha256: sourceSha256,
  transformedSha256: digest,
  generatedAt: new Date().toISOString(),
}, null, 2), { encoding: 'utf8', mode: 0o600 });
if (rejects.length) process.exitCode = 2;
console.log(canonicalJson({ source, transformedRows: output.length, rejectedRows: rejects.length, rawSourceSha256: sourceSha256, transformedSha256: digest }));

export { transformDocument };
