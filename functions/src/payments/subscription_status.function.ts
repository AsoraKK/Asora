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
import { getTargetDatabase } from '@shared/clients/cosmos';
import { normalizeTier, getLimitsForTier } from '@shared/services/tierLimits';

import type { SubscriptionStatusResponse } from './types';

app.http('subscription_status', {
  methods: ['GET'],
  route: 'subscription/status',
  authLevel: 'anonymous', // JWT auth handled by extractAuthContext
  handler: httpHandler(async ctx => {
    const auth = await extractAuthContext(ctx);
    if (!auth.userId) {
      return ctx.unauthorized('Authentication required');
    }

    // Resolve effective tier: Cosmos user doc takes precedence over JWT claim.
    // This enables manual Black tier assignment via PATCH /api/admin/users/:userId/tier
    // without requiring a payment provider or JWT re-issuance.
    //
    // Priority: Cosmos user.tier → JWT tier claim → 'free' (default)
    //
    // TODO: When Cosmos subscriptions container exists, switch to querying it
    //       (which will be populated by the payment webhook on provider wiring).
    let effectiveTier = normalizeTier(auth.tier);

    try {
      const db = getTargetDatabase();
      const { resource: userDoc } = await db.users
        .item(auth.userId, auth.userId)
        .read<{ tier?: string }>();
      if (userDoc?.tier) {
        effectiveTier = normalizeTier(userDoc.tier);
      }
    } catch {
      // Cosmos unavailable — fall back to JWT tier claim already set above.
    }

    const limits = getLimitsForTier(effectiveTier);

    const response: SubscriptionStatusResponse = {
      userId: auth.userId,
      tier: effectiveTier,
      status: 'active', // Default — actual status comes from Cosmos subscriptions container later
      provider: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      entitlements: {
        dailyPosts: limits.dailyPosts,
        maxMediaSizeMB: limits.maxMediaSizeMB,
        maxMediaPerPost: limits.maxMediaPerPost,
        maxCustomFeeds: limits.maxCustomFeeds,
        newsBoardAccess: limits.newsBoardAccess,
        postingRestricted: limits.postingRestricted,
        rewardLevelCap: limits.rewardLevelCap,
        rewardOptionsPerLevel: limits.rewardOptionsPerLevel,
      },
    };

    return ctx.ok(response);
  }),
});
