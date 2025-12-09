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

export const users_me_get = httpHandler<void, UserProfile>(async (ctx) => {
  ctx.context.log(`[users_me_get] Fetching current user profile [${ctx.correlationId}]`);

  // TODO: Implement get current user logic
  // - Extract user ID from JWT (sub claim)
  // - Fetch user from PostgreSQL users table (identity, roles, tier)
  // - Fetch profile from Cosmos users container (displayName, bio, avatar, preferences)
  // - Merge and return UserProfile

  return ctx.notImplemented('users_me_get');
});

// Register HTTP trigger
app.http('users_me_get', {
  methods: ['GET'],
  authLevel: 'anonymous', // TODO: Change to 'function' and add requireAuth middleware
  route: 'users/me',
  handler: users_me_get,
});
