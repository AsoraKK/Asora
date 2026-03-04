/**
 * Get Appeal Details Function
 * 
 * GET /api/appeals/{id}
 * 
 * View appeal details and community votes.
 * 
 * OpenAPI: appeals_getById
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { AppealDetailsResponse } from '@shared/types/openapi';
import { extractAuthContext } from '@shared/http/authContext';
import { getAppealById } from './appealsService';

export const appeals_getById = httpHandler<void, AppealDetailsResponse>(async (ctx) => {
  const appealId = ctx.params.id;
  ctx.context.log(`[appeals_getById] Fetching appeal ${appealId} [${ctx.correlationId}]`);

  if (!appealId) {
    return ctx.badRequest('Appeal ID is required');
  }

  try {
    await extractAuthContext(ctx);
  } catch {
    return ctx.unauthorized('Invalid or missing authorization', 'UNAUTHORIZED');
  }

  try {
    const details = await getAppealById(appealId);
    if (!details) {
      return ctx.notFound('Appeal not found', 'APPEAL_NOT_FOUND');
    }
    return ctx.ok(details);
  } catch (error) {
    ctx.context.error(`[appeals_getById] Error fetching appeal: ${error}`, { correlationId: ctx.correlationId });
    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('appeals_getById', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'appeals/{id}',
  handler: appeals_getById,
});
