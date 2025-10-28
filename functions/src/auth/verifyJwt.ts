import { decodeProtectedHeader, importJWK, JWK, JWTPayload, jwtVerify } from 'jose';

import { getB2COpenIdConfig } from './b2cOpenIdConfig';
import { getAuthConfig } from './config';
import { getJwkByKid } from './jwks';
import type { Principal as AzurePrincipal } from '../types/azure';

export type AuthErrorCode =
  | 'invalid_request'
  | 'invalid_token'
  | 'invalid_signature'
  | 'invalid_issuer'
  | 'invalid_audience'
  | 'invalid_claim'
  | 'token_expired'
  | 'token_not_yet_valid'
  | 'invalid_key';

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly statusCode: number;

  constructor(code: AuthErrorCode, message: string, statusCode = 401) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export type Principal = AzurePrincipal;

function extractScpClaim(payload: JWTPayload): string | string[] | undefined {
  if (typeof payload.scp === 'string') {
    return payload.scp;
  }

  if (Array.isArray(payload.scp)) {
    const scopes = payload.scp.filter((item): item is string => typeof item === 'string');
    return scopes.length > 0 ? scopes : undefined;
  }

  return undefined;
}

function extractRoles(payload: JWTPayload): string[] | undefined {
  if (Array.isArray(payload.roles)) {
    const roles = payload.roles.filter((item): item is string => typeof item === 'string');
    return roles.length > 0 ? roles : undefined;
  }

  if (typeof payload.roles === 'string') {
    const roles = payload.roles
      .split(' ')
      .map(item => item.trim())
      .filter(Boolean);
    return roles.length > 0 ? roles : undefined;
  }

  return undefined;
}

function extractEmail(payload: JWTPayload): string | undefined {
  if (typeof payload.email === 'string') {
    return payload.email;
  }

  if (Array.isArray(payload.emails)) {
    const first = payload.emails.find((value): value is string => typeof value === 'string');
    return first;
  }

  return undefined;
}

function normalizeAuthorizationHeader(header: string | null | undefined): string {
  if (!header) {
    throw new AuthError('invalid_request', 'Authorization header missing');
  }

  const trimmed = header.trim();
  if (!trimmed.toLowerCase().startsWith('bearer ')) {
    throw new AuthError('invalid_request', 'Authorization header must use Bearer scheme');
  }

  const token = trimmed.slice(7).trim();
  if (!token) {
    throw new AuthError('invalid_request', 'Bearer token missing');
  }

  return token;
}

type JoseLikeError = Error & {
  code?: unknown;
  claim?: unknown;
  reason?: unknown;
};

function readErrorCode(error: JoseLikeError): string | undefined {
  return typeof error.code === 'string' ? error.code : undefined;
}

function readErrorClaim(error: JoseLikeError): string | undefined {
  return typeof error.claim === 'string' ? error.claim : undefined;
}

function mapJoseError(error: unknown): AuthError {
  if (error instanceof AuthError) {
    return error;
  }

  if (!(error instanceof Error)) {
    return new AuthError('invalid_token', 'Unable to validate token');
  }

  const joseError = error as JoseLikeError;
  const code = readErrorCode(joseError);
  const claim = readErrorClaim(joseError);
  const message = error.message ?? '';
  const reason = typeof joseError.reason === 'string' ? joseError.reason : undefined;

  if (code === 'ERR_JWT_EXPIRED') {
    return new AuthError('token_expired', 'Token has expired');
  }

  if (code === 'ERR_JWT_NOT_BEFORE' || claim === 'nbf' || message.includes('"nbf"') || reason === 'not_active') {
    return new AuthError('token_not_yet_valid', 'Token is not valid yet');
  }

  if (code === 'ERR_JWT_CLAIM_VALIDATION_FAILED') {
    if (claim === 'aud' || message.includes('"aud"')) {
      return new AuthError('invalid_audience', 'Token audience not accepted');
    }
    if (claim === 'iss' || message.includes('"iss"') || message.includes('issuer')) {
      return new AuthError('invalid_issuer', 'Token issuer mismatch');
    }
    if (claim === 'nbf' || message.includes('not yet valid') || reason === 'check_failed') {
      return new AuthError('token_not_yet_valid', 'Token is not valid yet');
    }
    return new AuthError('invalid_claim', 'Token claims validation failed');
  }

  if (code === 'ERR_JWT_SIGNATURE_VERIFICATION_FAILED' || code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
    return new AuthError('invalid_signature', 'Token signature invalid');
  }

  if (message.includes('issuer mismatch') || message.includes('issuer')) {
    return new AuthError('invalid_issuer', 'Token issuer mismatch');
  }
  if (message.includes('"aud"') || message.includes('audience')) {
    return new AuthError('invalid_audience', 'Token audience not accepted');
  }

  return new AuthError('invalid_token', 'Unable to validate token');
}

async function validatePolicyClaim(payload: JWTPayload): Promise<void> {
  const { policy } = getAuthConfig();
  const tfp = typeof payload.tfp === 'string' ? payload.tfp : undefined;
  const acr = typeof payload.acr === 'string' ? payload.acr : undefined;

  if (tfp === policy || acr === policy) {
    return;
  }

  throw new AuthError('invalid_claim', 'Token issued for different policy');
}

export async function verifyAuthorizationHeader(header: string | null | undefined): Promise<Principal> {
  const token = normalizeAuthorizationHeader(header);

  let protectedHeader;
  try {
    protectedHeader = decodeProtectedHeader(token);
  } catch (error) {
    throw mapJoseError(error);
  }

  const kid = typeof protectedHeader.kid === 'string' ? protectedHeader.kid : undefined;
  const headerAlg = typeof protectedHeader.alg === 'string' ? protectedHeader.alg : undefined;

  try {
    const { expectedAudiences, expectedIssuer, maxClockSkewSeconds, allowedAlgorithms } = getAuthConfig();
    const { issuer } = await getB2COpenIdConfig();
    const jwk: JWK = await getJwkByKid(kid ?? '', headerAlg);

    if (!jwk.kty) {
      throw new AuthError('invalid_key', 'JWK missing kty');
    }

    const algorithm = headerAlg ?? (typeof jwk.alg === 'string' ? jwk.alg : allowedAlgorithms[0]);
    if (!algorithm) {
      throw new AuthError('invalid_token', 'JWT algorithm missing');
    }

    const key = await importJWK(jwk, algorithm);

    const verification = await jwtVerify(token, key, {
      issuer: expectedIssuer || issuer,
      audience: expectedAudiences,
      algorithms: allowedAlgorithms,
      clockTolerance: maxClockSkewSeconds,
    });

    const payload = verification.payload;

    await validatePolicyClaim(payload);

    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new AuthError('invalid_claim', 'Token subject missing');
    }

    const principal: Principal = {
      sub: payload.sub,
      name: typeof payload.name === 'string' ? payload.name : undefined,
      email: extractEmail(payload),
      scp: extractScpClaim(payload),
      roles: extractRoles(payload),
      raw: payload,
    };

    return principal;
  } catch (error) {
    throw mapJoseError(error);
  }
}

export async function tryGetPrincipal(header: string | null | undefined): Promise<Principal | null> {
  try {
    return await verifyAuthorizationHeader(header);
  } catch (error) {
    if (error instanceof AuthError && error.code === 'invalid_request') {
      return null;
    }

    return null;
  }
}
