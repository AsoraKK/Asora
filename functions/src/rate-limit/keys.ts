import type { HttpRequest } from '@azure/functions';
import { createHmac } from 'crypto';

const HASH_ALGORITHM = 'sha256';
const HASH_SALT_ENV = 'EMAIL_HASH_SALT';
const HASH_FALLBACK = 'asora-dev-salt';

let cachedSalt: string | null = null;

function getHashSalt(): string {
  if (cachedSalt) {
    return cachedSalt;
  }

  const saltFromEnv = process.env[HASH_SALT_ENV];

  if (!saltFromEnv) {
    if (process.env.NODE_ENV !== 'production') {
      cachedSalt = HASH_FALLBACK;
      return cachedSalt;
    }
    throw new Error('EMAIL_HASH_SALT is required for hashing identifiers');
  }

  cachedSalt = saltFromEnv;
  return cachedSalt;
}

function hashValue(value: string): string {
  const hmac = createHmac(HASH_ALGORITHM, getHashSalt());
  hmac.update(value);
  return hmac.digest('hex');
}

export function getClientIp(req: HttpRequest): string | null {
  const headerCandidates = [
    'cf-connecting-ip',
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'x-azure-clientip',
  ];

  for (const header of headerCandidates) {
    const raw = req.headers.get(header);
    if (!raw) {
      continue;
    }

    if (header === 'x-forwarded-for') {
      const first = raw.split(',')[0]?.trim();
      if (first) {
        return first;
      }
    } else {
      return raw.trim();
    }
  }

  return null;
}

function normalizeIp(ip: string): string {
  return ip.trim().toLowerCase();
}

export function hashIp(ip: string): string {
  return hashValue(normalizeIp(ip));
}

export function buildIpKey(ip: string): string {
  return `ip:${hashIp(ip)}`;
}

export function buildIpKeyFromHash(ipHash: string): string {
  return `ip:${ipHash}`;
}

export function buildUserKey(userId: string | null | undefined): string | null {
  if (!userId) {
    return null;
  }
  return `user:${userId}`;
}

export function buildRouteKey(routeId: string): string {
  return `route:${routeId}`;
}

export function buildAuthFailureIpKey(ipHash: string): string {
  return `authfail:${ipHash}`;
}

export function buildAuthFailureUserKey(userId: string): string {
  return `authfail_user:${userId}`;
}

export function getHashedIpFromRequest(req: HttpRequest): string | null {
  const ip = getClientIp(req);
  if (!ip) {
    return null;
  }
  return hashIp(ip);
}
