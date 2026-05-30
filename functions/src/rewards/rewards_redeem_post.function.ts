/**
 * POST /api/rewards/{id}/redeem
 *
 * Redeems a reward for the authenticated user if unlocked and eligible.
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { extractAuthContext } from '@shared/http/authContext';
import { rateLimitedByRoute } from '@http/rateLimitDecorators';
import { getAzureLogger } from '@shared/utils/logger';
import { redeemReward } from './rewardsService';
import type { RewardRedemption } from './types';

const logger = getAzureLogger('rewards/redeem');

export const rewards_redeem_post = httpHandler<void, RewardRedemption>(async (ctx) => {
  let auth;
  try {
    auth = await extractAuthContext(ctx);
  } catch {
    return ctx.unauthorized('Authentication required');
  }

  const rewardId = ctx.request.params['id'];
  if (!rewardId) {
    return ctx.badRequest('Reward id is required');
  }

  try {
    const redemption = await redeemReward(auth.userId, rewardId, auth.tier);
    logger.info('rewards.redeem.ok', {
      userId: auth.userId,
      rewardId,
      redemptionId: redemption.id,
    });
    return ctx.created(redemption);
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    const message = err instanceof Error ? err.message : 'Unable to redeem reward';

    if (statusCode === 404) {
      return ctx.notFound(message);
    }
    if (statusCode === 403) {
      return ctx.forbidden(message);
    }
    if (statusCode === 409) {
      return ctx.badRequest(message, 'ALREADY_REDEEMED');
    }
    throw err;
  }
});

app.http('rewards_redeem_post', {
  methods: ['POST'],
  route: 'rewards/{id}/redeem',
  authLevel: 'anonymous',
  handler: rateLimitedByRoute(rewards_redeem_post),
});
