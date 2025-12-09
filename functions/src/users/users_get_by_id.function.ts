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
    const pgUser = await usersService.getUserById(userId);
    if (!pgUser) {
      return ctx.notFound('User not found', 'USER_NOT_FOUND');
    }

    // Fetch profile from Cosmos (for displayName, avatar, bio)
    const cosmosProfile = await profileService.getProfile(userId);
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

    return ctx.ok(publicProfile);
  } catch (error) {
    ctx.context.error(`[users_get_by_id] Error fetching user profile: ${error}`, { correlationId: ctx.correlationId });
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
