/**
 * GET /api/rewards/me
 *
 * Returns the rewards snapshot for the authenticated user.
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { extractAuthContext } from '@shared/http/authContext';
import { getAzureLogger } from '@shared/utils/logger';
import { getRewardsSnapshot } from './rewardsService';
import type { RewardsMeResponse } from './types';

const logger = getAzureLogger('rewards/me');

export const rewards_me_get = httpHandler<void, RewardsMeResponse>(async (ctx) => {
  let auth;
  try {
    auth = await extractAuthContext(ctx);
  } catch {
    return ctx.unauthorized('Authentication required');
  }

  const payload = await getRewardsSnapshot(auth.userId, auth.tier);
  logger.info('rewards.me.fetched', {
    userId: auth.userId,
    tier: payload.subscriptionTier,
    offerCount: payload.offers.length,
  });

  return ctx.ok(payload);
});

app.http('rewards_me_get', {
  methods: ['GET'],
  route: 'rewards/me',
  authLevel: 'anonymous',
  handler: rewards_me_get,
});
