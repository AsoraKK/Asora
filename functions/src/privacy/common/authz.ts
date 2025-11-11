import { AuthError } from '@auth/verifyJwt';
import type { Principal } from '@shared/middleware/auth';

const REQUIRED_ROLE = 'privacy_admin';

export function ensurePrivacyAdmin(principal?: Principal): void {
  if (!principal) {
    throw new AuthError('invalid_token', 'Authentication required for DSR admin actions.');
  }

  const roles = Array.isArray(principal.roles)
    ? principal.roles
    : typeof principal.roles === 'string'
    ? principal.roles.split(' ').map(item => item.trim()).filter(Boolean)
    : [];

  if (!roles.includes(REQUIRED_ROLE)) {
    throw new AuthError(
      'invalid_claim',
      `The ${REQUIRED_ROLE} role is required for Data Subject Request operations.`,
      403,
    );
  }
}
