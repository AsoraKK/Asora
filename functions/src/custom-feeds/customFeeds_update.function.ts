/**
 * Update Custom Feed Function
 * 
 * PATCH /api/custom-feeds/{id}
 * 
 * Update filters or home flag for a custom feed.
 * 
 * OpenAPI: customFeeds_update
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { UpdateCustomFeedRequest, CustomFeedDefinition } from '@shared/types/openapi';
import { extractAuthContext } from '@shared/http/authContext';
import { updateCustomFeed } from './customFeedsService';
import { mapHttpErrorToResponse } from './customFeedsHandlerUtils';

export const customFeeds_update = httpHandler<UpdateCustomFeedRequest, CustomFeedDefinition>(async (ctx) => {
  const feedId = ctx.params.id;
  ctx.context.log(`[customFeeds_update] Updating custom feed ${feedId} [${ctx.correlationId}]`);

  if (!feedId) {
    return ctx.badRequest('Feed ID is required');
  }

  if (!ctx.body) {
    return ctx.badRequest('Request body is required');
  }

  let auth;
  try {
    auth = await extractAuthContext(ctx);
  } catch {
    return ctx.unauthorized('Invalid or missing authorization', 'UNAUTHORIZED');
  }

  try {
    const updated = await updateCustomFeed(auth.userId, feedId, ctx.body);
    if (!updated) {
      return ctx.notFound('Custom feed not found', 'CUSTOM_FEED_NOT_FOUND');
    }
    return ctx.ok(updated);
  } catch (error) {
    const mapped = mapHttpErrorToResponse(ctx, error);
    if (mapped) {
      return mapped;
    }
    ctx.context.error(`[customFeeds_update] Error updating custom feed: ${error}`, {
      correlationId: ctx.correlationId,
    });
    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('customFeeds_update', {
  methods: ['PATCH'],
  authLevel: 'anonymous', // TODO: Change to 'function' and add requireAuth middleware
  route: 'custom-feeds/{id}',
  handler: customFeeds_update,
});
