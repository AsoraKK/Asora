/**
 * Create Custom Feed Function
 * 
 * POST /api/custom-feeds
 * 
 * Create a new custom feed definition.
 * 
 * OpenAPI: customFeeds_create
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { CreateCustomFeedRequest, CustomFeedDefinition } from '@shared/types/openapi';
import { extractAuthContext } from '@shared/http/authContext';
import { createCustomFeed } from './customFeedsService';
import { mapHttpErrorToResponse } from './customFeedsHandlerUtils';

export const customFeeds_create = httpHandler<CreateCustomFeedRequest, CustomFeedDefinition>(async (ctx) => {
  ctx.context.log(`[customFeeds_create] Creating custom feed [${ctx.correlationId}]`);

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
    const feed = await createCustomFeed(auth.userId, ctx.body, auth.tier);
    return ctx.created(feed);
  } catch (error) {
    const mapped = mapHttpErrorToResponse(ctx, error);
    if (mapped) {
      return mapped;
    }

    ctx.context.error(`[customFeeds_create] Error creating custom feed: ${error}`, {
      correlationId: ctx.correlationId,
    });
    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('customFeeds_create', {
  methods: ['POST'],
  authLevel: 'anonymous', // TODO: Change to 'function' and add requireAuth middleware
  route: 'custom-feeds',
  handler: customFeeds_create,
});
