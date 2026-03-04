import { fetch } from 'undici';
import { JWK } from 'jose';

import { getB2COpenIdConfig } from './b2cOpenIdConfig';
import { getAuthConfig, SupportedAlgorithm } from './config';

type JwksResponse = {
  keys: JWK[];
};

type CachedJwks = {
  keys: JWK[];
  expiresAt: number;
};

let cachedJwks: CachedJwks | null = null;

function isCacheValid(cache: CachedJwks | null): cache is CachedJwks {
  return Boolean(cache && cache.expiresAt > Date.now());
}

async function loadJwks(): Promise<JWK[]> {
  const { cacheTtlSeconds } = getAuthConfig();
  const { jwks_uri } = await getB2COpenIdConfig();

  const response = await fetch(jwks_uri, {
    headers: {
      'User-Agent': 'asora-functions-auth/1.0',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS: ${response.status}`);
  }

  const payload = (await response.json()) as JwksResponse;

  if (!payload?.keys || !Array.isArray(payload.keys) || payload.keys.length === 0) {
    throw new Error('JWKS payload missing keys');
  }

  const keys = payload.keys.filter(key => key.kty === 'RSA' && typeof key.kid === 'string');

  if (keys.length === 0) {
    throw new Error('No RSA signing keys available in JWKS');
  }

  cachedJwks = {
    keys,
    expiresAt: Date.now() + cacheTtlSeconds * 1000,
  };

  return keys;
}

async function getCachedKeys(): Promise<JWK[]> {
  if (isCacheValid(cachedJwks)) {
    return cachedJwks.keys;
  }

  return loadJwks();
}

function validateAlgorithm(alg: string | undefined, allowed: SupportedAlgorithm[]): void {
  if (!alg) {
    return;
  }

  if (!allowed.includes(alg as SupportedAlgorithm)) {
    throw new Error(`Disallowed JWT signing algorithm: ${alg}`);
  }
}

export async function getJwkByKid(kid: string, headerAlg?: string): Promise<JWK> {
  if (!kid) {
    throw new Error('JWT header missing kid');
  }

  const { allowedAlgorithms } = getAuthConfig();
  const lookup = async () => (await getCachedKeys()).find(key => key.kid === kid);

  let key = await lookup();
  if (!key) {
    cachedJwks = null;
    key = await lookup();
  }

  if (!key) {
    throw new Error(`Unable to locate signing key for kid ${kid}`);
  }

  validateAlgorithm((headerAlg ?? (typeof key.alg === 'string' ? key.alg : undefined)) as string | undefined, allowedAlgorithms);

  return key;
}

export function resetJwksCache(): void {
  cachedJwks = null;
}
