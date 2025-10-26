import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import type { Container } from '@azure/cosmos';
import { createSuccessResponse, createErrorResponse } from '@shared/utils/http';
import { validateText, validateRequestSize } from '@shared/utils/validate';
import { getAzureLogger, logAuthAttempt } from '@shared/utils/logger';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { getCosmosClient } from '@shared/clients/cosmos';

import type { AuthSession, TokenPayload, TokenRequest, UserDocument } from '@auth/types';

const logger = getAzureLogger('auth/token');

type TokenContainers = {
  users: Container;
  sessions: Container;
};

let cachedContainers: TokenContainers | null = null;

function ensureContainers(): TokenContainers {
  if (cachedContainers) {
    return cachedContainers;
  }

  const client = getCosmosClient();
  const databaseName = process.env.COSMOS_DATABASE_NAME || 'asora';
  const database = client.database(databaseName);

  cachedContainers = {
    users: database.container('users'),
    sessions: database.container('auth_sessions'),
  };

  return cachedContainers;
}

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_ISSUER = process.env.JWT_ISSUER || 'asora-auth';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days



class InviteRequiredError extends Error {
  code = 'invite_required' as const;
  constructor(message = 'Awaiting invite') {
    super(message);
  }
}

export async function tokenHandler(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startTime = Date.now();

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return createErrorResponse(405, 'Method not allowed', 'Only POST requests are supported');
    }

    logger.info('Token exchange request started', {
      requestId: context.invocationId,
      method: req.method,
      userAgent: req.headers.get('user-agent'),
    });

    // Parse and validate request body
    const body = (await req.json()) as TokenRequest;
    const validationResult = validateRequestSize(body);

    if (!validationResult.valid) {
      return createErrorResponse(400, validationResult.error || 'Invalid request size');
    }

    // Validate required fields
    if (!body.client_id || !body.grant_type) {
      return createErrorResponse(400, 'Missing required parameters: client_id and grant_type');
    }

    const clientIdValidation = validateText(body.client_id, 1, 100);
    if (!clientIdValidation.valid) {
      return createErrorResponse(400, 'Invalid client_id');
    }

    // Handle different grant types
    let response: any;

    switch (body.grant_type) {
      case 'authorization_code':
        response = await handleAuthorizationCodeGrant(body, context.invocationId);
        break;
      case 'refresh_token':
        response = await handleRefreshTokenGrant(body, context.invocationId);
        break;
      default:
        return createErrorResponse(
          400,
          'Unsupported grant_type',
          `Supported types: authorization_code, refresh_token`
        );
    }

    const duration = Date.now() - startTime;

    logger.info('Token exchange completed successfully', {
      requestId: context.invocationId,
      duration,
      grantType: body.grant_type,
      clientId: body.client_id,
    });

    return createSuccessResponse(response, {
      'Cache-Control': 'no-cache, no-store',
      Pragma: 'no-cache',
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    if (error instanceof Error && error.message.includes('Missing Cosmos DB configuration')) {
      return createErrorResponse(503, 'Service unavailable', 'Cosmos DB configuration missing');
    }

    if (error instanceof InviteRequiredError) {
      // OAuth2-compliant error payload for token endpoint
      return {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store',
          Pragma: 'no-cache',
        },
        body: JSON.stringify({
          error: error.code,
          error_description: error.message,
        }),
      };
    }

    logger.error('Token exchange failed', {
      requestId: context.invocationId,
      error: errorMessage,
      stack: errorStack,
      duration,
    });

    logAuthAttempt(logger, false, 'unknown', errorMessage, context.invocationId);

    return createErrorResponse(
      500,
      'Token exchange failed',
      process.env.NODE_ENV === 'development' ? errorMessage : undefined
    );
  }
}

async function handleAuthorizationCodeGrant(body: TokenRequest, requestId: string): Promise<any> {
  // Validate required parameters for authorization code grant
  if (!body.code || !body.redirect_uri || !body.code_verifier) {
    throw new Error(
      'Missing required parameters for authorization_code grant: code, redirect_uri, code_verifier'
    );
  }

  logger.info('Processing authorization code grant', {
    requestId,
    clientId: body.client_id,
    redirectUri: body.redirect_uri,
  });

  // Look up the authorization session
  const sessionQuery = {
    query:
      'SELECT * FROM c WHERE c.authorizationCode = @code AND c.clientId = @clientId AND c.used != true',
    parameters: [
      { name: '@code', value: body.code },
      { name: '@clientId', value: body.client_id },
    ],
  };

  const { sessions } = ensureContainers();
  const { resources: sessionResults } = await sessions.items.query(sessionQuery).fetchAll();

  if (sessionResults.length === 0) {
    throw new Error('Invalid authorization code or code already used');
  }

  const session: AuthSession = sessionResults[0];

  // Check if session has expired
  if (new Date(session.expiresAt) < new Date()) {
    throw new Error('Authorization code has expired');
  }

  // Validate redirect URI matches
  if (session.redirectUri !== body.redirect_uri) {
    throw new Error('Redirect URI mismatch');
  }

  // Validate PKCE code verifier (accept base64 or base64url, ignore padding)
  const sha = crypto.createHash('sha256').update(body.code_verifier!).digest();
  const b64url = sha.toString('base64url');
  const b64 = sha.toString('base64');
  const normalize = (s: string) => s.replace(/=+$/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const challengeNorm = normalize(session.codeChallenge || '');
  const match = normalize(b64url) === challengeNorm || normalize(b64) === challengeNorm;
  if (!match) {
    throw new Error('Invalid PKCE code verifier');
  }

  // Mark session as used
  await sessions.item(session.id, session.partitionKey).patch([
    { op: 'add', path: '/used', value: true },
    { op: 'add', path: '/usedAt', value: new Date().toISOString() },
  ]);

  // Get user information
  if (!session.userId) {
    throw new Error('Session missing user information');
  }

  const { users } = ensureContainers();
  const userDoc = await users.item(session.userId, session.userId).read();
  if (!userDoc.resource) {
    throw new Error('User not found');
  }

  const user: UserDocument = userDoc.resource;

  if (!user.isActive) {
    throw new InviteRequiredError('Awaiting invite');
  }

  // Update last login time
  await users
    .item(user.id, user.id)
    .patch([{ op: 'replace', path: '/lastLoginAt', value: new Date().toISOString() }]);

  // Generate JWT tokens
  const tokenPayload: TokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    tier: user.tier,
    reputation: user.reputationScore,
    iss: JWT_ISSUER,
    aud: body.client_id,
    nonce: session.nonce,
  };

  const accessToken = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    jwtid: crypto.randomUUID(),
  });

  const refreshToken = jwt.sign({ sub: user.id, iss: JWT_ISSUER, type: 'refresh' }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    jwtid: crypto.randomUUID(),
  });

  logAuthAttempt(logger, true, user.id, 'Token exchange successful', requestId);

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
      reputationScore: user.reputationScore,
    },
  };
}

async function handleRefreshTokenGrant(body: TokenRequest, requestId: string): Promise<any> {
  if (!body.refresh_token) {
    throw new Error('Missing refresh_token parameter');
  }

  logger.info('Processing refresh token grant', {
    requestId,
    clientId: body.client_id,
  });

  try {
    // Verify and decode refresh token
    const decoded = jwt.verify(body.refresh_token, JWT_SECRET) as any;

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Get user information
  const { users } = ensureContainers();
  const userDoc = await users.item(decoded.sub, decoded.sub).read();
    if (!userDoc.resource) {
      throw new Error('User not found');
    }

    const user: UserDocument = userDoc.resource;

    if (!user.isActive) {
      throw new Error('User account is inactive');
    }

    // Generate new access token
  const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tier: user.tier,
      reputation: user.reputationScore,
      iss: JWT_ISSUER,
      aud: body.client_id,
    };

    const accessToken = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      jwtid: crypto.randomUUID(),
    });

    logAuthAttempt(logger, true, user.id, 'Token refresh successful', requestId);

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 15 * 60, // 15 minutes in seconds
      scope: 'read write',
    };
  } catch (jwtError) {
    throw new Error('Invalid or expired refresh token');
  }
}
