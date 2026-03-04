/**
 * ASORA AUTHENTICATION UTILITIES
 *
 * 🎯 Purpose: JWT token verification and user extraction
 * 🔐 Security: Token validation with Azure AD B2C integration
 * 📊 Features: Token parsing, user ID extraction, role verification
 */
import { HttpRequest, InvocationContext } from '@azure/functions';
export declare class HttpError extends Error {
    status: number;
    body: any;
    constructor(status: number, body: any);
}
export declare function isHttpError(error: any): error is HttpError;
export declare function json(status: number, body: any): {
    status: number;
    headers: {
        'Content-Type': string;
    };
    body: string;
};
export interface JWTPayload {
    sub: string;
    email?: string;
    name?: string;
    roles?: string[];
    aud: string;
    iss: string;
    iat: number;
    exp: number;
}
/**
 * Legacy verifyJWT function for backward compatibility
 * @deprecated Use requireUser instead for new code
 */
export declare function verifyJWT(token: string): Promise<JWTPayload>;
/**
 * Require authenticated user from JWT token
 * Throws HttpError(401) for invalid/missing/expired tokens
 */
export declare function requireUser(context: InvocationContext, req: HttpRequest): JWTPayload;
/**
 * Extract user ID from JWT token in Authorization header
 */
export declare function extractUserIdFromJWT(authHeader: string): string;
/**
 * Check if user has required role
 */
export declare function hasRole(payload: JWTPayload, requiredRole: string): boolean;
/**
 * Extract user information from JWT payload
 */
export declare function extractUserInfo(payload: JWTPayload): {
    id: string;
    email?: string;
    name?: string;
    roles: string[];
};
//# sourceMappingURL=auth-utils.d.ts.map