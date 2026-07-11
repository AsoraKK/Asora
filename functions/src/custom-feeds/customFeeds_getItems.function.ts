/**
 * Get Custom Feed Items Function
 * 
 * GET /api/custom-feeds/{id}/items
 * 
 * Read posts that match the custom feed filters.
 * 
 * OpenAPI: customFeeds_getItems
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { CursorPaginatedPostView } from '@shared/types/openapi';
import { extractAuthContext } from '@shared/http/authContext';
import { getCustomFeedItems } from './customFeedsService';
import { mapHttpErrorToResponse } from './customFeedsHandlerUtils';
import {
  extractAuthorizedTestModeContext,
  TestModeAuthorizationError,
} from '@shared/testMode/testModeContext';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function clampLimit(value?: number): number {
  if (!value || Number.isNaN(value)) {
    return DEFAULT_LIMIT;
  }
  return Math.max(1, Math.min(value, MAX_LIMIT));
}

export const customFeeds_getItems = httpHandler<void, CursorPaginatedPostView>(async (ctx) => {
  const feedId = ctx.params.id;
  const requestedLimit = Number.parseInt(ctx.query.limit || String(DEFAULT_LIMIT), 10);
  const limit = clampLimit(requestedLimit);
  const cursor = ctx.query.cursor;

  ctx.context.log(
    `[customFeeds_getItems] Fetching items for custom feed ${feedId} [cursor=${cursor}, limit=${limit}] [${ctx.correlationId}]`
  );

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
    let testContext;
    try {
      testContext = extractAuthorizedTestModeContext(
        ctx.request,
        auth.token?.test_session,
        ctx.context
      );
    } catch (error) {
      if (error instanceof TestModeAuthorizationError) {
        return ctx.forbidden(error.message, error.code);
      }
      throw error;
    }

    const feedItems = await getCustomFeedItems(
      auth.userId,
      feedId,
      cursor,
      limit,
      auth.userId,
      testContext
    );
    return ctx.ok(feedItems);
  } catch (error) {
    const mapped = mapHttpErrorToResponse(ctx, error);
    if (mapped) {
      return mapped;
    }

    ctx.context.error(`[customFeeds_getItems] Error fetching custom feed items: ${error}`, {
      correlationId: ctx.correlationId,
    });
    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('customFeeds_getItems', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'custom-feeds/{id}/items',
  handler: customFeeds_getItems,
});
