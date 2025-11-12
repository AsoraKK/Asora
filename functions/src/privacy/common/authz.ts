import { AuthError } from '@auth/verifyJwt';
import type { Principal } from '@shared/middleware/auth';

const REQUIRED_ROLE = 'privacy_admin';

export function ensurePrivacyAdmin(principal?: Principal): void {
  if (!principal) {
    throw new AuthError('invalid_token', 'Authentication required for DSR admin actions.');
  }

  let roles: string[] = [];
  const principalRoles = principal.roles;
  
  if (Array.isArray(principalRoles)) {
    roles = principalRoles;
  } else if (typeof principalRoles === 'string') {
    roles = principalRoles.split(' ').map((item: string) => item.trim()).filter(Boolean);
  }

  if (!roles.includes(REQUIRED_ROLE)) {
    throw new AuthError(
      'invalid_claim',
      `The ${REQUIRED_ROLE} role is required for Data Subject Request operations.`,
    );
  }
}
