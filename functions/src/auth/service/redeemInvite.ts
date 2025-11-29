/**
 * Redeem Invite Endpoint
 *
 * POST /auth/redeem-invite
 *
 * Allows an authenticated (but inactive) user to redeem an invite code.
 * On successful redemption:
 *   - The invite is marked as used
 *   - The user's isActive flag is set to true
 *   - A new access token is issued
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import type { Container } from '@azure/cosmos';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { getAzureLogger } from '@shared/utils/logger';
import { getCosmosClient } from '@shared/clients/cosmos';
import { redeemInvite, validateInvite } from './inviteStore';
import { storeRefreshToken } from './refreshTokenStore';
import type { TokenPayload, UserDocument } from '../types';

const logger = getAzureLogger('auth/redeemInvite');

const JWT_ISSUER = process.env.JWT_ISSUER || 'asora-auth';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || !secret.trim()) {
    throw new Error('Missing JWT_SECRET');
  }
  return secret;
}

let cachedUsersContainer: Container | null = null;

function getUsersContainer(): Container {
  if (cachedUsersContainer) {
    return cachedUsersContainer;
  }

  const client = getCosmosClient();
  const databaseName = process.env.COSMOS_DATABASE_NAME || 'asora';
  const database = client.database(databaseName);

  cachedUsersContainer = database.container('users');
  return cachedUsersContainer;
}

interface RedeemInviteRequest {
  inviteCode: string;
}

/**
 * Extract user info from Bearer token without full validation.
 * We allow this for inactive users who need to redeem invites.
 */
function decodeAccessToken(authHeader: string | null): { sub: string; email?: string } | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    return {
      sub: decoded.sub,
      email: decoded.email,
    };
  } catch {
    return null;
  }
}

export async function redeemInviteHandler(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'POST', ['POST']);
  if (cors.shouldReturn && cors.response) return cors.response;

  try {
    // Require authentication (but user may be inactive)
    const tokenInfo = decodeAccessToken(req.headers.get('authorization'));
    if (!tokenInfo) {
      return createErrorResponse(401, 'unauthorized', 'Valid access token required');
    }

    const userId = tokenInfo.sub;
    const userEmail = tokenInfo.email;

    // Parse request body
    const body = await req.json().catch(() => ({})) as RedeemInviteRequest;
    if (!body.inviteCode || typeof body.inviteCode !== 'string') {
      return createErrorResponse(400, 'invalid_request', 'inviteCode is required');
    }

    const inviteCode = body.inviteCode.toUpperCase().trim();
    if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(inviteCode)) {
      return createErrorResponse(400, 'invalid_code_format', 'Invalid invite code format. Expected: XXXX-XXXX');
    }

    // Get user document
    const usersContainer = getUsersContainer();
    const { resource: user } = await usersContainer.item(userId, userId).read<UserDocument>();

    if (!user) {
      logger.warn('User not found during invite redemption', { userId });
      return createErrorResponse(404, 'user_not_found', 'User not found');
    }

    // Check if user is already active
    if (user.isActive) {
      return createErrorResponse(400, 'already_active', 'User is already active');
    }

    // Validate the invite
    if (!userEmail) {
      return createErrorResponse(400, 'missing_email', 'User email is required for invite validation');
    }

    const validation = await validateInvite(inviteCode, userEmail);
    if (!validation.valid) {
      const errorMessages: Record<string, string> = {
        not_found: 'Invite code not found',
        expired: 'Invite code has expired',
        already_used: 'Invite code has already been used',
        email_mismatch: 'This invite code is not valid for your email address',
      };
      return createErrorResponse(400, validation.reason, errorMessages[validation.reason] || 'Invalid invite code');
    }

    // Redeem the invite
    const redemption = await redeemInvite({
      inviteCode,
      userId,
      userEmail,
    });

    if (!redemption.success) {
      logger.error('Failed to redeem invite', { inviteCode, userId, reason: redemption.reason });
      return createErrorResponse(500, 'redemption_failed', 'Failed to redeem invite');
    }

    // Activate the user
    await usersContainer.item(userId, userId).patch([
      { op: 'replace', path: '/isActive', value: true },
      { op: 'add', path: '/activatedAt', value: new Date().toISOString() },
      { op: 'add', path: '/activatedByInvite', value: inviteCode },
    ]);

    logger.info('User activated via invite', {
      userId,
      inviteCode,
      createdBy: redemption.invite.createdBy,
    });

    // Issue new tokens (user is now active)
    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tier: user.tier,
      reputation: user.reputationScore,
      iss: JWT_ISSUER,
    };

    const accessToken = jwt.sign(tokenPayload, getJwtSecret(), {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      jwtid: crypto.randomUUID(),
    });

    const refreshJti = crypto.randomUUID();
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const refreshToken = jwt.sign(
      { sub: user.id, iss: JWT_ISSUER, type: 'refresh' },
      getJwtSecret(),
      {
        expiresIn: REFRESH_TOKEN_EXPIRY,
        jwtid: refreshJti,
      }
    );

    await storeRefreshToken(refreshJti, user.id, refreshExpiresAt);

    return createSuccessResponse({
      message: 'Invite redeemed successfully',
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 15 * 60,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tier: user.tier,
        isActive: true,
      },
    });
  } catch (error) {
    logger.error('Invite redemption failed', { error });
    return createErrorResponse(500, 'internal_error', 'Failed to redeem invite');
  }
}

// Route registration
app.http('auth-redeem-invite', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'auth/redeem-invite',
  handler: redeemInviteHandler,
});

// For testing
export function resetUsersContainerCache(): void {
  cachedUsersContainer = null;
}
