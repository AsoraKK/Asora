"use strict";
/// ASORA AUTH - USER INFO ENDPOINT
///
/// 🎯 Purpose: OAuth2/OIDC UserInfo endpoint for retrieving user profile
/// 🏗️ Architecture: Azure Function implementing OIDC UserInfo endpoint
/// 🔐 Security: JWT token validation, user profile access control
/// 📊 Database: User profile retrieval from Cosmos DB
/// 🤖 OIDC: Standard UserInfo endpoint with profile claims
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
const azure_logger_1 = require("../shared/azure-logger");
const jwt = __importStar(require("jsonwebtoken"));
const logger = (0, azure_logger_1.getAzureLogger)('auth/userinfo');
// Cosmos DB configuration
const cosmosClient = new cosmos_1.CosmosClient(process.env.COSMOS_CONNECTION_STRING || '');
const database = cosmosClient.database(process.env.COSMOS_DATABASE_NAME || 'asora');
const usersContainer = database.container('users');
// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const httpTrigger = async function (req, context) {
    const startTime = Date.now();
    try {
        logger.info('UserInfo request started', {
            requestId: context.invocationId,
            method: req.method,
            userAgent: req.headers.get('user-agent')
        });
        // Extract and validate authorization token
        const authHeader = req.headers.get('authorization');
        const token = (0, http_utils_1.extractAuthToken)(authHeader || undefined);
        if (!token) {
            (0, azure_logger_1.logAuthAttempt)(logger, false, undefined, 'Missing or invalid authorization header', context.invocationId);
            return (0, http_utils_1.createErrorResponse)(401, 'Bearer token required', 'Authorization header must contain a valid Bearer token');
        }
        // Verify JWT token
        let tokenPayload;
        try {
            tokenPayload = jwt.verify(token, JWT_SECRET);
        }
        catch (jwtError) {
            const errorMsg = jwtError instanceof Error ? jwtError.message : 'Token verification failed';
            (0, azure_logger_1.logAuthAttempt)(logger, false, undefined, `Invalid JWT token: ${errorMsg}`, context.invocationId);
            return (0, http_utils_1.createErrorResponse)(401, 'Invalid token', 'The provided token is invalid or expired');
        }
        logger.info('JWT token validated', {
            requestId: context.invocationId,
            userId: tokenPayload.sub,
            tokenIssuer: tokenPayload.iss
        });
        // Retrieve user information from database
        const userDoc = await usersContainer.item(tokenPayload.sub, tokenPayload.sub).read();
        if (!userDoc.resource) {
            (0, azure_logger_1.logAuthAttempt)(logger, false, tokenPayload.sub, 'User not found in database', context.invocationId);
            return (0, http_utils_1.createErrorResponse)(404, 'User not found', 'The user associated with this token does not exist');
        }
        const user = userDoc.resource;
        // Check if user account is active
        if (!user.isActive) {
            (0, azure_logger_1.logAuthAttempt)(logger, false, tokenPayload.sub, 'User account is inactive', context.invocationId);
            return (0, http_utils_1.createErrorResponse)(403, 'Account inactive', 'This user account has been deactivated');
        }
        // Build UserInfo response according to OIDC specification
        const userInfo = {
            // Standard OIDC claims
            sub: user.id,
            email: user.email,
            email_verified: true, // In production, this should be based on actual verification status
            // Profile claims (if available)
            name: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
            given_name: user.firstName,
            family_name: user.lastName,
            preferred_username: user.username,
            picture: user.profilePicture,
            profile: user.profile?.website,
            locale: user.profile?.timezone,
            // Custom Asora claims
            role: user.role,
            tier: user.tier,
            reputation_score: user.reputationScore,
            created_at: user.createdAt,
            last_login_at: user.lastLoginAt,
        };
        // Add profile information if user has public profile enabled
        if (user.preferences?.publicProfile !== false) {
            userInfo.bio = user.profile?.bio;
            userInfo.location = user.profile?.location;
            userInfo.website = user.profile?.website;
        }
        // Add nonce if it was present in the original token
        if (tokenPayload.nonce) {
            userInfo.nonce = tokenPayload.nonce;
        }
        // Remove undefined values
        Object.keys(userInfo).forEach(key => {
            if (userInfo[key] === undefined) {
                delete userInfo[key];
            }
        });
        const duration = Date.now() - startTime;
        logger.info('UserInfo request completed successfully', {
            requestId: context.invocationId,
            duration,
            userId: user.id,
            claimsReturned: Object.keys(userInfo).length
        });
        (0, azure_logger_1.logAuthAttempt)(logger, true, user.id, 'UserInfo retrieved successfully', context.invocationId);
        return (0, http_utils_1.createSuccessResponse)(userInfo, {
            'Cache-Control': 'no-cache, no-store',
            'Pragma': 'no-cache',
            'Content-Type': 'application/json'
        });
    }
    catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error('UserInfo request failed', {
            requestId: context.invocationId,
            error: errorMessage,
            stack: errorStack,
            duration
        });
        return (0, http_utils_1.createErrorResponse)(500, 'UserInfo request failed', process.env.NODE_ENV === 'development' ? errorMessage : undefined);
    }
};
// Register the function with Azure Functions runtime
functions_1.app.http('auth-userinfo', {
    methods: ['GET', 'POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'auth/userinfo',
    handler: httpTrigger
});
exports.default = httpTrigger;
//# sourceMappingURL=userinfo.js.map