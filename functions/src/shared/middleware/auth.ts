import type { HttpRequest } from '@azure/functions';
import jwt from 'jsonwebtoken';

export type UserPrincipal = { kind: 'user'; id: string; claims?: Record<string, unknown> };
export type GuestPrincipal = { kind: 'guest' };
export type Principal = UserPrincipal | GuestPrincipal;

const AUDIENCE = process.env.JWT_AUD ?? '';
const ISSUER = process.env.JWT_ISS ?? '';
function getPublicKey(): string | undefined {
  return process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n');
}

function getSharedSecret(): string {
  return process.env.JWT_SECRET ?? '';
}

export function parseAuth(req: HttpRequest): Principal {
  const hdr = req.headers.get('authorization') ?? '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  const publicKey = getPublicKey();
  const sharedSecret = getSharedSecret();

  if (!token || (!publicKey && !sharedSecret)) {
    return { kind: 'guest' };
  }

  try {
    const decoded = (publicKey
      ? jwt.verify(token, publicKey, {
          algorithms: ['RS256'],
          audience: AUDIENCE || undefined,
          issuer: ISSUER || undefined,
        })
      : jwt.verify(token, sharedSecret, {
          algorithms: ['HS256', 'RS256', 'HS512'],
          audience: AUDIENCE || undefined,
          issuer: ISSUER || undefined,
        })) as { sub?: string };

    if (!decoded?.sub) {
      return { kind: 'guest' };
    }

    return { kind: 'user', id: decoded.sub, claims: decoded as Record<string, unknown> };
  } catch {
    return { kind: 'guest' };
  }
}

export function authRequired(principal: Principal): asserts principal is { kind: 'user'; id: string } {
  if (principal.kind !== 'user') {
    const error: Error & { status?: number } = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }
}

export function optionalAuth(principal: Principal): Principal {
  return principal;
}

export function guestOnly(principal: Principal): void {
  if (principal.kind !== 'guest') {
    const error: Error & { status?: number } = new Error('Forbidden');
    error.status = 403;
    throw error;
  }
}
