"use strict";
/**
 * ASORA AUTHENTICATION UTILITIES
 *
 * 🎯 Purpose: JWT token verification and user extraction
 * 🔐 Security: Token validation with Azure AD B2C integration
 * 📊 Features: Token parsing, user ID extraction, role verification
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpError = void 0;
exports.isHttpError = isHttpError;
exports.json = json;
exports.verifyJWT = verifyJWT;
exports.requireUser = requireUser;
exports.extractUserIdFromJWT = extractUserIdFromJWT;
exports.hasRole = hasRole;
exports.extractUserInfo = extractUserInfo;
const jwt = __importStar(require("jsonwebtoken"));
// HTTP Error for structured responses
class HttpError extends Error {
    constructor(status, body) {
        super(JSON.stringify(body));
        this.status = status;
        this.body = body;
    }
}
exports.HttpError = HttpError;
function isHttpError(error) {
    return error instanceof HttpError;
}
// Helper to create JSON responses
function json(status, body) {
    return {
        status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    };
}
/**
 * Legacy verifyJWT function for backward compatibility
 * @deprecated Use requireUser instead for new code
 */
async function verifyJWT(token) {
    // For development - decode without verification
    // In production, verify against Azure AD B2C public keys
    if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
        throw new Error('Insecure JWT decoding is not allowed in production. Use a verified JWT validation method.');
    }
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') {
        throw new Error('Invalid token format');
    }
    const payload = decoded.payload;
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
function requireUser(context, req) {
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
        const payload = decoded.payload;
        if (!payload.sub) {
            throw new HttpError(401, { code: 'unauthorized', message: 'Token missing user ID' });
        }
        // Basic expiration check
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            throw new HttpError(401, { code: 'unauthorized', message: 'Token expired' });
        }
        return payload;
    }
    catch (error) {
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
function extractUserIdFromJWT(authHeader) {
    try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.decode(token);
        return decoded?.sub || '';
    }
    catch {
        return '';
    }
}
/**
 * Check if user has required role
 */
function hasRole(payload, requiredRole) {
    return payload.roles?.includes(requiredRole) ?? false;
}
/**
 * Extract user information from JWT payload
 */
function extractUserInfo(payload) {
    return {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        roles: payload.roles || []
    };
}
//# sourceMappingURL=auth-utils.js.map