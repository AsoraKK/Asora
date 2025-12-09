/**
 * Get Custom Feed by ID Function
 * 
 * GET /api/custom-feeds/{id}
 * 
 * Retrieve a custom feed definition by ID.
 * 
 * OpenAPI: customFeeds_getById
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { CustomFeedDefinition } from '@shared/types/openapi';

export const customFeeds_getById = httpHandler<void, CustomFeedDefinition>(async (ctx) => {
  const feedId = ctx.params.id;
  ctx.context.log(`[customFeeds_getById] Fetching custom feed ${feedId} [${ctx.correlationId}]`);

  if (!feedId) {
    return ctx.badRequest('Feed ID is required');
  }

  // TODO: Implement get custom feed by ID logic
  // - Extract user ID from JWT
  // - Fetch feed from Cosmos custom_feeds container
  // - Verify current user is the owner (ownerId matches user ID)
  // - Return CustomFeedDefinition
  // - Return 404 if feed not found
  // - Return 403 if user is not the owner

  return ctx.notImplemented('customFeeds_getById');
});

// Register HTTP trigger
app.http('customFeeds_getById', {
  methods: ['GET'],
  authLevel: 'anonymous', // TODO: Change to 'function' and add requireAuth middleware
  route: 'custom-feeds/{id}',
  handler: customFeeds_getById,
});
