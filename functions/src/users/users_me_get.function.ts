/**
 * Get Current User Profile Function
 * 
 * GET /api/users/me
 * 
 * Get the authenticated user's profile (merged from PostgreSQL + Cosmos).
 * 
 * OpenAPI: users_me_get
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { UserProfile } from '@shared/types/openapi';
import { extractAuthContext } from '@shared/http/authContext';
import { usersService } from '@auth/service/usersService';
import { profileService } from '@users/service/profileService';

export const users_me_get = httpHandler<void, UserProfile>(async (ctx) => {
  ctx.context.log(`[users_me_get] Fetching current user profile [${ctx.correlationId}]`);

  try {
    // Extract and verify JWT
    const auth = await extractAuthContext(ctx);

    // Fetch user from PostgreSQL (identity, roles, tier)
    const pgUser = await usersService.getUserById(auth.userId);
    if (!pgUser) {
      return ctx.notFound('User not found', 'USER_NOT_FOUND');
    }

    // Fetch profile from Cosmos (displayName, bio, avatar, preferences)
    const cosmosProfile = await profileService.getProfile(auth.userId);
    if (!cosmosProfile) {
      return ctx.notFound('User profile not found', 'PROFILE_NOT_FOUND');
    }

    // Merge and return UserProfile
    const userProfile: UserProfile = {
      id: pgUser.id,
      displayName: cosmosProfile.displayName,
      username: cosmosProfile.username,
      bio: cosmosProfile.bio,
      avatarUrl: cosmosProfile.avatarUrl,
      tier: pgUser.tier,
      roles: pgUser.roles,
      reputation: 0, // TODO: Fetch from reputation service if available
      createdAt: pgUser.created_at,
      updatedAt: pgUser.updated_at,
    };

    return ctx.ok(userProfile);
  } catch (error) {
    ctx.context.error(`[users_me_get] Error fetching user profile: ${error}`, { correlationId: ctx.correlationId });

    if (error instanceof Error) {
      if (error.message.includes('JWT verification failed') || error.message.includes('Missing Authorization')) {
        return ctx.unauthorized('Invalid or missing authorization', 'UNAUTHORIZED');
      }
    }

    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('users_me_get', {
  methods: ['GET'],
  authLevel: 'anonymous', // Auth is verified in handler via JWT extraction
  route: 'users/me',
  handler: users_me_get,
});
