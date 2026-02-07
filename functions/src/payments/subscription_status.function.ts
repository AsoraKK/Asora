/**
 * Subscription Status Endpoint
 *
 * GET /api/subscription/status
 *
 * Returns the authenticated user's current subscription tier, status,
 * and entitlements. If no subscription document exists in Cosmos,
 * defaults to the free tier.
 *
 * ⚠️  Architecture placeholder — reads from JWT tier claim until
 *     the Cosmos subscriptions container is created and populated
 *     by the payment webhook.
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { extractAuthContext } from '@shared/http/authContext';
import {
  normalizeTier,
  getLimitsForTier,
} from '@shared/services/tierLimits';

import type { SubscriptionStatusResponse } from './types';

app.http('subscription_status', {
  methods: ['GET'],
  route: 'subscription/status',
  authLevel: 'anonymous', // JWT auth handled by extractAuthContext
  handler: httpHandler(async (ctx) => {
    const auth = await extractAuthContext(ctx);
    if (!auth.userId) {
      return ctx.unauthorized('Authentication required');
    }

    const tier = normalizeTier(auth.tier);
    const limits = getLimitsForTier(tier);

    // TODO: When Cosmos subscriptions container exists, query it:
    //
    // const sub = await cosmosClient
    //   .database('asora')
    //   .container('subscriptions')
    //   .item(auth.userId, auth.userId)
    //   .read<SubscriptionDocument>();
    //
    // For now, derive status from JWT tier claim.

    const response: SubscriptionStatusResponse = {
      userId: auth.userId,
      tier,
      status: 'active', // Default — actual status comes from Cosmos later
      provider: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      entitlements: {
        dailyPosts: limits.dailyPosts,
        maxMediaSizeMB: limits.maxMediaSizeMB,
        maxMediaPerPost: limits.maxMediaPerPost,
      },
    };

    return ctx.ok(response);
  }),
});
