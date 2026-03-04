/**
 * Auth Token Refresh Function
 * 
 * POST /api/auth/refresh
 * 
 * Rotate an access token pair using a refresh token.
 * 
 * OpenAPI: auth_token_refresh
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { RefreshTokenRequest, RefreshTokenResponse } from '@shared/types/openapi';
import { refreshTokensWithRotation } from '@auth/service/tokenService';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';

export const auth_token_refresh = httpHandler<RefreshTokenRequest, RefreshTokenResponse>(async (ctx) => {
  ctx.context.log(`[auth_token_refresh] Processing token refresh request [${ctx.correlationId}]`);

  if (!ctx.body) {
    return ctx.badRequest('Request body is required', 'INVALID_REQUEST');
  }

  const { refresh_token } = ctx.body;

  if (!refresh_token) {
    return ctx.badRequest('refresh_token is required', 'INVALID_REQUEST');
  }

  try {
    const clientId = process.env.AUTH_REFRESH_CLIENT_ID || 'lythaus-mobile';
    const {
      access_token,
      refresh_token: new_refresh_token,
      expires_in,
      scope,
    } = await refreshTokensWithRotation(
      refresh_token,
      clientId,
      ctx.correlationId
    );

    return ctx.ok({
      access_token,
      refresh_token: new_refresh_token,
      token_type: 'Bearer',
      expires_in,
      scope,
    });
  } catch (error) {
    ctx.context.error(`[auth_token_refresh] Token verification failed: ${error}`, { correlationId: ctx.correlationId });

    if (error instanceof Error) {
      if (error.message.toLowerCase().includes('expired')) {
        return ctx.unauthorized('Refresh token expired', 'TOKEN_EXPIRED');
      }
      if (error.message.toLowerCase().includes('revoked')) {
        return ctx.unauthorized('Refresh token revoked', 'TOKEN_REVOKED');
      }
      if (error.message.toLowerCase().includes('invalid')) {
        return ctx.unauthorized('Invalid refresh token', 'INVALID_TOKEN');
      }
    }

    return ctx.internalError(error as Error);
  }
});

const rateLimitedAuthTokenRefresh = withRateLimit(
  auth_token_refresh,
  () => getPolicyForFunction('auth-token-refresh')
);

// Register HTTP trigger
app.http('auth_token_refresh', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/refresh',
  handler: rateLimitedAuthTokenRefresh,
});
