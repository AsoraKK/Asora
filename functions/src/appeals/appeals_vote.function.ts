/**
 * Vote on Appeal Function
 * 
 * POST /api/appeals/{id}/votes
 * 
 * Cast a weighted vote on an appeal (uphold or deny).
 * 
 * OpenAPI: appeals_vote
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { VoteOnAppealRequest, VoteOnAppealResponse } from '@shared/types/openapi';
import { extractAuthContext } from '@shared/http/authContext';
import { voteOnAppeal } from './appealsService';
import { HttpError } from '@shared/utils/errors';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';

const VALID_VOTES: VoteOnAppealRequest['vote'][] = ['uphold', 'deny'];

export const appeals_vote = httpHandler<VoteOnAppealRequest, VoteOnAppealResponse>(async (ctx) => {
  const appealId = ctx.params.id;
  ctx.context.log(`[appeals_vote] Recording vote for appeal ${appealId} [${ctx.correlationId}]`);

  if (!appealId) {
    return ctx.badRequest('Appeal ID is required');
  }

  if (!ctx.body || !ctx.body.vote || !VALID_VOTES.includes(ctx.body.vote)) {
    return ctx.badRequest('Invalid vote', 'INVALID_VOTE');
  }

  let auth;
  try {
    auth = await extractAuthContext(ctx);
  } catch {
    return ctx.unauthorized('Invalid or missing authorization', 'UNAUTHORIZED');
  }

  try {
    const vote = await voteOnAppeal(auth.userId, appealId, ctx.body);
    return ctx.ok({ vote });
  } catch (error) {
    if (error instanceof HttpError) {
      switch (error.status) {
        case 400:
          return ctx.badRequest(error.message, error.message);
        case 404:
          return ctx.notFound(error.message);
      }
    }

    ctx.context.error(`[appeals_vote] Error recording vote: ${error}`, { correlationId: ctx.correlationId });
    return ctx.internalError(error as Error);
  }
});

// Register HTTP trigger
app.http('appeals_vote', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'appeals/{id}/votes',
  handler: withRateLimit(appeals_vote, () => getPolicyForFunction('appeals-vote')),
});
