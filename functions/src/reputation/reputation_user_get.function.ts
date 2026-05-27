/**
 * GET /api/reputation/users/{id}
 *
 * Returns the public reputation view for any user — only level, status, and band.
 * No ledger data, no internal scores.
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { getAzureLogger } from '@shared/utils/logger';
import { computeLevel, getLevelBand, getLevelName } from './levelService';
import type { PublicReputationView } from './types';

const logger = getAzureLogger('reputation/userView');

app.http('reputation_user_get', {
  methods: ['GET'],
  route: 'reputation/users/{id}',
  authLevel: 'anonymous',
  handler: httpHandler(async (ctx) => {
    const targetUserId = ctx.request.params['id'];
    if (!targetUserId) {
      return ctx.badRequest('User id is required');
    }

    const db = getCosmosDatabase();
    const { resource: user } = await db
      .container('users')
      .item(targetUserId, targetUserId)
      .read<{
        id: string;
        reputationScore?: number;
        reputationStatus?: string;
      }>();

    if (!user) {
      return ctx.notFound('User not found');
    }

    const rawScore = user.reputationScore ?? 0;
    const reputationLevel = await computeLevel(rawScore);

    const view: PublicReputationView = {
      userId: targetUserId,
      reputationLevel,
      reputationStatus: (user.reputationStatus as 'standard' | 'editorial') ?? 'standard',
      reputationBand: getLevelBand(reputationLevel),
      levelName: getLevelName(reputationLevel),
    };

    logger.info('reputation.user.fetched', { targetUserId, reputationLevel });
    return ctx.ok(view);
  }),
});
