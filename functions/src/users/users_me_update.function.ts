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
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForRoute } from '@rate-limit/policies';
import {
  isTrustPassportVisibility,
  profileService,
} from '@users/service/profileService';
import { moderateProfileUpdates } from '@users/service/profileModerationService';

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

    const moderation = await moderateProfileUpdates(
      auth.userId,
      {
        displayName: updates.displayName,
        username: updates.username,
        bio: updates.bio,
      },
      ctx.context
    );

    if (!moderation.allowed) {
      return ctx.badRequest(
        'Profile update violates policy and cannot be published right now.',
        'PROFILE_CONTENT_BLOCKED',
        {
          fields: moderation.blockedFields,
          categories: moderation.categories,
          appealEligible: true,
        }
      );
    }

    let cosmosProfile = await profileService.getProfile(auth.userId);

    const trustPassportVisibility = updates.trustPassportVisibility;
    if (
      trustPassportVisibility !== undefined &&
      !isTrustPassportVisibility(trustPassportVisibility)
    ) {
      return ctx.badRequest(
        'Invalid trust passport visibility value',
        'INVALID_TRUST_PASSPORT_VISIBILITY'
      );
    }

    // Update Cosmos profile
    const profileUpdates: Record<string, unknown> = {};

    if (updates.displayName !== undefined) {
      profileUpdates.displayName = updates.displayName;
    }
    if (updates.username !== undefined) {
      profileUpdates.username = updates.username;
    }
    if (updates.bio !== undefined) {
      profileUpdates.bio = updates.bio;
    }
    if (updates.avatarUrl !== undefined) {
      profileUpdates.avatarUrl = updates.avatarUrl;
    }

    if (
      updates.preferences !== undefined ||
      trustPassportVisibility !== undefined
    ) {
      const incomingSettings: Record<string, unknown> = {};
      if (updates.preferences && typeof updates.preferences === 'object') {
        Object.assign(incomingSettings, updates.preferences);
      }
      if (trustPassportVisibility !== undefined) {
        incomingSettings.trustPassportVisibility = trustPassportVisibility;
      }

      profileUpdates.settings = {
        ...(cosmosProfile?.settings ?? {}),
        ...incomingSettings,
      };
    }

    if (!cosmosProfile) {
      // Create profile if it doesn't exist
      cosmosProfile = await profileService.createProfile(
        auth.userId,
        updates.displayName || 'User',
        updates.avatarUrl,
        updates.username
      );
    } else if (Object.keys(profileUpdates).length > 0) {
      // Update existing profile
      cosmosProfile = await profileService.updateProfile(auth.userId, profileUpdates);
    }

    // PostgreSQL doesn't store display/avatar, only Cosmos does
    // No need to update PG for these fields

    // Return merged UserProfile
    const userProfile: UserProfile = {
      id: pgUser.id,
      displayName: cosmosProfile.displayName,
      username: cosmosProfile.username,
      bio: cosmosProfile.bio,
      avatarUrl: cosmosProfile.avatarUrl,
      tier: pgUser.tier,
      roles: pgUser.roles,
      reputation: pgUser.reputation_score,
      createdAt: pgUser.created_at,
      updatedAt: pgUser.updated_at,
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
  handler: withRateLimit(users_me_update, (req) => getPolicyForRoute(req)),
});
