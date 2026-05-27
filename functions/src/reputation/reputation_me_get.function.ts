/**
 * GET /api/reputation/me
 *
 * Returns the authenticated user's full ReputationSummary.
 * Raw score delta fields are never returned to clients.
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { extractAuthContext } from '@shared/http/authContext';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { getAzureLogger } from '@shared/utils/logger';
import { computeLevel, getLevelBand, getLevelName } from './levelService';
import type { ReputationSummary, FeedEligibilityStatus } from './types';

const logger = getAzureLogger('reputation/me');

app.http('reputation_me_get', {
  methods: ['GET'],
  route: 'reputation/me',
  authLevel: 'anonymous',
  handler: httpHandler(async (ctx) => {
    const auth = await extractAuthContext(ctx);
    if (!auth.userId) {
      return ctx.unauthorized('Authentication required');
    }

    const db = getCosmosDatabase();
    const { resource: user } = await db
      .container('users')
      .item(auth.userId, auth.userId)
      .read<{
        id: string;
        reputationScore?: number;
        reputationStatus?: string;
        pillarScores?: Record<string, number>;
        publicFeedEligibilityStatus?: string;
        rewardEligibilityStatus?: string;
        updatedAt?: string;
      }>();

    if (!user) {
      return ctx.notFound('User not found');
    }

    const rawScore = user.reputationScore ?? 0;
    const reputationLevel = await computeLevel(rawScore);
    const pillarScores = user.pillarScores ?? {};

    const summary: ReputationSummary = {
      userId: auth.userId,
      reputationLevel,
      reputationStatus: (user.reputationStatus as 'standard' | 'editorial') ?? 'standard',
      reputationBand: getLevelBand(reputationLevel),
      humanContributionScore: pillarScores['human_contribution'] ?? 0,
      contentQualityScore: pillarScores['content_quality'] ?? 0,
      behaviourTrustScore: pillarScores['behaviour_trust'] ?? 0,
      interactionQualityScore: pillarScores['interaction_quality'] ?? 0,
      verificationStrengthScore: pillarScores['verification_strength'] ?? 0,
      communityTrustScore: pillarScores['community_trust'] ?? 0,
      publicFeedEligibilityStatus:
        (user.publicFeedEligibilityStatus === 'restricted'
          ? 'restricted'
          : user.publicFeedEligibilityStatus === 'ineligible'
          ? 'ineligible'
          : 'eligible') as FeedEligibilityStatus,
      rewardEligibilityStatus:
        (user.rewardEligibilityStatus as 'eligible' | 'ineligible') ?? 'eligible',
      lastCalculatedAt: user.updatedAt ?? new Date().toISOString(),
      version: 1,
    };

    logger.info('reputation.me.fetched', { userId: auth.userId, reputationLevel });
    return ctx.ok(summary);
  }),
});
