/**
 * Admin: Set User Tier
 *
 * PATCH /api/admin/users/:userId/tier
 *
 * Manually assigns a tier to a user in the Cosmos user document.
 * Used during soft launch to grant Black tier testers without a payment flow.
 *
 * Auth: active admin required (JWT + Cosmos isActive check).
 * Audit: records USER_TIER_SET to admin audit log.
 *
 * ⚠️  This endpoint exists because payments are deferred.
 *     Remove or gate behind a feature flag once the IAP provider is wired.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { requireActiveAdmin } from '../adminAuthUtils';
import { recordAdminAudit } from '../auditLogger';
import { normalizeTier } from '@shared/services/tierLimits';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';
import type { UserTier } from '@shared/services/tierLimits';
import type { Principal } from '@shared/middleware/auth';

const VALID_TIERS: readonly string[] = ['free', 'premium', 'black', 'admin'];

interface SetTierBody {
  tier?: unknown;
}

export async function setUserTier(
  req: HttpRequest & { principal: Principal },
  _context: InvocationContext
): Promise<HttpResponseInit> {
  const userId = req.params['userId'];
  if (!userId) {
    return createErrorResponse(400, 'missing_user_id', 'userId is required');
  }

  const body = (await req.json().catch(() => null)) as SetTierBody | null;
  const rawTier = body?.tier;

  if (typeof rawTier !== 'string' || !VALID_TIERS.includes(rawTier)) {
    return createErrorResponse(
      400,
      'invalid_tier',
      `tier must be one of: ${VALID_TIERS.join(', ')}`
    );
  }

  const tier = normalizeTier(rawTier) satisfies UserTier;

  const db = getTargetDatabase();
  const { resource: user } = await db.users.item(userId, userId).read();
  if (!user) {
    return createErrorResponse(404, 'not_found', 'User not found');
  }

  const previousTier: string = typeof user.tier === 'string' ? user.tier : 'free';
  const now = new Date().toISOString();

  await db.users.item(userId, userId).patch([
    { op: 'set', path: '/tier', value: tier },
    { op: 'set', path: '/updatedAt', value: now },
  ]);

  await recordAdminAudit({
    actorId: req.principal.sub,
    action: 'USER_TIER_SET',
    subjectId: userId,
    targetType: 'user',
    reasonCode: 'manual_tier_assignment',
    before: { tier: previousTier },
    after: { tier },
  });

  return createSuccessResponse({ userId, tier, updatedAt: now });
}

const rateLimitedSetUserTier = withRateLimit(
  requireActiveAdmin(setUserTier),
  (req, context) => getPolicyForFunction('admin_set_user_tier'),
);

app.http('admin_set_user_tier', {
  methods: ['PATCH'],
  route: 'admin/users/{userId}/tier',
  authLevel: 'anonymous',
  handler: rateLimitedSetUserTier,
});
