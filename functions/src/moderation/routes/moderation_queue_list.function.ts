/**
 * Moderation Queue List Function
 * 
 * GET /api/moderation/queue
 * 
 * List pending moderation cases filtered for the authenticated reviewer.
 * 
 * OpenAPI: moderation_queue_list
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { extractAuthContext } from '@shared/http/authContext';
import { hasModeratorRole } from '@moderation/moderationService';
import { getReviewQueueHandler } from '@moderation/service/reviewQueueService';
import type { ModerationCaseListResponse } from '@shared/types/openapi';

const MAX_LIMIT = 50;

function clampLimit(value?: number): number {
  if (!value || Number.isNaN(value)) {
    return 25;
  }
  return Math.max(1, Math.min(MAX_LIMIT, value));
}

export const moderation_queue_list = httpHandler<void, ModerationCaseListResponse>(async (ctx) => {
  const cursor = ctx.query.cursor;
  const requestedLimit = Number.parseInt(ctx.query.limit || '25', 10);
  const limit = clampLimit(requestedLimit);

  ctx.context.log(
    `[moderation_queue_list] Fetching moderation queue [cursor=${cursor}, limit=${limit}] [${ctx.correlationId}]`
  );

  let auth;
  try {
    auth = await extractAuthContext(ctx);
  } catch {
    return ctx.unauthorized('Invalid or missing authorization', 'UNAUTHORIZED');
  }

  if (!hasModeratorRole(auth.roles)) {
    return ctx.forbidden('Moderator role required', 'FORBIDDEN');
  }

  const response = await getReviewQueueHandler({
    context: ctx.context,
    limit,
    continuationToken: cursor,
  });
  return response;
});

// Register HTTP trigger
app.http('moderation_queue_list', {
  methods: ['GET'],
  authLevel: 'anonymous', // TODO: Change to 'function' and add requireAuth + requireRoles middleware
  route: 'moderation/queue',
  handler: moderation_queue_list,
});
