/**
 * Moderation Decision Function
 * 
 * POST /api/moderation/cases/{id}/decision
 * 
 * Submit an approval, rejection, or escalation decision for a moderation case.
 * 
 * OpenAPI: moderation_cases_decide
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { ModerationDecisionRequest, ModerationDecision } from '@shared/types/openapi';
import { extractAuthContext } from '@shared/http/authContext';
import { createModerationDecision, hasModeratorRole } from '@moderation/moderationService';

const VALID_ACTIONS: ModerationDecisionRequest['action'][] = ['approve', 'reject', 'escalate'];

export const moderation_cases_decide = httpHandler<ModerationDecisionRequest, ModerationDecision>(async (ctx) => {
  const caseId = ctx.params.id;
  ctx.context.log(`[moderation_cases_decide] Submitting decision for case ${caseId} [${ctx.correlationId}]`);

  if (!caseId) {
    return ctx.badRequest('Case ID is required');
  }

  const request = ctx.body;
  if (!request || !request.action || !VALID_ACTIONS.includes(request.action)) {
    return ctx.badRequest('Invalid decision action', 'INVALID_ACTION');
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
    const decision = await createModerationDecision(caseId, auth.userId, request.action, request.rationale);
    return ctx.ok(decision);
  } catch (error) {
    ctx.context.error(`[moderation_cases_decide] Error: ${error}`, { correlationId: ctx.correlationId });
    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('moderation_cases_decide', {
  methods: ['POST'],
  authLevel: 'anonymous', // TODO: Change to 'function' and add requireAuth + requireRoles middleware
  route: 'moderation/cases/{id}/decision',
  handler: moderation_cases_decide,
});
