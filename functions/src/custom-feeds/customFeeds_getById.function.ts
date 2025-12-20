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
import { extractAuthContext } from '@shared/http/authContext';
import { getCustomFeed } from './customFeedsService';
import { mapHttpErrorToResponse } from './customFeedsHandlerUtils';

export const customFeeds_getById = httpHandler<void, CustomFeedDefinition>(async (ctx) => {
  const feedId = ctx.params.id;
  ctx.context.log(`[customFeeds_getById] Fetching custom feed ${feedId} [${ctx.correlationId}]`);

  if (!feedId) {
    return ctx.badRequest('Feed ID is required');
  }

  let auth;
  try {
    auth = await extractAuthContext(ctx);
  } catch {
    return ctx.unauthorized('Invalid or missing authorization', 'UNAUTHORIZED');
  }

  try {
    const feed = await getCustomFeed(auth.userId, feedId);
    if (!feed) {
      return ctx.notFound('Custom feed not found', 'CUSTOM_FEED_NOT_FOUND');
    }
    return ctx.ok(feed);
  } catch (error) {
    const mapped = mapHttpErrorToResponse(ctx, error);
    if (mapped) {
      return mapped;
    }
    ctx.context.error(`[customFeeds_getById] Error fetching custom feed: ${error}`, {
      correlationId: ctx.correlationId,
    });
    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('customFeeds_getById', {
  methods: ['GET'],
  authLevel: 'anonymous', // TODO: Change to 'function' and add requireAuth middleware
  route: 'custom-feeds/{id}',
  handler: customFeeds_getById,
});
