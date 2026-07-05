import { HttpRequest, InvocationContext } from '@azure/functions';

import { AuthError, verifyAuthorizationHeader, verifyJwtToken } from '../src/auth/verifyJwt';
import type { Principal } from '../src/auth/verifyJwt';

export class HttpError extends Error {
  constructor(
    public status: number,
    public body: unknown
  ) {
    super(typeof body === 'string' ? body : JSON.stringify(body));
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

export function json(status: number, body: unknown) {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

export type JWTPayload = Principal['raw'] & {
  sub: string;
  email?: string;
  name?: string;
  roles?: string[];
  preferred_username?: string;
  tier?: string;
  isActive?: boolean;
  [claim: string]: unknown;
};

export type TokenVerifier = (token: string) => Promise<JWTPayload>;

let configuredVerifier: TokenVerifier | null = null;

export function configureTokenVerifier(verifier?: TokenVerifier) {
  configuredVerifier = verifier ?? null;
}

function principalToPayload(principal: Principal): JWTPayload {
  const raw = (principal.raw ?? {}) as Record<string, unknown>;
  const merged: JWTPayload = {
    ...raw,
    sub: principal.sub,
    email: principal.email ?? (typeof raw.email === 'string' ? raw.email : undefined),
    name: principal.name ?? (typeof raw.name === 'string' ? raw.name : undefined),
    tier: principal.tier ?? (typeof raw.tier === 'string' ? raw.tier : undefined),
    roles: Array.isArray(principal.roles)
      ? principal.roles.filter((role): role is string => typeof role === 'string')
      : typeof raw.roles === 'string'
        ? raw.roles.split(' ').map((role) => role.trim()).filter(Boolean)
        : undefined,
    preferred_username:
      typeof raw.preferred_username === 'string' ? raw.preferred_username : undefined,
  };

  return merged;
}

function mapAuthError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof AuthError) {
    const messageByCode: Record<string, string> = {
      token_expired: 'Token expired',
      token_not_yet_valid: 'Token not valid yet',
    };
    return new HttpError(401, {
      code: 'unauthorized',
      message: messageByCode[error.code] ?? 'Invalid or expired token',
    });
  }

  if (error instanceof Error) {
    return new HttpError(401, { code: 'unauthorized', message: error.message });
  }

  return new HttpError(401, { code: 'unauthorized', message: 'Invalid or expired token' });
}

export async function verifyJWT(token: string): Promise<JWTPayload> {
  if (!token) {
    throw new Error('Token verification failed: Missing token');
  }

  if (configuredVerifier) {
    return configuredVerifier(token);
  }

  try {
    const principal = await verifyJwtToken(token, { expectedType: 'access' });
    return principalToPayload(principal);
  } catch (error) {
    if (error instanceof AuthError) {
      throw new Error(`Token verification failed: ${error.message}`);
    }
    throw new Error(
      `Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function requireUser(
  _context: InvocationContext,
  req: HttpRequest
): Promise<JWTPayload> {
  const cached = (req as HttpRequest & { __asoraUser?: JWTPayload }).__asoraUser;
  if (cached) {
    return cached;
  }

  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (configuredVerifier) {
    if (!token) {
      throw new HttpError(401, { code: 'unauthorized', message: 'Missing authorization token' });
    }
    try {
      const payload = await verifyJWT(token);
      (req as HttpRequest & { __asoraUser?: JWTPayload }).__asoraUser = payload;
      return payload;
    } catch (error) {
      throw mapAuthError(error);
    }
  }

  try {
    const principal = await verifyAuthorizationHeader(
      authHeader
    );
    const payload = principalToPayload(principal);
    (req as HttpRequest & { __asoraUser?: JWTPayload }).__asoraUser = payload;
    return payload;
  } catch (error) {
    throw mapAuthError(error);
  }
}

export function hasRole(payload: Pick<JWTPayload, 'roles'>, requiredRole: string): boolean {
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
