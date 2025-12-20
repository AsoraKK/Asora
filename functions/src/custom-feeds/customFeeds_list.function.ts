/**
 * List Custom Feeds Function
 * 
 * GET /api/custom-feeds
 * 
 * List the authenticated user's custom feeds within tier limits.
 * 
 * OpenAPI: customFeeds_list
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { CustomFeedListResponse } from '@shared/types/openapi';
import { extractAuthContext } from '@shared/http/authContext';
import { listCustomFeeds } from './customFeedsService';
import { mapHttpErrorToResponse } from './customFeedsHandlerUtils';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function clampLimit(value?: number): number {
  if (!value || Number.isNaN(value)) {
    return DEFAULT_LIMIT;
  }
  return Math.max(1, Math.min(value, MAX_LIMIT));
}

export const customFeeds_list = httpHandler<void, CustomFeedListResponse>(async (ctx) => {
  const cursor = ctx.query.cursor;
  const requestedLimit = Number.parseInt(ctx.query.limit || String(DEFAULT_LIMIT), 10);
  const limit = clampLimit(requestedLimit);

  ctx.context.log(
    `[customFeeds_list] Listing custom feeds [cursor=${cursor}, limit=${limit}] [${ctx.correlationId}]`
  );

  let auth;
  try {
    auth = await extractAuthContext(ctx);
  } catch {
    return ctx.unauthorized('Invalid or missing authorization', 'UNAUTHORIZED');
  }

  try {
    const { feeds, nextCursor } = await listCustomFeeds(
      auth.userId,
      cursor,
      limit
    );
    return ctx.ok({
      items: feeds,
      nextCursor,
    });
  } catch (error) {
    const mapped = mapHttpErrorToResponse(ctx, error);
    if (mapped) {
      return mapped;
    }
    ctx.context.error(`[customFeeds_list] Error listing custom feeds: ${error}`, {
      correlationId: ctx.correlationId,
    });
    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('customFeeds_list', {
  methods: ['GET'],
  authLevel: 'anonymous', // TODO: Change to 'function' and add requireAuth middleware
  route: 'custom-feeds',
  handler: customFeeds_list,
});
