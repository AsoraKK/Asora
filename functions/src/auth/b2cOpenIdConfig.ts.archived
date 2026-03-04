import { setTimeout as delay } from 'node:timers/promises';

import { fetch } from 'undici';

import { getAuthConfig } from './config';

type DiscoveryDocument = {
  issuer: string;
  jwks_uri: string;
  token_endpoint: string;
  end_session_endpoint?: string;
};

type CachedDiscovery = {
  value: DiscoveryDocument;
  expiresAt: number;
};

const MAX_RETRIES = 3;

let cachedDiscovery: CachedDiscovery | null = null;

function isCacheValid(cache: CachedDiscovery | null): cache is CachedDiscovery {
  return Boolean(cache && cache.expiresAt > Date.now());
}

async function fetchDiscoveryDocument(url: string): Promise<DiscoveryDocument> {
  let attempt = 0;
  let lastError: unknown;

  while (attempt < MAX_RETRIES) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'asora-functions-auth/1.0',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status >= 500 && response.status < 600) {
          throw new Error(`Transient discovery error: ${response.status}`);
        }

        throw new Error(`Failed to load discovery document: ${response.status}`);
      }

      const body = (await response.json()) as DiscoveryDocument;
      if (!body?.issuer || !body?.jwks_uri || !body?.token_endpoint) {
        throw new Error('Discovery document missing required fields');
      }

      return body;
    } catch (error) {
      lastError = error;
      attempt += 1;
      if (attempt >= MAX_RETRIES) {
        break;
      }

      const backoff = 100 * 2 ** (attempt - 1);
      await delay(backoff);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Unknown discovery error');
}

export async function getB2COpenIdConfig(): Promise<DiscoveryDocument> {
  const { discoveryUrl, cacheTtlSeconds, expectedIssuer, strictIssuerMatch } = getAuthConfig();

  if (isCacheValid(cachedDiscovery)) {
    return cachedDiscovery.value;
  }

  const document = await fetchDiscoveryDocument(discoveryUrl);

  if (strictIssuerMatch && document.issuer !== expectedIssuer) {
    throw new Error(
      `Issuer mismatch for policy discovery. Expected "${expectedIssuer}" but received "${document.issuer}"`,
    );
  }

  cachedDiscovery = {
    value: document,
    expiresAt: Date.now() + cacheTtlSeconds * 1000,
  };

  return document;
}

export function resetOpenIdConfigCache(): void {
  cachedDiscovery = null;
}
