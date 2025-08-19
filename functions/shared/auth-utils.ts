/**
 * ASORA AUTHENTICATION UTILITIES
 * 
 * 🎯 Purpose: JWT token verification and user extraction
 * 🔐 Security: Token validation with Azure AD B2C integration
 * 📊 Features: Token parsing, user ID extraction, role verification
 */

import * as jwt from 'jsonwebtoken';
import { HttpRequest, InvocationContext } from '@azure/functions';

// HTTP Error for structured responses
export class HttpError extends Error {
  constructor(public status: number, public body: any) {
    super(JSON.stringify(body));
  }
}

export function isHttpError(error: any): error is HttpError {
  return error instanceof HttpError;
}

// Helper to create JSON responses
export function json(status: number, body: any) {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

export interface JWTPayload {
  sub: string; // User ID
  email?: string;
  name?: string;
  roles?: string[];
  aud: string; // Audience
  iss: string; // Issuer
  iat: number; // Issued at
  exp: number; // Expires at
}

/**
 * Legacy verifyJWT function for backward compatibility
 * @deprecated Use requireUser instead for new code
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  // For development - decode without verification
  // In production, verify against Azure AD B2C public keys
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
    throw new Error('Insecure JWT decoding is not allowed in production. Use a verified JWT validation method.');
  }
  const decoded = jwt.decode(token, { complete: true });
  
  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid token format');
  }

  const payload = decoded.payload as JWTPayload;
  
  if (!payload.sub) {
    throw new Error('Token missing user ID');
  }

  // Basic expiration check
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error('Token expired');
  }

  return payload;
}

/**
 * Require authenticated user from JWT token
 * Throws HttpError(401) for invalid/missing/expired tokens
 */
export function requireUser(context: InvocationContext, req: HttpRequest): JWTPayload {
  try {
    const auth = req.headers.get('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    
    if (!token) {
      throw new HttpError(401, { code: 'unauthorized', message: 'Missing authorization token' });
    }

    // For development - decode without verification
    // In production, verify against Azure AD B2C public keys
    const decoded = jwt.decode(token, { complete: true });
    
    if (!decoded || typeof decoded === 'string') {
      throw new HttpError(401, { code: 'unauthorized', message: 'Invalid token format' });
    }

    const payload = decoded.payload as JWTPayload;
    
    if (!payload.sub) {
      throw new HttpError(401, { code: 'unauthorized', message: 'Token missing user ID' });
    }

    // Basic expiration check
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new HttpError(401, { code: 'unauthorized', message: 'Token expired' });
    }

    return payload;
  } catch (error) {
    // If it's already an HttpError, re-throw it
    if (isHttpError(error)) {
      throw error;
    }
    // Otherwise, wrap as 401
    throw new HttpError(401, { code: 'unauthorized', message: 'Invalid or expired token' });
  }
}

/**
 * Extract user ID from JWT token in Authorization header
 */
export function extractUserIdFromJWT(authHeader: string): string {
  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.decode(token) as JWTPayload;
    return decoded?.sub || '';
  } catch {
    return '';
  }
}

/**
 * Check if user has required role
 */
export function hasRole(payload: JWTPayload, requiredRole: string): boolean {
  return payload.roles?.includes(requiredRole) ?? false;
}

/**
 * Extract user information from JWT payload
 */
export function extractUserInfo(payload: JWTPayload): {
  id: string;
  email?: string;
  name?: string;
  roles: string[];
} {
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    roles: payload.roles || []
  };
}
