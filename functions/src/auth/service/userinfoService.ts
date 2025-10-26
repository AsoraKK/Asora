/// ASORA AUTH - USER INFO ENDPOINT
///
/// Purpose: OAuth2/OIDC UserInfo endpoint for retrieving user profile
/// Architecture: Azure Function implementing OIDC UserInfo endpoint
/// Security: JWT token validation, user profile access control
/// Database: User profile retrieval from Cosmos DB
/// OIDC: Standard UserInfo endpoint with profile claims

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { createSuccessResponse, createErrorResponse, extractAuthToken } from '@shared/utils/http';
import { getAzureLogger, logAuthAttempt } from '@shared/utils/logger';
import { getCosmosClient } from '@shared/clients/cosmos';
import * as jwt from 'jsonwebtoken';
import type { TokenPayload, UserDocument } from '@auth/types';

const logger = getAzureLogger('auth/userinfo');

// Lazy Cosmos container resolution
async function ensureContainers() {
  const client = await getCosmosClient();
  const database = client.database(process.env.COSMOS_DATABASE_NAME || 'asora');
  return {
    users: database.container('users'),
  };
}

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export async function userInfoHandler(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startTime = Date.now();

  try {
    logger.info('UserInfo request started', {
      requestId: context.invocationId,
      method: req.method,
      userAgent: req.headers.get('user-agent'),
    });

    // Extract and validate authorization token
    const authHeader = req.headers.get('authorization');
    const token = extractAuthToken(authHeader || undefined);

    if (!token) {
      logAuthAttempt(
        logger,
        false,
        undefined,
        'Missing or invalid authorization header',
        context.invocationId
      );
      return createErrorResponse(
        401,
        'Bearer token required',
        'Authorization header must contain a valid Bearer token'
      );
    }

    // Verify JWT token
    let tokenPayload: TokenPayload;
    try {
      tokenPayload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (jwtError) {
      const errorMsg = jwtError instanceof Error ? jwtError.message : 'Token verification failed';

      logAuthAttempt(
        logger,
        false,
        undefined,
        `Invalid JWT token: ${errorMsg}`,
        context.invocationId
      );

      return createErrorResponse(401, 'Invalid token', 'The provided token is invalid or expired');
    }

    logger.info('JWT token validated', {
      requestId: context.invocationId,
      userId: tokenPayload.sub,
      tokenIssuer: tokenPayload.iss,
    });

    // Retrieve user information from database
    const { users } = await ensureContainers();
    const userDoc = await users.item(tokenPayload.sub, tokenPayload.sub).read();

    if (!userDoc.resource) {
      logAuthAttempt(
        logger,
        false,
        tokenPayload.sub,
        'User not found in database',
        context.invocationId
      );
      return createErrorResponse(
        404,
        'User not found',
        'The user associated with this token does not exist'
      );
    }

    const user: UserDocument = userDoc.resource;

    // Check if user account is active
    if (!user.isActive) {
      logAuthAttempt(
        logger,
        false,
        tokenPayload.sub,
        'User account is inactive',
        context.invocationId
      );
      return createErrorResponse(403, 'Account inactive', 'This user account has been deactivated');
    }

    // Build UserInfo response according to OIDC specification
    const userInfo: any = {
      // Standard OIDC claims
      sub: user.id,
      email: user.email,
      email_verified: true, // In production, this should be based on actual verification status

      // Profile claims (if available)
      name:
        user.displayName ||
        `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
        user.username,
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
      claimsReturned: Object.keys(userInfo).length,
    });

    logAuthAttempt(logger, true, user.id, 'UserInfo retrieved successfully', context.invocationId);

    return createSuccessResponse(userInfo, {
      'Cache-Control': 'no-cache, no-store',
      Pragma: 'no-cache',
      'Content-Type': 'application/json',
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error('UserInfo request failed', {
      requestId: context.invocationId,
      error: errorMessage,
      stack: errorStack,
      duration,
    });

    return createErrorResponse(
      500,
      'UserInfo request failed',
      process.env.NODE_ENV === 'development' ? errorMessage : undefined
    );
  }
}
