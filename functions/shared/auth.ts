/**
 * Shared Authentication Helper for Asora Azure Functions
 * 
 * This module provides JWT token validation and user ID extraction
 * for securing all Asora API endpoints.
 */

import { verify } from 'jsonwebtoken';
import { HttpRequest } from '@azure/functions';

export interface AuthResult {
  success: boolean;
  userId?: string;
  email?: string;
  role?: string;
  tier?: string;
  error?: string;
}

/**
 * Extracts and validates JWT token from Authorization header
 * Matches the token structure from your authEmail endpoint
 * @param req - Azure Functions HTTP request object
 * @returns AuthResult with user data or error
 */
export function authenticateRequest(req: HttpRequest): AuthResult {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid Authorization header' };
  }

  const token = authHeader.split(' ')[1];
  const jwtSecret = process.env['JWT_SECRET'];

  if (!jwtSecret) {
    return { success: false, error: 'JWT_SECRET not configured' };
  }

  try {
    // Match the token structure from your authEmail endpoint
    const decoded = verify(token, jwtSecret) as {
      sub: string;      // User ID
      email: string;    // User email
      role: string;     // User role
      tier: string;     // User tier
      iat: number;      // Issued at
      exp: number;      // Expires at
    };

    return {
      success: true,
      userId: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      tier: decoded.tier
    };
  } catch (err) {
    return { success: false, error: 'Invalid or expired token' };
  }
}

/**
 * Simplified helper that just returns userId or null
 * @param req - Azure Functions HTTP request object
 * @returns userId string or null if authentication fails
 */
export function getUserIdFromRequest(req: HttpRequest): string | null {
  const result = authenticateRequest(req);
  return result.success ? result.userId! : null;
}

/**
 * Get full user context from JWT token
 * @param req - Azure Functions HTTP request object
 * @returns User context object or null
 */
export function getUserContext(req: HttpRequest): { userId: string; email: string; role: string; tier: string } | null {
  const result = authenticateRequest(req);
  if (!result.success) return null;
  
  return {
    userId: result.userId!,
    email: result.email!,
    role: result.role!,
    tier: result.tier!
  };
}
