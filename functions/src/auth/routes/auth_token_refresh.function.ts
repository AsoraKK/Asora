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
import { jwtService } from '@auth/service/jwtService';

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
    // Verify the refresh token signature and expiration
    const payload = await jwtService.verifyToken(refresh_token);

    // Generate new token pair using the same user claims
    const { access_token, refresh_token: new_refresh_token, expires_in } = await jwtService.generateTokenPair(
      payload.sub,
      payload.roles,
      payload.tier
    );

    return ctx.ok({
      access_token,
      refresh_token: new_refresh_token,
      token_type: 'Bearer',
      expires_in,
    });
  } catch (error) {
    ctx.context.error(`[auth_token_refresh] Token verification failed: ${error}`, { correlationId: ctx.correlationId });

    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        return ctx.unauthorized('Refresh token expired', 'TOKEN_EXPIRED');
      }
      if (error.message.includes('verification')) {
        return ctx.unauthorized('Invalid refresh token', 'INVALID_TOKEN');
      }
    }

    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('auth_token_refresh', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/refresh',
  handler: auth_token_refresh,
});
