/**
 * Role-Based Authorization Guard
 *
 * Provides a reusable middleware wrapper for checking JWT roles.
 * Combines authentication (401) and authorization (403) in a clean pattern.
 *
 * Usage:
 *   const handler = requireRoles(['moderator'])(async (req, ctx) => { ... });
 *   const adminHandler = requireRoles(['admin', 'privacy_admin'])(async (req, ctx) => { ... });
 */
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import type { Principal } from '../types/azure';
import { AuthError, verifyAuthorizationHeader } from './verifyJwt';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type AuthenticatedHandler = (
  req: HttpRequest & { principal: Principal },
  context: InvocationContext
) => Promise<HttpResponseInit> | HttpResponseInit;

export interface RoleCheckOptions {
  /** If true, user must have ALL specified roles. Default: false (any role matches) */
  requireAll?: boolean;
  /** Custom error message for 403 responses */
  forbiddenMessage?: string;
}

// ─────────────────────────────────────────────────────────────
// Error Response Builders
// ─────────────────────────────────────────────────────────────

function buildUnauthorizedResponse(error: AuthError): HttpResponseInit {
  return {
    status: 401,
    headers: {
      'WWW-Authenticate': `Bearer error="${error.code}", error_description="${error.message}"`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ error: error.code, message: error.message }),
  };
}

function buildForbiddenResponse(requiredRoles: string[], message?: string): HttpResponseInit {
  const errorMessage =
    message || `Access denied. Required role${requiredRoles.length > 1 ? 's' : ''}: ${requiredRoles.join(', ')}`;

  return {
    status: 403,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      error: 'forbidden',
      code: 'insufficient_permissions',
      message: errorMessage,
      requiredRoles,
    }),
  };
}

// ─────────────────────────────────────────────────────────────
// Role Extraction and Checking
// ─────────────────────────────────────────────────────────────

/**
 * Extract roles from principal, handling both array and space-separated string formats
 */
function extractRolesFromPrincipal(principal: Principal): string[] {
  const principalRoles = principal.roles;

  if (Array.isArray(principalRoles)) {
    return principalRoles.filter((r): r is string => typeof r === 'string');
  }

  if (typeof principalRoles === 'string') {
    return principalRoles
      .split(' ')
      .map((r) => r.trim())
      .filter(Boolean);
  }

  return [];
}

/**
 * Check if user has required roles
 */
function hasRequiredRoles(
  userRoles: string[],
  requiredRoles: string[],
  requireAll: boolean
): boolean {
  if (requiredRoles.length === 0) {
    return true; // No roles required = always passes
  }

  if (requireAll) {
    // User must have ALL required roles
    return requiredRoles.every((role) => userRoles.includes(role));
  }

  // User must have ANY of the required roles
  return requiredRoles.some((role) => userRoles.includes(role));
}

// ─────────────────────────────────────────────────────────────
// Main Guard Function
// ─────────────────────────────────────────────────────────────

/**
 * Creates a role-based authorization guard.
 *
 * @param requiredRoles - Array of role names that grant access
 * @param options - Optional configuration
 * @returns A middleware wrapper function
 *
 * @example
 * // Require moderator OR admin role
 * const protectedHandler = requireRoles(['moderator', 'admin'])(myHandler);
 *
 * @example
 * // Require BOTH moderator AND senior_mod roles
 * const seniorModHandler = requireRoles(['moderator', 'senior_mod'], { requireAll: true })(myHandler);
 */
export function requireRoles(
  requiredRoles: string[],
  options: RoleCheckOptions = {}
): (handler: AuthenticatedHandler) => (req: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit> {
  const { requireAll = false, forbiddenMessage } = options;

  return (handler: AuthenticatedHandler) => {
    return async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
      const header = req.headers.get('authorization');

      // Step 1: Authenticate (401 if fails)
      let principal: Principal;
      try {
        principal = await verifyAuthorizationHeader(header);
      } catch (error) {
        const authError =
          error instanceof AuthError
            ? error
            : new AuthError('invalid_token', 'Unable to validate token');
        context.log('auth.requireRoles.denied', {
          code: authError.code,
          message: authError.message,
          requiredRoles,
        });
        return buildUnauthorizedResponse(authError);
      }

      // Step 2: Authorize (403 if lacks roles)
      const userRoles = extractRolesFromPrincipal(principal);
      const hasAccess = hasRequiredRoles(userRoles, requiredRoles, requireAll);

      if (!hasAccess) {
        context.log('auth.requireRoles.forbidden', {
          userId: principal.sub,
          userRoles,
          requiredRoles,
          requireAll,
        });
        return buildForbiddenResponse(requiredRoles, forbiddenMessage);
      }

      // Step 3: Attach principal and call handler
      (req as HttpRequest & { principal: Principal }).principal = principal;
      context.principal = principal;

      context.log('auth.requireRoles.granted', {
        userId: principal.sub,
        matchedRoles: userRoles.filter((r) => requiredRoles.includes(r)),
      });

      return handler(req as HttpRequest & { principal: Principal }, context);
    };
  };
}

// ─────────────────────────────────────────────────────────────
// Convenience Presets
// ─────────────────────────────────────────────────────────────

/** Guard for moderator-only endpoints */
export const requireModerator = requireRoles(['moderator', 'admin']);

/** Guard for privacy admin endpoints (DSR operations) */
export const requirePrivacyAdmin = requireRoles(['privacy_admin', 'admin']);

/** Guard for admin-only endpoints */
export const requireAdmin = requireRoles(['admin']);

/** Guard for senior moderators (must have both roles) */
export const requireSeniorModerator = requireRoles(['moderator', 'senior_mod'], { requireAll: true });
