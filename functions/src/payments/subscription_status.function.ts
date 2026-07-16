/**
 * Subscription Status Endpoint
 *
 * GET /api/subscription/status
 *
 * The backend remains authoritative for Alpha tier grants. Payment-provider
 * wiring is deferred; manual Premium and Black grants carry review/expiry data.
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { extractAuthContext } from '@shared/http/authContext';
import { getEffectiveEntitlements } from '@shared/services/entitlementService';

import type { SubscriptionStatusResponse } from './types';

app.http('subscription_status', {
  methods: ['GET'],
  route: 'subscription/status',
  authLevel: 'anonymous',
  handler: httpHandler(async ctx => {
    const auth = await extractAuthContext(ctx);
    if (!auth.userId) {
      return ctx.unauthorized('Authentication required');
    }

    const effective = await getEffectiveEntitlements(auth.userId, auth.tier);
    const limits = effective.limits;

    const response: SubscriptionStatusResponse = {
      userId: auth.userId,
      tier: effective.tier,
      status: 'active',
      provider: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      accessLabel: 'Alpha access',
      manualGrantExpiresAt: effective.manualGrantExpiresAt,
      manualGrantReviewAt: effective.manualGrantReviewAt,
      entitlements: {
        dailyPosts: limits.dailyPosts,
        dailyComments: limits.dailyComments,
        dailyReactions: limits.dailyReactions,
        dailyAppeals: limits.dailyAppeals,
        exportCooldownDays: limits.exportCooldownDays,
        maxMediaSizeMB: limits.maxMediaSizeMB,
        maxMediaPerPost: limits.maxMediaPerPost,
        maxCustomFeeds: limits.maxCustomFeeds,
        newsBoardAccessLevel: limits.newsBoardAccessLevel,
        newsBoardPreview: limits.newsBoardPreview,
        postingRestricted: limits.postingRestricted,
        rewardLevelCap: limits.rewardLevelCap,
        rewardOptionsPerLevel: limits.rewardOptionsPerLevel,
        rewardChoiceBreadth: limits.rewardChoiceBreadth,
      },
    };

    return ctx.ok(response);
  }),
});
