/**
 * EasyAuth Principal Validator
 *
 * Validates the structure and claims of Azure EasyAuth's
 * x-ms-client-principal header payload.
 *
 * EasyAuth encodes a JSON object as base64 in this header:
 * {
 *   "auth_typ": "aad" | "google" | "apple" | ...,
 *   "claims": [{ "typ": "...", "val": "..." }, ...],
 *   "name_typ": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
 *   "role_typ": "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
 * }
 *
 * This module validates:
 *  1. The payload is valid base64-encoded JSON
 *  2. Required structural fields are present
 *  3. The auth_typ is a known provider
 *  4. Claims array contains at least a subject/nameidentifier claim
 */

import { getAzureLogger } from '@shared/utils/logger';

const logger = getAzureLogger('auth/easyauth-validator');

// ── Types ──────────────────────────────────────────────────────────────

export interface EasyAuthClaim {
  typ: string;
  val: string;
}

export interface EasyAuthPrincipal {
  auth_typ: string;
  claims: EasyAuthClaim[];
  name_typ?: string;
  role_typ?: string;
}

export interface PrincipalValidationResult {
  valid: boolean;
  principal?: EasyAuthPrincipal;
  /** Subject claim extracted from claims array */
  subjectId?: string;
  /** Identity provider type (normalized) */
  provider?: string;
  /** Error reason if invalid */
  error?: string;
}

// ── Known providers ────────────────────────────────────────────────────

const KNOWN_AUTH_TYPES = new Set([
  'aad',           // Azure AD / Entra ID
  'google',        // Google
  'apple',         // Apple
  'facebook',      // Facebook
  'twitter',       // Twitter / X
  'github',        // GitHub
  'microsoftaccount', // Personal Microsoft accounts
  // B2C custom policies can use these:
  'aad-b2c',
  'azureadb2c',
]);

// Subject claim types (in priority order)
const SUBJECT_CLAIM_TYPES = [
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
  'http://schemas.microsoft.com/identity/claims/objectidentifier',
  'sub',
  'oid',
  'nameidentifier',
];

// ── Validation ─────────────────────────────────────────────────────────

/**
 * Parse and validate the x-ms-client-principal header value.
 *
 * @param headerValue - Raw Base64-encoded value from the header
 * @returns Validation result with extracted principal or error
 */
export function validateEasyAuthPrincipal(headerValue: string): PrincipalValidationResult {
  if (!headerValue || !headerValue.trim()) {
    return { valid: false, error: 'Empty principal header' };
  }

  // Step 1: Decode Base64
  let decoded: string;
  try {
    decoded = Buffer.from(headerValue, 'base64').toString('utf-8');
  } catch {
    return { valid: false, error: 'Invalid base64 encoding' };
  }

  // Step 2: Parse JSON
  let principal: EasyAuthPrincipal;
  try {
    principal = JSON.parse(decoded);
  } catch {
    return { valid: false, error: 'Invalid JSON in principal' };
  }

  // Step 3: Validate structure
  if (!principal || typeof principal !== 'object') {
    return { valid: false, error: 'Principal is not an object' };
  }

  if (!principal.auth_typ || typeof principal.auth_typ !== 'string') {
    return { valid: false, error: 'Missing or invalid auth_typ' };
  }

  if (!Array.isArray(principal.claims)) {
    return { valid: false, error: 'Missing or invalid claims array' };
  }

  // Step 4: Validate provider (warn but don't reject unknown providers)
  const normalizedAuthType = principal.auth_typ.toLowerCase();
  if (!KNOWN_AUTH_TYPES.has(normalizedAuthType)) {
    logger.warn('auth.easyauth.unknown_provider', {
      auth_typ: principal.auth_typ,
    });
    // Don't reject — B2C custom policies may use non-standard auth_typ values
  }

  // Step 5: Extract subject claim
  let subjectId: string | undefined;
  for (const claimType of SUBJECT_CLAIM_TYPES) {
    const claim = principal.claims.find(
      (c) => c.typ === claimType || c.typ?.toLowerCase() === claimType.toLowerCase()
    );
    if (claim?.val) {
      subjectId = claim.val;
      break;
    }
  }

  if (!subjectId) {
    return {
      valid: false,
      error: 'No subject/nameidentifier claim found in principal',
      principal,
    };
  }

  return {
    valid: true,
    principal,
    subjectId,
    provider: normalizedAuthType,
  };
}

/**
 * Validate the EasyAuth principal and verify that the subject matches
 * the upstream principal ID header.
 *
 * This cross-validates that the claims inside x-ms-client-principal
 * are consistent with x-ms-client-principal-id.
 *
 * @param principalHeader - Raw x-ms-client-principal header value
 * @param principalIdHeader - Raw x-ms-client-principal-id header value
 * @returns true if valid and consistent, false otherwise
 */
export function validateAndCrossCheckPrincipal(
  principalHeader: string,
  principalIdHeader: string
): PrincipalValidationResult {
  const result = validateEasyAuthPrincipal(principalHeader);

  if (!result.valid) {
    return result;
  }

  // Cross-check: subject in claims should match the ID header
  if (result.subjectId !== principalIdHeader) {
    logger.warn('auth.easyauth.principal_mismatch', {
      claimSubject: result.subjectId?.slice(0, 8),
      headerPrincipalId: principalIdHeader?.slice(0, 8),
    });
    return {
      ...result,
      valid: false,
      error: 'Principal ID mismatch between header and claims',
    };
  }

  return result;
}
