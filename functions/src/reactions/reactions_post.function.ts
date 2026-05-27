/**
 * POST /api/reactions
 *
 * Submit a structured reaction to a piece of content.
 * Applies anti-gaming controls; may set includedInReputation=false if capped.
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { extractAuthContext } from '@shared/http/authContext';
import { getAzureLogger } from '@shared/utils/logger';
import { submitReaction } from './reactionService';
import type { SubmitReactionRequest, ReactionType } from './types';

const logger = getAzureLogger('reactions/post');

const VALID_REACTION_TYPES: readonly ReactionType[] = [
  'helpful', 'well_sourced', 'thoughtful', 'agree',
  'disagree', 'misleading', 'low_effort', 'report',
];

app.http('reactions_post', {
  methods: ['POST'],
  route: 'reactions',
  authLevel: 'anonymous',
  handler: httpHandler<SubmitReactionRequest>(async (ctx) => {
    let auth;
    try {
      auth = await extractAuthContext(ctx);
    } catch {
      return ctx.unauthorized('Authentication required');
    }

    const body = ctx.body;
    if (!body) {
      return ctx.badRequest('Request body is required');
    }

    const { targetContentId, targetUserId, reactionType } = body;

    if (!targetContentId || typeof targetContentId !== 'string') {
      return ctx.badRequest('targetContentId is required');
    }
    if (!targetUserId || typeof targetUserId !== 'string') {
      return ctx.badRequest('targetUserId is required');
    }
    if (!reactionType || !(VALID_REACTION_TYPES as string[]).includes(reactionType)) {
      return ctx.badRequest(
        `reactionType must be one of: ${VALID_REACTION_TYPES.join(', ')}`
      );
    }

    try {
      const result = await submitReaction({
        actorUserId: auth.userId,
        targetUserId,
        targetContentId,
        reactionType,
      });

      logger.info('reactions.post.ok', {
        reactionId: result.id,
        actorUserId: auth.userId,
        reactionType,
      });

      return ctx.created(result);
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 400) {
        return ctx.badRequest((err as Error).message);
      }
      throw err;
    }
  }),
});
