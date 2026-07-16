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

const VALID_TIERS: readonly string[] = ['free', 'premium', 'black'];
const MAX_GRANT_DAYS = 90;

interface SetTierBody {
  tier?: unknown;
  reason?: unknown;
  expiresAt?: unknown;
  reviewAt?: unknown;
}

function parseFutureDate(value: unknown, field: string, now: Date): Date {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} is required for paid Alpha grants`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date <= now) {
    throw new Error(`${field} must be a valid future date`);
  }
  return date;
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
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';

  if (typeof rawTier !== 'string' || !VALID_TIERS.includes(rawTier)) {
    return createErrorResponse(
      400,
      'invalid_tier',
      `tier must be one of: ${VALID_TIERS.join(', ')}`
    );
  }

  if (reason.length < 5 || reason.length > 500) {
    return createErrorResponse(
      400,
      'invalid_reason',
      'reason must be between 5 and 500 characters'
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
  let tierGrant: import('@auth/types').UserDocument['tierGrant'] = null;

  if (tier !== 'free') {
    try {
      const nowDate = new Date(now);
      const expiresAt = parseFutureDate(body?.expiresAt, 'expiresAt', nowDate);
      const reviewAt = parseFutureDate(body?.reviewAt, 'reviewAt', nowDate);
      const maxExpiry = new Date(nowDate.getTime() + MAX_GRANT_DAYS * 24 * 60 * 60 * 1000);
      if (expiresAt > maxExpiry) {
        return createErrorResponse(
          400,
          'grant_too_long',
          `paid Alpha grants cannot exceed ${MAX_GRANT_DAYS} days`
        );
      }
      if (reviewAt > expiresAt) {
        return createErrorResponse(400, 'invalid_review_date', 'reviewAt must be on or before expiresAt');
      }
      tierGrant = {
        tier,
        grantedBy: req.principal.sub,
        reason,
        grantedAt: now,
        expiresAt: expiresAt.toISOString(),
        reviewAt: reviewAt.toISOString(),
      };
    } catch (error) {
      return createErrorResponse(400, 'invalid_grant_dates', (error as Error).message);
    }
  }

  await db.users.item(userId, userId).patch([
    { op: 'set', path: '/tier', value: tier },
    { op: 'set', path: '/tierGrant', value: tierGrant },
    { op: 'set', path: '/updatedAt', value: now },
  ]);

  await recordAdminAudit({
    actorId: req.principal.sub,
    action: 'USER_TIER_SET',
    subjectId: userId,
    targetType: 'user',
    reasonCode: 'manual_alpha_tier_assignment',
    note: reason,
    before: { tier: previousTier, grant: user.tierGrant ?? null },
    after: { tier, grant: tierGrant },
  });

  return createSuccessResponse({ userId, tier, tierGrant, updatedAt: now });
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
