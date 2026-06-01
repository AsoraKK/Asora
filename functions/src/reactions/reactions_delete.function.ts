/**
 * DELETE /api/reactions/{id}
 *
 * Remove the authenticated user's own reaction.
 * Does NOT reverse reputation ledger entries; those go through the appeals flow.
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { extractAuthContext } from '@shared/http/authContext';
import { rateLimitedByRoute } from '@http/rateLimitDecorators';
import { getAzureLogger } from '@shared/utils/logger';
import { deleteReaction } from './reactionService';
import { STRUCTURED_REACTIONS_ENABLED } from './types';

const logger = getAzureLogger('reactions/delete');

if (STRUCTURED_REACTIONS_ENABLED) {
  app.http('reactions_delete', {
    methods: ['DELETE'],
    route: 'reactions/{id}',
    authLevel: 'anonymous',
    handler: rateLimitedByRoute(httpHandler(async (ctx) => {
      let auth;
      try {
        auth = await extractAuthContext(ctx);
      } catch {
        return ctx.unauthorized('Authentication required');
      }

      const reactionId = ctx.request.params['id'];
      if (!reactionId) {
        return ctx.badRequest('Reaction id is required');
      }

      try {
        await deleteReaction(reactionId, auth.userId);
        logger.info('reactions.delete.ok', { reactionId, userId: auth.userId });
        return ctx.noContent();
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404) {
          return ctx.notFound('Reaction not found');
        }
        throw err;
      }
    })),
  });
}
