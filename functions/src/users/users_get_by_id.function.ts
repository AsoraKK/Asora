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

export const users_get_by_id = httpHandler<void, PublicUserProfile>(async (ctx) => {
  const userId = ctx.params.id;
  ctx.context.log(`[users_get_by_id] Fetching user profile for ${userId} [${ctx.correlationId}]`);

  if (!userId) {
    return ctx.badRequest('User ID is required');
  }

  // TODO: Implement get user by ID logic
  // - Fetch public profile from Cosmos users container
  // - Filter sensitive fields (only return PublicUserProfile)
  // - Return 404 if user not found

  return ctx.notImplemented('users_get_by_id');
});

// Register HTTP trigger
app.http('users_get_by_id', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users/{id}',
  handler: users_get_by_id,
});
