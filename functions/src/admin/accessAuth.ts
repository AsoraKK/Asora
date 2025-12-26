/**
 * Cloudflare Access JWT Verification
 * 
 * Validates Cf-Access-Jwt-Assertion header for admin API requests.
 * Provides defense-in-depth authentication at the origin.
 * 
 * @see https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
 */

import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';
import type { CloudflareAccessClaims } from './types';

/**
 * Cloudflare Access configuration
 * These values come from Cloudflare Zero Trust dashboard
 */
interface CloudflareAccessConfig {
  teamDomain: string; // e.g., 'asora' for asora.cloudflareaccess.com
  audience: string;   // The Application Audience (AUD) Tag
}

/**
 * Get Cloudflare Access configuration from environment
 */
function getAccessConfig(): CloudflareAccessConfig {
  const teamDomain = process.env.CF_ACCESS_TEAM_DOMAIN;
  const audience = process.env.CF_ACCESS_AUD;

  if (!teamDomain || !audience) {
    throw new Error(
      'Cloudflare Access not configured. Set CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD environment variables.'
    );
  }

  return { teamDomain, audience };
}

/**
 * Cache for JWKS to avoid fetching on every request
 */
let jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwtsCacheTeamDomain: string | null = null;

/**
 * Get or create JWKS for Cloudflare Access certs endpoint
 */
function getJWKS(teamDomain: string): ReturnType<typeof createRemoteJWKSet> {
  // Invalidate cache if team domain changed
  if (jwtsCacheTeamDomain !== teamDomain) {
    jwksCache = null;
    jwtsCacheTeamDomain = teamDomain;
  }

  if (!jwksCache) {
    const certsUrl = new URL(`https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`);
    jwksCache = createRemoteJWKSet(certsUrl);
  }

  return jwksCache;
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
  code: 'MISSING_TOKEN' | 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'CONFIG_ERROR';
}

export type AccessAuthOutcome = AccessAuthResult | AccessAuthError;

/**
 * Verify Cloudflare Access JWT from request headers
 * 
 * @param headers - Request headers (must contain Cf-Access-Jwt-Assertion)
 * @returns Authentication result with actor or error details
 */
export async function verifyCloudflareAccess(
  headers: { get(name: string): string | null }
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

  try {
    // Verify JWT signature and claims
    const jwks = getJWKS(config.teamDomain);
    const issuer = `https://${config.teamDomain}.cloudflareaccess.com`;

    const { payload } = await jwtVerify(token, jwks, {
      issuer,
      audience: config.audience,
    });

    // Extract actor (email preferred, fallback to sub)
    const claims = payload as JWTPayload & Partial<CloudflareAccessClaims>;
    const actor = claims.email || claims.sub || 'unknown';

    return {
      authenticated: true,
      actor,
      claims: claims as CloudflareAccessClaims,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token verification failed';

    // Detect expired tokens
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
 * Returns 401/403 response or null if authenticated
 */
export async function requireCloudflareAccess(
  headers: { get(name: string): string | null }
): Promise<{ status: number; error: string } | { actor: string; claims: CloudflareAccessClaims }> {
  const result = await verifyCloudflareAccess(headers);

  if (!result.authenticated) {
    const status = result.code === 'CONFIG_ERROR' ? 500 : 401;
    return { status, error: result.error };
  }

  return { actor: result.actor, claims: result.claims };
}

/**
 * Check if Cloudflare Access is configured
 * Useful for health checks and startup validation
 */
export function isAccessConfigured(): boolean {
  return !!(process.env.CF_ACCESS_TEAM_DOMAIN && process.env.CF_ACCESS_AUD);
}
