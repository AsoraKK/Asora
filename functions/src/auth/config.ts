import assert from 'node:assert';

export type SupportedAlgorithm = 'RS256' | 'RS512';

export type AuthConfig = {
  tenant: string;
  policy: string;
  discoveryUrl: string;
  expectedIssuer: string;
  expectedAudiences: string[];
  allowedAlgorithms: SupportedAlgorithm[];
  cacheTtlSeconds: number;
  maxClockSkewSeconds: number;
  strictIssuerMatch: boolean;
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

function parseAlgorithms(raw: string | undefined): SupportedAlgorithm[] {
  if (!raw) {
    return ['RS256'];
  }

  const allowed = new Set<SupportedAlgorithm>(['RS256', 'RS512']);
  const list = raw
    .split(',')
    .map(item => item.trim().toUpperCase())
    .filter(Boolean) as SupportedAlgorithm[];

  const invalid = list.filter(alg => !allowed.has(alg));
  if (invalid.length > 0) {
    throw new Error(`Unsupported JWT algorithms configured: ${invalid.join(', ')}`);
  }

  const unique = [...new Set(list)];
  if (unique.length === 0) {
    throw new Error('At least one JWT algorithm must be configured in B2C_ALLOWED_ALGS');
  }

  return unique;
}

function buildDiscoveryUrl(tenant: string, policy: string): string {
  return `https://${tenant}.b2clogin.com/${tenant}.onmicrosoft.com/${policy}/v2.0/.well-known/openid-configuration`;
}

function initialiseConfig(): AuthConfig {
  const tenant = process.env.B2C_TENANT?.trim();
  const policy = process.env.B2C_POLICY?.trim();
  const expectedIssuer = process.env.B2C_EXPECTED_ISSUER?.trim();
  const expectedAudience = process.env.B2C_EXPECTED_AUDIENCE?.trim();

  assert(tenant, 'Missing required environment variable B2C_TENANT');
  assert(policy, 'Missing required environment variable B2C_POLICY');
  assert(
    expectedIssuer,
    'Missing required environment variable B2C_EXPECTED_ISSUER (copy exact issuer from discovery document)',
  );
  assert(expectedAudience, 'Missing required environment variable B2C_EXPECTED_AUDIENCE');

  const expectedAudiences = expectedAudience
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  assert(
    expectedAudiences.length > 0,
    'B2C_EXPECTED_AUDIENCE must include at least one audience value separated by commas if multiple',
  );

  const cacheTtlSeconds = parsePositiveInteger(process.env.AUTH_CACHE_TTL_SECONDS, 6 * 60 * 60);
  const maxClockSkewSeconds = parsePositiveInteger(process.env.AUTH_MAX_SKEW_SECONDS, 120);
  const allowedAlgorithms = parseAlgorithms(process.env.B2C_ALLOWED_ALGS);
  const strictIssuerMatch = (process.env.B2C_STRICT_ISSUER_MATCH ?? 'true').toLowerCase() !== 'false';

  return {
    tenant,
    policy,
    discoveryUrl: buildDiscoveryUrl(tenant, policy),
    expectedIssuer: expectedIssuer!,
    expectedAudiences,
    allowedAlgorithms,
    cacheTtlSeconds,
    maxClockSkewSeconds,
    strictIssuerMatch,
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
