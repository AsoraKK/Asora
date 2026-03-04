"use strict";
/// ASORA AUTH - TOKEN ENDPOINT
///
/// 🎯 Purpose: OAuth2 token exchange endpoint with PKCE validation
/// 🏗️ Architecture: Azure Function implementing OAuth2 token endpoint
/// 🔐 Security: PKCE validation, JWT token generation, rate limiting
/// 📊 Database: User validation and token storage
/// 🤖 OAuth2: Authorization code exchange with PKCE verification
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
const functions_1 = require("@azure/functions");
const cosmos_1 = require("@azure/cosmos");
const http_utils_1 = require("../shared/http-utils");
const validation_utils_1 = require("../shared/validation-utils");
const azure_logger_1 = require("../shared/azure-logger");
const crypto = __importStar(require("crypto"));
const jwt = __importStar(require("jsonwebtoken"));
const logger = (0, azure_logger_1.getAzureLogger)('auth/token');
// Cosmos DB configuration
const cosmosClient = new cosmos_1.CosmosClient(process.env.COSMOS_CONNECTION_STRING || '');
const database = cosmosClient.database(process.env.COSMOS_DATABASE_NAME || 'asora');
const usersContainer = database.container('users');
const sessionsContainer = database.container('auth_sessions');
// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_ISSUER = process.env.JWT_ISSUER || 'asora-auth';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
const httpTrigger = async function (req, context) {
    const startTime = Date.now();
    try {
        // Only allow POST requests
        if (req.method !== 'POST') {
            return (0, http_utils_1.createErrorResponse)(405, 'Method not allowed', 'Only POST requests are supported');
        }
        logger.info('Token exchange request started', {
            requestId: context.invocationId,
            method: req.method,
            userAgent: req.headers.get('user-agent')
        });
        // Parse and validate request body
        const body = await req.json();
        const validationResult = (0, validation_utils_1.validateRequestSize)(body);
        if (!validationResult.valid) {
            return (0, http_utils_1.createErrorResponse)(400, validationResult.error || 'Invalid request size');
        }
        // Validate required fields
        if (!body.client_id || !body.grant_type) {
            return (0, http_utils_1.createErrorResponse)(400, 'Missing required parameters: client_id and grant_type');
        }
        const clientIdValidation = (0, validation_utils_1.validateText)(body.client_id, 1, 100);
        if (!clientIdValidation.valid) {
            return (0, http_utils_1.createErrorResponse)(400, 'Invalid client_id');
        }
        // Handle different grant types
        let response;
        switch (body.grant_type) {
            case 'authorization_code':
                response = await handleAuthorizationCodeGrant(body, context.invocationId);
                break;
            case 'refresh_token':
                response = await handleRefreshTokenGrant(body, context.invocationId);
                break;
            default:
                return (0, http_utils_1.createErrorResponse)(400, 'Unsupported grant_type', `Supported types: authorization_code, refresh_token`);
        }
        const duration = Date.now() - startTime;
        logger.info('Token exchange completed successfully', {
            requestId: context.invocationId,
            duration,
            grantType: body.grant_type,
            clientId: body.client_id
        });
        return (0, http_utils_1.createSuccessResponse)(response, {
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache'
        });
    }
    catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error('Token exchange failed', {
            requestId: context.invocationId,
            error: errorMessage,
            stack: errorStack,
            duration
        });
        (0, azure_logger_1.logAuthAttempt)(logger, false, 'unknown', errorMessage, context.invocationId);
        return (0, http_utils_1.createErrorResponse)(500, 'Token exchange failed', process.env.NODE_ENV === 'development' ? errorMessage : undefined);
    }
};
async function handleAuthorizationCodeGrant(body, requestId) {
    // Validate required parameters for authorization code grant
    if (!body.code || !body.redirect_uri || !body.code_verifier) {
        throw new Error('Missing required parameters for authorization_code grant: code, redirect_uri, code_verifier');
    }
    logger.info('Processing authorization code grant', {
        requestId,
        clientId: body.client_id,
        redirectUri: body.redirect_uri
    });
    // Look up the authorization session
    const sessionQuery = {
        query: 'SELECT * FROM c WHERE c.authorizationCode = @code AND c.clientId = @clientId AND c.used != true',
        parameters: [
            { name: '@code', value: body.code },
            { name: '@clientId', value: body.client_id }
        ]
    };
    const { resources: sessions } = await sessionsContainer
        .items
        .query(sessionQuery)
        .fetchAll();
    if (sessions.length === 0) {
        throw new Error('Invalid authorization code or code already used');
    }
    const session = sessions[0];
    // Check if session has expired
    if (new Date(session.expiresAt) < new Date()) {
        throw new Error('Authorization code has expired');
    }
    // Validate redirect URI matches
    if (session.redirectUri !== body.redirect_uri) {
        throw new Error('Redirect URI mismatch');
    }
    // Validate PKCE code verifier
    const computedChallenge = crypto
        .createHash('sha256')
        .update(body.code_verifier)
        .digest('base64url');
    if (computedChallenge !== session.codeChallenge) {
        throw new Error('Invalid PKCE code verifier');
    }
    // Mark session as used
    await sessionsContainer
        .item(session.id, session.partitionKey)
        .patch([
        { op: 'add', path: '/used', value: true },
        { op: 'add', path: '/usedAt', value: new Date().toISOString() }
    ]);
    // Get user information
    if (!session.userId) {
        throw new Error('Session missing user information');
    }
    const userDoc = await usersContainer.item(session.userId, session.userId).read();
    if (!userDoc.resource) {
        throw new Error('User not found');
    }
    const user = userDoc.resource;
    // Update last login time
    await usersContainer
        .item(user.id, user.id)
        .patch([
        { op: 'replace', path: '/lastLoginAt', value: new Date().toISOString() }
    ]);
    // Generate JWT tokens
    const tokenPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        tier: user.tier,
        reputation: user.reputationScore,
        iss: JWT_ISSUER,
        aud: body.client_id,
        nonce: session.nonce
    };
    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
        jwtid: crypto.randomUUID()
    });
    const refreshToken = jwt.sign({ sub: user.id, iss: JWT_ISSUER, type: 'refresh' }, JWT_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
        jwtid: crypto.randomUUID()
    });
    (0, azure_logger_1.logAuthAttempt)(logger, true, user.id, 'Token exchange successful', requestId);
    return {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: 15 * 60, // 15 minutes in seconds
        scope: 'read write',
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
            tier: user.tier,
            reputationScore: user.reputationScore
        }
    };
}
async function handleRefreshTokenGrant(body, requestId) {
    if (!body.refresh_token) {
        throw new Error('Missing refresh_token parameter');
    }
    logger.info('Processing refresh token grant', {
        requestId,
        clientId: body.client_id
    });
    try {
        // Verify and decode refresh token
        const decoded = jwt.verify(body.refresh_token, JWT_SECRET);
        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }
        // Get user information
        const userDoc = await usersContainer.item(decoded.sub, decoded.sub).read();
        if (!userDoc.resource) {
            throw new Error('User not found');
        }
        const user = userDoc.resource;
        if (!user.isActive) {
            throw new Error('User account is inactive');
        }
        // Generate new access token
        const tokenPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            tier: user.tier,
            reputation: user.reputationScore,
            iss: JWT_ISSUER,
            aud: body.client_id
        };
        const accessToken = jwt.sign(tokenPayload, JWT_SECRET, {
            expiresIn: ACCESS_TOKEN_EXPIRY,
            jwtid: crypto.randomUUID()
        });
        (0, azure_logger_1.logAuthAttempt)(logger, true, user.id, 'Token refresh successful', requestId);
        return {
            access_token: accessToken,
            token_type: 'Bearer',
            expires_in: 15 * 60, // 15 minutes in seconds
            scope: 'read write'
        };
    }
    catch (jwtError) {
        throw new Error('Invalid or expired refresh token');
    }
}
// Register the function with Azure Functions runtime
functions_1.app.http('auth-token', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'auth/token',
    handler: httpTrigger
});
exports.default = httpTrigger;
//# sourceMappingURL=token.js.map