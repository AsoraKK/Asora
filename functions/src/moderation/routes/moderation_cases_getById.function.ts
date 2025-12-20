/**
 * Moderation Case Details Function
 * 
 * GET /api/moderation/cases/{id}
 * 
 * Fetch details of a single moderation case.
 * 
 * OpenAPI: moderation_cases_getById
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { ModerationCaseResponse } from '@shared/types/openapi';
import { extractAuthContext } from '@shared/http/authContext';
import { getModerationCaseById, hasModeratorRole } from '@moderation/moderationService';

export const moderation_cases_getById = httpHandler<void, ModerationCaseResponse>(async (ctx) => {
  const caseId = ctx.params.id;
  ctx.context.log(`[moderation_cases_getById] Fetching moderation case ${caseId} [${ctx.correlationId}]`);

  if (!caseId) {
    return ctx.badRequest('Case ID is required');
  }

  let auth;
  try {
    auth = await extractAuthContext(ctx);
  } catch {
    return ctx.unauthorized('Invalid or missing authorization', 'UNAUTHORIZED');
  }

  if (!hasModeratorRole(auth.roles)) {
    return ctx.forbidden('Moderator role required', 'FORBIDDEN');
  }

  try {
    const result = await getModerationCaseById(caseId);
    if (!result) {
      return ctx.notFound('Moderation case not found', 'CASE_NOT_FOUND');
    }
    return ctx.ok(result);
  } catch (error) {
    ctx.context.error(`[moderation_cases_getById] Error: ${error}`, { correlationId: ctx.correlationId });
    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('moderation_cases_getById', {
  methods: ['GET'],
  authLevel: 'anonymous', // TODO: Change to 'function' and add requireAuth + requireRoles middleware
  route: 'moderation/cases/{id}',
  handler: moderation_cases_getById,
});
