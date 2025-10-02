import { HttpRequest, InvocationContext } from '@azure/functions';
import { createRemoteJWKSet, decodeJwt, errors as joseErrors, jwtVerify } from 'jose';

/**
 * ASORA AUTHENTICATION UTILITIES
 *
 * 🎯 Purpose: JWT token verification and user extraction backed by Microsoft Entra External ID
 * 🔐 Security: Validates tokens via OpenID Connect metadata + JWKS with caching and tenant/audience enforcement
 */

export class HttpError extends Error {
  constructor(public status: number, public body: any) {
    super(typeof body === 'string' ? body : JSON.stringify(body));
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

export function json(status: number, body: any) {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
}

export type TokenVerifier = (token: string) => Promise<JWTPayload>;

export type JWTPayload = {
  sub: string;
  email?: string;
  name?: string;
  roles?: string[];
  aud: string | string[];
  iss: string;
  iat?: number;
  exp?: number;
  tid?: string;
  oid?: string;
  preferred_username?: string;
  [claim: string]: unknown;
};

type OpenIdConfiguration = {
  issuer: string;
  jwks_uri: string;
};

const OPENID_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
let configuredVerifier: TokenVerifier | null = null;
let cachedOpenIdConfig: { value: OpenIdConfiguration; fetchedAt: number } | null = null;
let cachedJwkSet: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedJwksUri: string | null = null;

export function configureTokenVerifier(verifier?: TokenVerifier) {
  configuredVerifier = verifier ?? null;
  cachedOpenIdConfig = null;
  cachedJwkSet = null;
  cachedJwksUri = null;
}

function getTenantIds(): string[] {
  const tenants = (process.env.AUTH_ALLOWED_TENANT_IDS ?? process.env.AUTH_TENANT_ID ?? process.env.AZURE_TENANT_ID ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  if (!tenants.length) {
    throw new Error('Missing AUTH_TENANT_ID or AUTH_ALLOWED_TENANT_IDS configuration.');
  }
  return tenants;
}

function getAudienceList(): string[] {
  const rawAudiences = process.env.AUTH_ALLOWED_AUDIENCES
    ?? process.env.AUTH_CLIENT_ID
    ?? process.env.AUTH_MICROSOFT_CLIENT_ID
    ?? '';

  const audiences = rawAudiences
    .split(',')
    .map((aud) => aud.trim())
    .filter(Boolean);

  if (!audiences.length) {
    throw new Error('Missing AUTH_ALLOWED_AUDIENCES or AUTH_CLIENT_ID configuration.');
  }

  const expanded = new Set<string>();
  for (const aud of audiences) {
    expanded.add(aud);
    if (!aud.startsWith('api://')) {
      expanded.add(`api://${aud}`);
    }
  }
  return Array.from(expanded);
}

function resolveAuthorityHost(): string {
  return process.env.AUTH_AUTHORITY_HOST?.trim() || 'https://login.microsoftonline.com';
}

function resolveOpenIdConfigurationUrl(): string {
  if (process.env.AUTH_OPENID_CONFIGURATION_URL) {
    return process.env.AUTH_OPENID_CONFIGURATION_URL.trim();
  }

  const tenantId = getTenantIds()[0];
  const domain = process.env.AUTH_MICROSOFT_DOMAIN?.trim();
  const authorityHost = resolveAuthorityHost();

  if (domain && authorityHost.includes('b2clogin.com')) {
    // B2C style authority host (e.g., https://contoso.b2clogin.com)
    return `${authorityHost}/${domain}/v2.0/.well-known/openid-configuration`;
  }

  return `${authorityHost}/${tenantId}/v2.0/.well-known/openid-configuration`;
}

async function getOpenIdConfiguration(): Promise<OpenIdConfiguration> {
  const now = Date.now();
  if (cachedOpenIdConfig && (now - cachedOpenIdConfig.fetchedAt) < OPENID_CACHE_TTL_MS) {
    return cachedOpenIdConfig.value;
  }

  const url = resolveOpenIdConfigurationUrl();
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download OpenID configuration from ${url}: ${response.status}`);
  }
  const data = await response.json() as OpenIdConfiguration;

  if (!data.issuer || !data.jwks_uri) {
    throw new Error('OpenID configuration missing required issuer/jwks_uri fields.');
  }

  cachedOpenIdConfig = { value: data, fetchedAt: now };
  return data;
}

async function getRemoteJwkSet(): Promise<ReturnType<typeof createRemoteJWKSet>> {
  const { jwks_uri } = await getOpenIdConfiguration();
  if (!cachedJwkSet || cachedJwksUri !== jwks_uri) {
    cachedJwksUri = jwks_uri;
    cachedJwkSet = createRemoteJWKSet(new URL(jwks_uri));
  }
  return cachedJwkSet;
}

function normalizePayload(payload: Record<string, unknown>): JWTPayload {
  const rawRoles = payload.roles;
  const roles: string[] = Array.isArray(rawRoles)
    ? rawRoles.filter((role): role is string => typeof role === 'string')
    : typeof rawRoles === 'string'
      ? [rawRoles]
      : [];

  const audClaim = payload.aud ?? '';
  const aud = Array.isArray(audClaim)
    ? audClaim.filter((value): value is string => typeof value === 'string')
    : typeof audClaim === 'string'
      ? audClaim
      : '';

  const expClaim = payload.exp;
  const exp = typeof expClaim === 'number' ? expClaim : typeof expClaim === 'string' ? Number(expClaim) : undefined;
  const iatClaim = payload.iat;
  const iat = typeof iatClaim === 'number' ? iatClaim : typeof iatClaim === 'string' ? Number(iatClaim) : undefined;

  const sub = typeof payload.sub === 'string'
    ? payload.sub
    : typeof payload.oid === 'string'
      ? payload.oid
      : '';

  if (!sub) {
    throw new Error('Token is missing required subject claim');
  }

  return {
    ...payload,
    sub,
    aud,
    iss: typeof payload.iss === 'string' ? payload.iss : '',
    exp,
    iat,
    roles,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    preferred_username: typeof payload.preferred_username === 'string' ? payload.preferred_username : undefined,
    tid: typeof payload.tid === 'string' ? payload.tid : undefined,
    oid: typeof payload.oid === 'string' ? payload.oid : undefined,
  };
}

function shouldAllowInsecureDecode(): boolean {
  return process.env.AUTH_ALLOW_INSECURE_TOKENS === 'true'
    || ['development', 'test'].includes(process.env.NODE_ENV ?? '');
}

function enforceTokenFreshness(payload: JWTPayload) {
  if (payload.exp) {
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      throw new Error('Token expired');
    }
  }
}

async function verifyToken(token: string): Promise<JWTPayload> {
  if (!token) {
    throw new Error('Missing token');
  }

  if (configuredVerifier) {
    return configuredVerifier(token);
  }

  if (shouldAllowInsecureDecode()) {
    const payload = decodeJwt(token) as Record<string, unknown>;
    const normalized = normalizePayload(payload);
    enforceTokenFreshness(normalized);
    return normalized;
  }

  const audiences = getAudienceList();
  const { issuer } = await getOpenIdConfiguration();
  const tenantIds = getTenantIds();
  const jwkSet = await getRemoteJwkSet();

  const verification = await jwtVerify(token, jwkSet, {
    issuer,
    audience: audiences,
  });

  const normalized = normalizePayload(verification.payload as Record<string, unknown>);
  enforceTokenFreshness(normalized);
  if (normalized.tid && !tenantIds.includes(normalized.tid)) {
    throw new Error('Token tenant is not allowed');
  }

  return normalized;
}

export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    return await verifyToken(token);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
    throw new Error('Token verification failed');
  }
}

export async function requireUser(context: InvocationContext, req: HttpRequest): Promise<JWTPayload> {
  const cached = (req as any).__asoraUser as JWTPayload | undefined;
  if (cached) {
    return cached;
  }

  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token) {
    throw new HttpError(401, { code: 'unauthorized', message: 'Missing authorization token' });
  }

  try {
    const payload = await verifyJWT(token);
    (req as any).__asoraUser = payload;
    return payload;
  } catch (error) {
    if (isHttpError(error)) {
      throw error;
    }

    if (error instanceof Error && (error.message.includes('expired') || error.message.includes('Token has expired'))) {
      throw new HttpError(401, { code: 'unauthorized', message: 'Token expired' });
    }

    if (error instanceof joseErrors.JWTExpired) {
      throw new HttpError(401, { code: 'unauthorized', message: 'Token expired' });
    }

    throw new HttpError(401, { code: 'unauthorized', message: 'Invalid or expired token' });
  }
}

export function extractUserIdFromJWT(authHeader: string): string {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const payload = decodeJwt(token) as Record<string, unknown>;
    if (typeof payload.sub === 'string' && payload.sub) {
      return payload.sub;
    }
    if (typeof payload.oid === 'string' && payload.oid) {
      return payload.oid;
    }
    return '';
  } catch {
    return '';
  }
}

export function hasRole(payload: JWTPayload, requiredRole: string): boolean {
  return payload.roles?.includes(requiredRole) ?? false;
}

export function extractUserInfo(payload: JWTPayload): {
  id: string;
  email?: string;
  name?: string;
  roles: string[];
} {
  return {
    id: payload.sub,
    email: payload.email ?? payload.preferred_username,
    name: payload.name,
    roles: payload.roles || [],
  };
}
