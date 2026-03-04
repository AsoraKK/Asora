/**
 * Cloudflare Access JWT Verification
 * 
 * Validates Cf-Access-Jwt-Assertion header for admin API requests.
 * Provides defense-in-depth authentication at the origin.
 * 
 * Security requirements:
 * - Cryptographic signature verification via JWKS (RS256 only)
 * - Issuer (iss) and audience (aud) claim validation
 * - Optional owner email enforcement for sensitive endpoints
 * - JWKS caching with automatic refresh on unknown kid
 * 
 * @see https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
 */

import { createRemoteJWKSet, jwtVerify, JWTPayload, errors as joseErrors } from 'jose';
import type { CloudflareAccessClaims } from './types';

/**
 * Cloudflare Access configuration
 * These values come from Cloudflare Zero Trust dashboard
 */
interface CloudflareAccessConfig {
  issuer: string;     // Full issuer URL (e.g., https://asorateam.cloudflareaccess.com)
  audience: string;   // The Application Audience (AUD) Tag
  jwksUrl: string;    // JWKS endpoint URL
  ownerEmail?: string; // Optional owner email for additional restriction
}

/**
 * Options for Cloudflare Access verification
 */
export interface VerifyOptions {
  /** Require email to match CF_ACCESS_OWNER_EMAIL (for owner-only endpoints) */
  requireOwner?: boolean;
}

/**
 * Get Cloudflare Access configuration from environment
 * 
 * Environment variables:
 * - CF_ACCESS_ISSUER: Full issuer URL (e.g., https://asorateam.cloudflareaccess.com)
 *   OR CF_ACCESS_TEAM_DOMAIN for backward compatibility (e.g., asorateam)
 * - CF_ACCESS_AUDIENCE or CF_ACCESS_AUD: Application audience tag
 * - CF_ACCESS_JWKS_URL: Optional custom JWKS URL (derived from issuer if not set)
 * - CF_ACCESS_OWNER_EMAIL: Optional owner email for restricted access
 */
function getAccessConfig(): CloudflareAccessConfig {
  // Support both new and legacy env var names
  const issuerEnv = process.env.CF_ACCESS_ISSUER;
  const teamDomain = process.env.CF_ACCESS_TEAM_DOMAIN;
  const audienceEnv = process.env.CF_ACCESS_AUDIENCE || process.env.CF_ACCESS_AUD;
  const jwksUrlEnv = process.env.CF_ACCESS_JWKS_URL;
  const ownerEmail = process.env.CF_ACCESS_OWNER_EMAIL;

  // Derive issuer from team domain if not explicitly set
  let issuer: string;
  if (issuerEnv) {
    issuer = issuerEnv;
  } else if (teamDomain) {
    issuer = `https://${teamDomain}.cloudflareaccess.com`;
  } else {
    throw new Error(
      'Cloudflare Access not configured. Set CF_ACCESS_ISSUER (or CF_ACCESS_TEAM_DOMAIN) environment variable.'
    );
  }

  if (!audienceEnv) {
    throw new Error(
      'Cloudflare Access audience not configured. Set CF_ACCESS_AUDIENCE environment variable.'
    );
  }

  // JWKS URL: use explicit env var or derive from issuer
  // Cloudflare Access JWKS endpoint is at /cdn-cgi/access/certs
  const jwksUrl = jwksUrlEnv || `${issuer}/cdn-cgi/access/certs`;

  return { 
    issuer, 
    audience: audienceEnv, 
    jwksUrl,
    ownerEmail: ownerEmail || undefined,
  };
}

/**
 * JWKS cache with URL tracking for invalidation
 */
interface JWKSCacheEntry {
  jwks: ReturnType<typeof createRemoteJWKSet>;
  url: string;
  createdAt: number;
}

let jwksCache: JWKSCacheEntry | null = null;

/** JWKS cache TTL in milliseconds (10 minutes) */
const JWKS_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Get or create JWKS for Cloudflare Access certs endpoint
 * 
 * Implements caching with TTL and automatic refresh on unknown kid.
 * The jose library handles the kid lookup internally.
 */
function getJWKS(jwksUrl: string, forceRefresh = false): ReturnType<typeof createRemoteJWKSet> {
  const now = Date.now();
  
  // Invalidate cache if:
  // - URL changed
  // - Cache expired
  // - Force refresh requested (e.g., unknown kid)
  if (
    jwksCache && 
    (jwksCache.url !== jwksUrl || 
     now - jwksCache.createdAt > JWKS_CACHE_TTL_MS ||
     forceRefresh)
  ) {
    jwksCache = null;
  }

  if (!jwksCache) {
    const certsUrl = new URL(jwksUrl);
    jwksCache = {
      jwks: createRemoteJWKSet(certsUrl),
      url: jwksUrl,
      createdAt: now,
    };
  }

  return jwksCache.jwks;
}

/**
 * Clear JWKS cache (useful for testing)
 */
export function clearJWKSCache(): void {
  jwksCache = null;
}

/**
 * Result of Cloudflare Access authentication
 */
export interface AccessAuthResult {
  authenticated: true;
  actor: string;  // Email or sub claim for audit logging
  claims: CloudflareAccessClaims;
}

export interface AccessAuthError {
  authenticated: false;
  error: string;
  code: 'MISSING_TOKEN' | 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'CONFIG_ERROR' | 'FORBIDDEN';
}

export type AccessAuthOutcome = AccessAuthResult | AccessAuthError;

/**
 * Verify Cloudflare Access JWT from request headers
 * 
 * Security features:
 * - RS256 algorithm enforcement (rejects alg=none and other algorithms)
 * - JWKS-based signature verification with caching
 * - Issuer and audience claim validation
 * - Optional owner email enforcement
 * 
 * @param headers - Request headers (must contain Cf-Access-Jwt-Assertion)
 * @param options - Verification options (e.g., require owner email)
 * @returns Authentication result with actor or error details
 */
export async function verifyCloudflareAccess(
  headers: { get(name: string): string | null },
  options: VerifyOptions = {}
): Promise<AccessAuthOutcome> {
  // Get JWT from header
  const token = headers.get('Cf-Access-Jwt-Assertion');

  if (!token) {
    return {
      authenticated: false,
      error: 'Missing Cf-Access-Jwt-Assertion header',
      code: 'MISSING_TOKEN',
    };
  }

  // Get configuration
  let config: CloudflareAccessConfig;
  try {
    config = getAccessConfig();
  } catch (err) {
    return {
      authenticated: false,
      error: err instanceof Error ? err.message : 'Configuration error',
      code: 'CONFIG_ERROR',
    };
  }

  // Owner email required but not configured
  if (options.requireOwner && !config.ownerEmail) {
    return {
      authenticated: false,
      error: 'Owner email enforcement requested but CF_ACCESS_OWNER_EMAIL not configured',
      code: 'CONFIG_ERROR',
    };
  }

  try {
    // Get JWKS (cached with TTL)
    const jwks = getJWKS(config.jwksUrl);

    // Verify JWT signature and claims
    // jose library enforces algorithm based on key type from JWKS
    // We explicitly require RS256 in the options for defense-in-depth
    const { payload, protectedHeader } = await jwtVerify(token, jwks, {
      issuer: config.issuer,
      audience: config.audience,
      algorithms: ['RS256'], // CRITICAL: Only allow RS256, reject alg=none and others
      clockTolerance: 60, // Allow 60 seconds clock skew
    });

    // Double-check algorithm (belt and suspenders)
    if (protectedHeader.alg !== 'RS256') {
      // Log safely without exposing token
      const safeLog = {
        alg: protectedHeader.alg,
        kid: protectedHeader.kid ? 'present' : 'missing',
      };
      console.warn('[accessAuth] Rejected non-RS256 algorithm:', JSON.stringify(safeLog));
      return {
        authenticated: false,
        error: 'Invalid token algorithm',
        code: 'INVALID_TOKEN',
      };
    }

    // Extract claims
    const claims = payload as JWTPayload & Partial<CloudflareAccessClaims>;
    const actor = claims.email || claims.sub || 'unknown';

    // Owner email enforcement
    if (options.requireOwner && config.ownerEmail) {
      if (!claims.email) {
        return {
          authenticated: false,
          error: 'Token missing email claim',
          code: 'FORBIDDEN',
        };
      }
      if (claims.email.toLowerCase() !== config.ownerEmail.toLowerCase()) {
        // Log safely - only indicate mismatch, not actual values
        console.warn('[accessAuth] Owner email mismatch - access denied');
        return {
          authenticated: false,
          error: 'Access restricted to owner',
          code: 'FORBIDDEN',
        };
      }
    }

    return {
      authenticated: true,
      actor,
      claims: claims as CloudflareAccessClaims,
    };
  } catch (err) {
    // Handle jose-specific errors with appropriate codes
    if (err instanceof joseErrors.JWTExpired) {
      return {
        authenticated: false,
        error: 'Access token has expired',
        code: 'EXPIRED_TOKEN',
      };
    }

    if (err instanceof joseErrors.JWTClaimValidationFailed) {
      // iss or aud mismatch
      const message = err.message || 'Claim validation failed';
      // Log safely
      console.warn('[accessAuth] Claim validation failed:', message);
      return {
        authenticated: false,
        error: 'Token claim validation failed',
        code: 'INVALID_TOKEN',
      };
    }

    if (err instanceof joseErrors.JWSSignatureVerificationFailed) {
      console.warn('[accessAuth] Signature verification failed');
      return {
        authenticated: false,
        error: 'Token signature verification failed',
        code: 'INVALID_TOKEN',
      };
    }

    // Generic error handling
    const message = err instanceof Error ? err.message : 'Token verification failed';

    // Detect expired tokens from message (fallback)
    if (message.includes('expired') || message.includes('exp')) {
      return {
        authenticated: false,
        error: 'Access token has expired',
        code: 'EXPIRED_TOKEN',
      };
    }

    return {
      authenticated: false,
      error: message,
      code: 'INVALID_TOKEN',
    };
  }
}

/**
 * Middleware-style guard for admin endpoints
 * 
 * @param headers - Request headers
 * @param options - Verification options
 * @returns Error response info or authenticated claims
 */
export async function requireCloudflareAccess(
  headers: { get(name: string): string | null },
  options: VerifyOptions = {}
): Promise<{ status: number; error: string; code: string } | { actor: string; claims: CloudflareAccessClaims }> {
  const result = await verifyCloudflareAccess(headers, options);

  if (!result.authenticated) {
    let status: number;
    switch (result.code) {
      case 'CONFIG_ERROR':
        status = 500;
        break;
      case 'FORBIDDEN':
        status = 403;
        break;
      default:
        status = 401;
    }
    return { status, error: result.error, code: result.code };
  }

  return { actor: result.actor, claims: result.claims };
}

/**
 * Check if Cloudflare Access is configured
 * Useful for health checks and startup validation
 */
export function isAccessConfigured(): boolean {
  const hasIssuer = !!(process.env.CF_ACCESS_ISSUER || process.env.CF_ACCESS_TEAM_DOMAIN);
  const hasAudience = !!(process.env.CF_ACCESS_AUDIENCE || process.env.CF_ACCESS_AUD);
  return hasIssuer && hasAudience;
}

/**
 * Check if owner email enforcement is configured
 */
export function isOwnerEmailConfigured(): boolean {
  return !!process.env.CF_ACCESS_OWNER_EMAIL;
}
