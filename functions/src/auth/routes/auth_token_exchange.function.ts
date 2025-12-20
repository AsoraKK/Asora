/**
 * Auth Token Exchange Function
 * 
 * POST /api/auth/token
 * 
 * Exchange provider code or email magic link for JWT access token.
 * 
 * OpenAPI: auth_token_exchange
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { AuthTokenRequest, AuthTokenResponse, UserProfile } from '@shared/types/openapi';
import { usersService } from '@auth/service/usersService';
import { profileService } from '@users/service/profileService';
import { jwtService } from '@auth/service/jwtService';

export const auth_token_exchange = httpHandler<AuthTokenRequest, AuthTokenResponse>(async (ctx) => {
  ctx.context.log(`[auth_token_exchange] Processing token exchange request [${ctx.correlationId}]`);

  if (!ctx.body) {
    return ctx.badRequest('Request body is required', 'INVALID_REQUEST');
  }

  const { grant_type, code, provider, redirect_uri } = ctx.body;

  // Validate required fields
  if (!grant_type) {
    return ctx.badRequest('grant_type is required', 'INVALID_GRANT_TYPE');
  }

  if (grant_type === 'authorization_code') {
    if (!code || !provider) {
      return ctx.badRequest('code and provider are required for authorization_code grant', 'INVALID_REQUEST');
    }

    // TODO: Implement provider OAuth verification
    // For now, we'll use the code and provider as provider_sub
    // In production, verify with the OAuth provider (Google, Apple, etc.)
    const provider_sub = code;

    try {
      // Get or create user via provider
      const [pgUser, isNewUser] = await usersService.getOrCreateUserByProvider(
        provider,
        provider_sub,
        `${provider}-${provider_sub}@asora.local` // Placeholder email
      );

      // Ensure profile exists in Cosmos (displayName/avatarUrl come from profile, not PG)
      const profile = await profileService.ensureProfile(
        pgUser.id,
        `${provider} User`, // Placeholder display name
        undefined // No avatar by default
      );

      // Generate token pair
      const { access_token, refresh_token, expires_in } = await jwtService.generateTokenPair(
        pgUser.id,
        pgUser.roles,
        pgUser.tier
      );

      const userResponse: UserProfile = {
        id: pgUser.id,
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        tier: pgUser.tier,
        roles: pgUser.roles,
        reputation: pgUser.reputation_score,
        createdAt: pgUser.created_at,
        updatedAt: pgUser.updated_at,
      };

      return ctx.ok({
        access_token,
        refresh_token,
        token_type: 'Bearer',
        expires_in,
        user: userResponse,
      });
    } catch (error) {
      ctx.context.error(`[auth_token_exchange] Error during token exchange: ${error}`, { correlationId: ctx.correlationId });
      return ctx.internalError(error as Error);
    }
  }

  return ctx.badRequest(`Unsupported grant_type: ${grant_type}`, 'UNSUPPORTED_GRANT_TYPE');
});

// Register HTTP trigger
app.http('auth_token_exchange', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/token',
  handler: auth_token_exchange,
});
