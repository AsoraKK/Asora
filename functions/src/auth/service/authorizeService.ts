/// ASORA AUTH - AUTHORIZATION ENDPOINT
///
/// Purpose: OAuth2 authorization endpoint with PKCE support
/// Architecture: Azure Function implementing OAuth2 authorization endpoint
/// Security: PKCE parameter validation, state management, redirect URI validation
/// Database: Session storage and user lookup
/// OAuth2: Authorization code generation with PKCE challenge storage

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import type { Container } from '@azure/cosmos';
import { createErrorResponse } from '@shared/utils/http';
import { validateText } from '@shared/utils/validate';
import { getAzureLogger } from '@shared/utils/logger';
import type { AuthorizeRequest } from '@auth/types';
import * as crypto from 'crypto';
import { getCosmosClient } from '@shared/clients/cosmos';

const logger = getAzureLogger('auth/authorize');

type AuthContainers = {
  users: Container;
  sessions: Container;
};

let cachedContainers: AuthContainers | null = null;

function ensureContainers(): AuthContainers {
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

// OAuth2 configuration
const AUTHORIZATION_CODE_TTL = 10 * 60 * 1000; // 10 minutes
const SUPPORTED_RESPONSE_TYPES = ['code'];
const SUPPORTED_CODE_CHALLENGE_METHODS = ['S256'];

export async function authorizeHandler(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startTime = Date.now();

  try {
    logger.info('Authorization request started', {
      requestId: context.invocationId,
      method: req.method,
      userAgent: req.headers.get('user-agent'),
    });

    // Parse query parameters
    const queryParams = Object.fromEntries(req.query.entries());
    const authRequest = parseAuthorizeRequest(queryParams);

    // Validate the authorization request
    const validationError = validateAuthorizeRequest(authRequest);
    if (validationError) {
      return createAuthError(
        authRequest.redirect_uri,
        authRequest.state,
        'invalid_request',
        validationError
      );
    }

    logger.info('Authorization request validated', {
      requestId: context.invocationId,
      clientId: authRequest.client_id,
      responseType: authRequest.response_type,
      redirectUri: authRequest.redirect_uri,
    });

    // In a real implementation, this is where you would:
    // 1. Check if user is already authenticated (session/cookie)
    // 2. If not authenticated, redirect to login page
    // 3. If authenticated, check if user has consented to the requested scopes
    // 4. If not consented, show consent page
    // 5. Generate authorization code and redirect

    // For this implementation, we'll simulate an authenticated user
    // In production, you would get the user ID from the authenticated session
    const userId = authRequest.user_id || 'demo-user-123'; // Temporary for testing

    // Verify user exists
    const userExists = await verifyUserExists(userId);
    if (!userExists) {
      return createAuthError(
        authRequest.redirect_uri,
        authRequest.state,
        'access_denied',
        'User not found or not authorized'
      );
    }

    // Generate authorization code
    const authorizationCode = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + AUTHORIZATION_CODE_TTL);

    // Store the authorization session
    const session = {
      id: crypto.randomUUID(),
      partitionKey: authRequest.client_id,
      state: authRequest.state,
      nonce: authRequest.nonce || '',
      codeChallenge: authRequest.code_challenge,
      codeChallengeMethod: authRequest.code_challenge_method,
      redirectUri: authRequest.redirect_uri,
      clientId: authRequest.client_id,
      userId,
      authorizationCode,
      scope: authRequest.scope || 'read write',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      used: false,
    };

    const { sessions } = ensureContainers();
    await sessions.items.create(session);

    logger.info('Authorization code generated', {
      requestId: context.invocationId,
      sessionId: session.id,
      userId,
      clientId: authRequest.client_id,
      expiresAt: expiresAt.toISOString(),
    });

    // Build redirect URL with authorization code
    const redirectUrl = new URL(authRequest.redirect_uri);
    redirectUrl.searchParams.set('code', authorizationCode);
    redirectUrl.searchParams.set('state', authRequest.state);

    const duration = Date.now() - startTime;

    logger.info('Authorization request completed successfully', {
      requestId: context.invocationId,
      duration,
      redirectTo: authRequest.redirect_uri,
    });

    // Return redirect response
    return {
      status: 302,
      headers: {
        Location: redirectUrl.toString(),
        'Cache-Control': 'no-cache, no-store',
        Pragma: 'no-cache',
      },
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error('Authorization request failed', {
      requestId: context.invocationId,
      error: errorMessage,
      stack: errorStack,
      duration,
    });

    if (error instanceof Error && error.message.includes('Missing Cosmos DB configuration')) {
      return createErrorResponse(503, 'Service unavailable', 'Cosmos DB configuration missing');
    }

    // Try to return error to redirect URI if possible
    const queryParams = Object.fromEntries(req.query.entries());
    if (queryParams.redirect_uri && queryParams.state) {
      return createAuthError(
        queryParams.redirect_uri,
        queryParams.state,
        'server_error',
        'Internal server error'
      );
    }

    return createErrorResponse(
      500,
      'Authorization failed',
      process.env.NODE_ENV === 'development' ? errorMessage : undefined
    );
  }
}

function parseAuthorizeRequest(params: any): AuthorizeRequest {
  return {
    response_type: params.response_type || '',
    client_id: params.client_id || '',
    redirect_uri: params.redirect_uri || '',
    scope: params.scope,
    state: params.state || '',
    nonce: params.nonce,
    code_challenge: params.code_challenge || '',
    code_challenge_method: params.code_challenge_method || '',
    user_id: params.user_id, // For testing only
  };
}

function validateAuthorizeRequest(request: AuthorizeRequest): string | null {
  // Validate response_type
  if (!SUPPORTED_RESPONSE_TYPES.includes(request.response_type)) {
    return `Unsupported response_type. Supported types: ${SUPPORTED_RESPONSE_TYPES.join(', ')}`;
  }

  // Validate client_id
  const clientIdValidation = validateText(request.client_id, 1, 100);
  if (!clientIdValidation.valid) {
    return 'Invalid client_id parameter';
  }

  // Validate redirect_uri
  try {
    new URL(request.redirect_uri);
  } catch {
    return 'Invalid redirect_uri parameter';
  }

  // Validate state parameter (required for security)
  const stateValidation = validateText(request.state, 1, 255);
  if (!stateValidation.valid) {
    return 'State parameter is required and must be 1-255 characters';
  }

  // Validate PKCE parameters
  if (!request.code_challenge) {
    return 'code_challenge parameter is required';
  }

  if (!SUPPORTED_CODE_CHALLENGE_METHODS.includes(request.code_challenge_method)) {
    return `Unsupported code_challenge_method. Supported methods: ${SUPPORTED_CODE_CHALLENGE_METHODS.join(', ')}`;
  }

  // Validate code challenge format (base64url, 43-128 characters)
  if (request.code_challenge.length < 43 || request.code_challenge.length > 128) {
    return 'code_challenge must be 43-128 characters';
  }

  if (!/^[A-Za-z0-9\-_]+$/.test(request.code_challenge)) {
    return 'code_challenge must be base64url encoded';
  }

  return null;
}

async function verifyUserExists(userId: string): Promise<boolean> {
  try {
  const { users } = ensureContainers();
  const userDoc = await users.item(userId, userId).read();
    return !!userDoc.resource && userDoc.resource.isActive !== false;
  } catch (error) {
    logger.warn('Error verifying user existence', { userId, error });
    return false;
  }
}

function createAuthError(
  redirectUri: string,
  state: string,
  error: string,
  errorDescription?: string
): HttpResponseInit {
  try {
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set('error', error);
    redirectUrl.searchParams.set('state', state);
    if (errorDescription) {
      redirectUrl.searchParams.set('error_description', errorDescription);
    }

    return {
      status: 302,
      headers: {
        Location: redirectUrl.toString(),
        'Cache-Control': 'no-cache, no-store',
      },
    };
  } catch {
    // If redirect URI is invalid, return direct error response
    return createErrorResponse(400, error, errorDescription);
  }
}
