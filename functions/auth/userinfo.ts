/// ASORA AUTH - USER INFO ENDPOINT
///
/// 🎯 Purpose: OAuth2/OIDC UserInfo endpoint for retrieving user profile
/// 🏗️ Architecture: Azure Function implementing OIDC UserInfo endpoint
/// 🔐 Security: JWT token validation, user profile access control
/// 📊 Database: User profile retrieval from Cosmos DB
/// 🤖 OIDC: Standard UserInfo endpoint with profile claims

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { createSuccessResponse, createErrorResponse, extractAuthToken } from '../shared/http-utils';
import { getAzureLogger, logAuthAttempt } from '../shared/azure-logger';
import * as jwt from 'jsonwebtoken';

const logger = getAzureLogger('auth/userinfo');

// Cosmos DB configuration
const cosmosClient = new CosmosClient(process.env.COSMOS_CONNECTION_STRING || '');
const database = cosmosClient.database(process.env.COSMOS_DATABASE_NAME || 'asora');
const usersContainer = database.container('users');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

interface UserDocument {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  role: string;
  tier: string;
  reputationScore: number;
  createdAt: string;
  lastLoginAt: string;
  isActive: boolean;
  profile?: {
    bio?: string;
    location?: string;
    website?: string;
    birthDate?: string;
    phoneNumber?: string;
    timezone?: string;
  };
  preferences?: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    publicProfile: boolean;
    allowDirectMessages: boolean;
  };
}

interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  tier: string;
  reputation: number;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  jti: string;
  nonce?: string;
}

const httpTrigger = async function (
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
    const userDoc = await usersContainer.item(tokenPayload.sub, tokenPayload.sub).read();

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
};

// Register the function with Azure Functions runtime
app.http('auth-userinfo', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'auth/userinfo',
  handler: httpTrigger,
});

export default httpTrigger;
