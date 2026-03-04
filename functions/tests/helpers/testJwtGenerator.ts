/**
 * Test JWT Generator
 *
 * Utility for generating valid JWTs in test environments.
 * Uses test issuer and audience configured in test setup.
 *
 * **DO NOT USE IN PRODUCTION**
 */

import { SignJWT } from 'jose';
import { TextEncoder } from 'util';

// Test configuration - matches test environment setup
const TEST_ISSUER = 'https://test-b2c.b2clogin.com/test-b2c.onmicrosoft.com/b2c_1_signin/v2.0';
const TEST_AUDIENCE = 'test-api-client';
const TEST_SIGNING_SECRET = 'test-secret-key-at-least-32-chars-long-for-hs256!';

// Test user IDs for fixture data
export const TEST_USER_IDS = {
  alice: '550e8400-e29b-41d4-a716-446655440001',
  bob: '550e8400-e29b-41d4-a716-446655440002',
  charlie: '550e8400-e29b-41d4-a716-446655440003',
};

export interface TestJwtPayload {
  sub?: string;
  oid?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  emails?: string[];
  roles?: string[];
  scp?: string | string[];
}

/**
 * Generate a valid test JWT token
 *
 * @param options - JWT payload options
 * @returns Signed JWT token
 */
export async function generateTestJwt(
  options: TestJwtPayload & { expiresIn?: number }
): Promise<string> {
  const { expiresIn = 3600, ...payload } = options;

  const secret = new TextEncoder().encode(TEST_SIGNING_SECRET);

  const jwt = new SignJWT({
    // Standard claims
    iss: TEST_ISSUER,
    aud: TEST_AUDIENCE,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresIn,

    // Custom claims
    sub: payload.sub || TEST_USER_IDS.alice,
    oid: payload.oid || payload.sub || TEST_USER_IDS.alice,
    given_name: payload.given_name || 'Test',
    family_name: payload.family_name || 'User',
    email: payload.email || 'test@example.com',
    ...(payload.emails && { emails: payload.emails }),
    ...(payload.roles && { roles: payload.roles }),
    ...(payload.scp && { scp: payload.scp }),
  })
    .setProtectedHeader({ alg: 'HS256' });

  return jwt.sign(secret);
}

/**
 * Generate a JWT for a specific test user
 *
 * @param userId - User ID (sub claim)
 * @param options - Additional payload options
 * @returns Signed JWT token
 */
export async function generateTestJwtForUser(
  userId: string,
  options?: Omit<TestJwtPayload, 'sub'>
): Promise<string> {
  return generateTestJwt({ ...options, sub: userId });
}

/**
 * Generate a JWT with specified roles
 *
 * @param roles - Array of role names
 * @param userId - User ID (defaults to alice)
 * @returns Signed JWT token
 */
export async function generateTestJwtWithRoles(
  roles: string[],
  userId?: string
): Promise<string> {
  return generateTestJwt({
    sub: userId || TEST_USER_IDS.alice,
    roles,
  });
}

/**
 * Generate an expired JWT (for testing rejection)
 *
 * @returns Signed but expired JWT token
 */
export async function generateExpiredTestJwt(): Promise<string> {
  return generateTestJwt({
    expiresIn: -1, // Already expired
  });
}

/**
 * Get authorization header value for a test JWT
 *
 * @param token - JWT token
 * @returns Authorization header value
 */
export function getAuthorizationHeader(token: string): string {
  return `Bearer ${token}`;
}

/**
 * Get authorization header for a test user
 *
 * @param userId - User ID
 * @param options - Additional payload options
 * @returns Authorization header value
 */
export async function getAuthorizationHeaderForUser(
  userId: string,
  options?: Omit<TestJwtPayload, 'sub'>
): Promise<string> {
  const token = await generateTestJwtForUser(userId, options);
  return getAuthorizationHeader(token);
}
