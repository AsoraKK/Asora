/// Custom OAuth2 Auth Configuration
///
/// Provides JWT verification config for the custom OAuth2 server
/// (tokenService.ts issues HS256 tokens with JWT_SECRET).
///
/// Required env vars: JWT_SECRET
/// Required in production: JWT_ISSUER, JWT_AUDIENCE
/// Optional: AUTH_MAX_SKEW_SECONDS

import assert from 'node:assert';

export type AuthConfig = {
  /** HS256 symmetric secret (shared with tokenService) */
  jwtSecret: Uint8Array;
  /** Expected issuer claim (default: 'asora-auth') */
  expectedIssuer: string;
  /** Expected audience values (optional, skipped if empty) */
  expectedAudiences: string[];
  /** Maximum clock skew tolerance in seconds */
  maxClockSkewSeconds: number;
};

let cachedConfig: AuthConfig | null = null;

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

/** Minimum byte length for JWT_SECRET to ensure sufficient entropy (256-bit key) */
const MIN_JWT_SECRET_BYTES = 32;

function isProductionEnvironment(): boolean {
  const nodeEnv = (process.env.NODE_ENV ?? 'production').trim().toLowerCase();
  const appEnv = (process.env.APP_ENV ?? '').trim().toLowerCase();
  return (
    nodeEnv === 'production' ||
    nodeEnv === 'staging' ||
    appEnv === 'production' ||
    appEnv === 'prod' ||
    appEnv === 'staging' ||
    appEnv === 'mvp'
  );
}

function initialiseConfig(): AuthConfig {
  const secret = process.env.JWT_SECRET?.trim();
  assert(secret, 'Missing required environment variable JWT_SECRET. Configure via Azure Key Vault reference in app settings.');

  const secretBytes = new TextEncoder().encode(secret);
  assert(
    secretBytes.length >= MIN_JWT_SECRET_BYTES,
    `JWT_SECRET must be at least ${MIN_JWT_SECRET_BYTES} bytes (${MIN_JWT_SECRET_BYTES * 8} bits). Current length: ${secretBytes.length} bytes.`
  );

  const expectedIssuer = (process.env.JWT_ISSUER ?? 'asora-auth').trim();

  const audienceRaw = process.env.JWT_AUDIENCE?.trim();
  const expectedAudiences = audienceRaw
    ? audienceRaw.split(',').map(item => item.trim()).filter(Boolean)
    : [];

  if (expectedAudiences.length === 0) {
    assert(
      !isProductionEnvironment(),
      'Missing required environment variable JWT_AUDIENCE in production. Configure an approved public client audience.'
    );
    console.warn('[auth/config] JWT_AUDIENCE is not set: audience claim will NOT be validated outside production.');
  }

  const maxClockSkewSeconds = parsePositiveInteger(process.env.AUTH_MAX_SKEW_SECONDS, 60);

  return {
    jwtSecret: secretBytes,
    expectedIssuer,
    expectedAudiences,
    maxClockSkewSeconds,
  };
}

export function getAuthConfig(): AuthConfig {
  if (!cachedConfig) {
    cachedConfig = initialiseConfig();
  }

  return cachedConfig;
}

export function resetAuthConfigForTesting(): void {
  cachedConfig = null;
}
