/**
 * Delete Custom Feed Function
 * 
 * DELETE /api/custom-feeds/{id}
 * 
 * Delete a custom feed.
 * 
 * OpenAPI: customFeeds_delete
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { extractAuthContext } from '@shared/http/authContext';
import { deleteCustomFeed } from './customFeedsService';
import { mapHttpErrorToResponse } from './customFeedsHandlerUtils';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForRoute } from '@rate-limit/policies';

export const customFeeds_delete = httpHandler<void, void>(async (ctx) => {
  const feedId = ctx.params.id;
  ctx.context.log(`[customFeeds_delete] Deleting custom feed ${feedId} [${ctx.correlationId}]`);

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
    const deleted = await deleteCustomFeed(auth.userId, feedId);
    if (!deleted) {
      return ctx.notFound('Custom feed not found', 'CUSTOM_FEED_NOT_FOUND');
    }
    return ctx.noContent();
  } catch (error) {
    const mapped = mapHttpErrorToResponse(ctx, error);
    if (mapped) {
      return mapped;
    }
    ctx.context.error(`[customFeeds_delete] Error deleting custom feed: ${error}`, {
      correlationId: ctx.correlationId,
    });
    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('customFeeds_delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous', // TODO: Change to 'function' and add requireAuth middleware
  route: 'custom-feeds/{id}',
  handler: withRateLimit(customFeeds_delete, (req) => getPolicyForRoute(req)),
});
