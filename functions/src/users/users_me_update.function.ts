/**
 * Update Current User Profile Function
 * 
 * PATCH /api/users/me
 * 
 * Update the authenticated user's profile fields.
 * 
 * OpenAPI: users_me_update
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { UpdateUserProfileRequest, UserProfile } from '@shared/types/openapi';
import { extractAuthContext } from '@shared/http/authContext';
import { usersService } from '@auth/service/usersService';
import { profileService } from '@users/service/profileService';

export const users_me_update = httpHandler<UpdateUserProfileRequest, UserProfile>(async (ctx) => {
  ctx.context.log(`[users_me_update] Updating current user profile [${ctx.correlationId}]`);

  try {
    // Extract and verify JWT
    const auth = await extractAuthContext(ctx);

    // Validate request body
    const updates = ctx.body;
    if (!updates) {
      return ctx.badRequest('Request body is required', 'INVALID_REQUEST');
    }

    // Check if user exists in PostgreSQL
    const pgUser = await usersService.getUserById(auth.userId);
    if (!pgUser) {
      return ctx.notFound('User not found', 'USER_NOT_FOUND');
    }

    // Update Cosmos profile
    const profileUpdates: Record<string, unknown> = {};

    if (updates.displayName !== undefined) {
      profileUpdates.displayName = updates.displayName;
    }
    if (updates.bio !== undefined) {
      profileUpdates.bio = updates.bio;
    }
    if (updates.avatarUrl !== undefined) {
      profileUpdates.avatarUrl = updates.avatarUrl;
    }
    if (updates.preferences !== undefined) {
      profileUpdates.settings = updates.preferences;
    }

    let cosmosProfile = await profileService.getProfile(auth.userId);
    if (!cosmosProfile) {
      // Create profile if it doesn't exist
      cosmosProfile = await profileService.createProfile(
        auth.userId,
        updates.displayName || pgUser.display_name,
        updates.avatarUrl || pgUser.avatar_url
      );
    } else if (Object.keys(profileUpdates).length > 0) {
      // Update existing profile
      cosmosProfile = await profileService.updateProfile(auth.userId, profileUpdates);
    }

    // Optionally update PostgreSQL if displayName or avatarUrl changed
    let updatedPgUser = pgUser;
    if (updates.displayName !== undefined || updates.avatarUrl !== undefined) {
      updatedPgUser = await usersService.updateUser(
        auth.userId,
        updates.displayName,
        updates.avatarUrl
      ) || pgUser;
    }

    // Return merged UserProfile
    const userProfile: UserProfile = {
      id: updatedPgUser.id,
      displayName: cosmosProfile.displayName,
      bio: cosmosProfile.bio,
      avatarUrl: cosmosProfile.avatarUrl,
      tier: updatedPgUser.tier,
      roles: updatedPgUser.roles,
      reputation: 0,
      createdAt: updatedPgUser.created_at,
      updatedAt: updatedPgUser.updated_at,
    };

    return ctx.ok(userProfile);
  } catch (error) {
    ctx.context.error(`[users_me_update] Error updating user profile: ${error}`, { correlationId: ctx.correlationId });

    if (error instanceof Error) {
      if (error.message.includes('JWT verification failed') || error.message.includes('Missing Authorization')) {
        return ctx.unauthorized('Invalid or missing authorization', 'UNAUTHORIZED');
      }
    }

    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('users_me_update', {
  methods: ['PATCH'],
  authLevel: 'anonymous', // Auth is verified in handler via JWT extraction
  route: 'users/me',
  handler: users_me_update,
});
