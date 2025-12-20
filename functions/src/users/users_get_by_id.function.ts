/**
 * Get User Profile by ID Function
 * 
 * GET /api/users/{id}
 * 
 * Get a user's public profile by user ID.
 * 
 * OpenAPI: users_get_by_id
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { PublicUserProfile } from '@shared/types/openapi';
import { usersService } from '@auth/service/usersService';
import { profileService } from '@users/service/profileService';

export const users_get_by_id = httpHandler<void, PublicUserProfile>(async (ctx) => {
  const userId = ctx.params.id;
  ctx.context.log(`[users_get_by_id] Fetching user profile for ${userId} [${ctx.correlationId}]`);

  if (!userId) {
    return ctx.badRequest('User ID is required', 'INVALID_REQUEST');
  }

  try {
    // Fetch user from PostgreSQL (for tier and public information)
    ctx.context.log(`[users_get_by_id] Fetching from PostgreSQL for userId=${userId}`);
    let pgUser;
    try {
      pgUser = await usersService.getUserById(userId);
      ctx.context.log(`[users_get_by_id] PostgreSQL result: ${pgUser ? 'found' : 'not found'}`);
    } catch (pgError) {
      ctx.context.error(`[users_get_by_id] PostgreSQL error: ${pgError}`, { userId, correlationId: ctx.correlationId });
      throw pgError;
    }

    if (!pgUser) {
      return ctx.notFound('User not found', 'USER_NOT_FOUND');
    }

    // Fetch profile from Cosmos (for displayName, avatar, bio)
    ctx.context.log(`[users_get_by_id] Fetching from Cosmos profiles for userId=${userId}`);
    let cosmosProfile;
    try {
      cosmosProfile = await profileService.getProfile(userId);
      ctx.context.log(`[users_get_by_id] Cosmos result: ${cosmosProfile ? 'found' : 'not found'}`);
    } catch (cosmosError) {
      ctx.context.error(`[users_get_by_id] Cosmos error: ${cosmosError}`, { userId, correlationId: ctx.correlationId });
      throw cosmosError;
    }

    if (!cosmosProfile) {
      return ctx.notFound('User profile not found', 'PROFILE_NOT_FOUND');
    }

    // Build public profile (filter sensitive fields)
    const publicProfile: PublicUserProfile = {
      id: pgUser.id,
      displayName: cosmosProfile.displayName,
      bio: cosmosProfile.bio,
      avatarUrl: cosmosProfile.avatarUrl,
      tier: pgUser.tier,
      reputation: 0, // TODO: Fetch from reputation service if available
      badges: [], // TODO: Fetch from badges service if available
    };

    ctx.context.log(`[users_get_by_id] Successfully built profile for ${userId}`);
    return ctx.ok(publicProfile);
  } catch (error) {
    ctx.context.error(`[users_get_by_id] Unhandled error: ${error}`, { userId, correlationId: ctx.correlationId, stack: (error as Error).stack });
    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('users_get_by_id', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users/{id}',
  handler: users_get_by_id,
});
