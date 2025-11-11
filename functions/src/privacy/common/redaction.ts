import { createHash } from 'crypto';

const DEFAULT_HASH_ALG = 'sha256';
const DEFAULT_SALT = 'asora-dsr-redaction';

const ipIndicators = ['ip', 'ipAddress', 'clientIp', 'remoteIp', 'sourceIp', 'connectionIp'];
const sensitivePatterns = [/secret/i, /token/i, /vendor/i, /third[\s_]?party/i, /credential/i, /password/i];

const HASH_ALGORITHM = (process.env.DSR_IP_HASH_ALG ?? DEFAULT_HASH_ALG).toLowerCase();
const HASH_SALT = process.env.DSR_IP_HASH_SALT ?? DEFAULT_SALT;

function shouldHashIp(key: string): boolean {
  return ipIndicators.some(indicator => key.toLowerCase().includes(indicator.toLowerCase()));
}

function shouldRemoveField(key: string): boolean {
  return sensitivePatterns.some(pattern => pattern.test(key));
}

export function hashIpValue(value: unknown): string | unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const hash = createHash(HASH_ALGORITHM);
  hash.update(`${value}:${HASH_SALT}`);
  return hash.digest('hex');
}

export function redactRecord<T extends Record<string, unknown>>(record: T): T {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null) {
      sanitized[key] = value;
      continue;
    }

    if (shouldRemoveField(key)) {
      continue;
    }

    if (shouldHashIp(key)) {
      sanitized[key] = hashIpValue(value);
      continue;
    }

    if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'object' && item !== null ? redactRecord(item as Record<string, unknown>) : item,
      );
      continue;
    }

    if (typeof value === 'object') {
      sanitized[key] = redactRecord(value as Record<string, unknown>);
      continue;
    }

    sanitized[key] = value;
  }

  return sanitized as T;
}
