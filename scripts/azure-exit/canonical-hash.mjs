import crypto from 'node:crypto';

function canonicalValue(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('canonical JSON does not support non-finite numbers');
    return Object.is(value, -0) ? 0 : value;
  }
  if (Array.isArray(value)) return value.map((item) => item === undefined ? null : canonicalValue(item));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => [key, canonicalValue(value[key])])
    );
  }
  throw new Error(`canonical JSON does not support ${typeof value}`);
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

export function sourceIdentifier(record) {
  for (const key of ['id', 'userId', 'postId', 'commentId', 'requestId', 'appealId']) {
    const value = record?.[key];
    if (typeof value === 'string' && value.trim() !== '') return value;
  }
  return crypto.createHash('sha256').update(canonicalJson(record), 'utf8').digest('hex');
}

export function canonicalDataset(records, identifier = sourceIdentifier) {
  return [...records]
    .sort((left, right) => {
      const leftId = `${identifier(left)}\u0000${String(left?._partitionKey ?? left?.partitionKey ?? '')}`;
      const rightId = `${identifier(right)}\u0000${String(right?._partitionKey ?? right?.partitionKey ?? '')}`;
      return Buffer.compare(Buffer.from(leftId, 'utf8'), Buffer.from(rightId, 'utf8'));
    })
    .map((record) => canonicalJson(record))
    .join('\n') + (records.length ? '\n' : '');
}

export function sha256Utf8(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

export function canonicalDatasetHash(records, identifier = sourceIdentifier) {
  return sha256Utf8(canonicalDataset(records, identifier));
}

export function deterministicUuidv7(sourceId, timestamp, evidenceKeyHex) {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.valueOf())) throw new Error(`invalid UUIDv7 timestamp: ${timestamp}`);
  const bytes = crypto.createHmac('sha256', Buffer.from(evidenceKeyHex, 'hex'))
    .update(sourceId, 'utf8')
    .digest()
    .subarray(0, 16);
  const milliseconds = BigInt(parsed.valueOf());
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = Number(milliseconds >> BigInt((5 - index) * 8)) & 0xff;
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
