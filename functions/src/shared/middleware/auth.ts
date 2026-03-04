import type { HttpRequest } from '@azure/functions';

import { requireAuth as requireAuthGuard } from '@auth/requireAuth';
import {
  requireRoles,
  requireModerator,
  requirePrivacyAdmin,
  requireAdmin,
} from '@auth/requireRoles';
import { AuthError, Principal, tryGetPrincipal, verifyAuthorizationHeader } from '@auth/verifyJwt';

export type { Principal } from '@auth/verifyJwt';
export { requireAuthGuard as requireAuth };
export { requireRoles, requireModerator, requirePrivacyAdmin, requireAdmin };

export async function parseAuth(req: HttpRequest): Promise<Principal | null> {
  return tryGetPrincipal(req.headers.get('authorization'));
}

export async function getPrincipalOrThrow(req: HttpRequest): Promise<Principal> {
  return verifyAuthorizationHeader(req.headers.get('authorization'));
}

export function authRequired(principal: Principal | null | undefined): asserts principal is Principal {
  if (!principal) {
    throw new AuthError('invalid_token', 'Authentication required');
  }
}
