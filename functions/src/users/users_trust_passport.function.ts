/**
 * Get User Trust Passport Function
 *
 * GET /api/users/{id}/trust-passport
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { extractAuthContext } from '@shared/http/authContext';
import { trustPassportService, type TrustPassportSummary } from '@users/service/trustPassportService';
import { usersService } from '@auth/service/usersService';
import {
  profileService,
  resolveTrustPassportVisibility,
} from '@users/service/profileService';

function redactCounts(passport: TrustPassportSummary): TrustPassportSummary {
  return {
    ...passport,
    counts: {
      transparency: {
        totalPosts: 0,
        postsWithSignals: 0,
      },
      appeals: {
        resolved: 0,
        approved: 0,
        rejected: 0,
      },
      juror: {
        votesCast: 0,
        alignedVotes: 0,
      },
    },
  };
}

export const users_trust_passport_get = httpHandler<void, TrustPassportSummary>(async (ctx) => {
  const userId = ctx.params.id;
  if (!userId) {
    return ctx.badRequest('User ID is required', 'INVALID_REQUEST');
  }

  try {
    let requesterUserId: string | null = null;
    try {
      const auth = await extractAuthContext(ctx);
      requesterUserId = auth.userId;
    } catch {
      requesterUserId = null;
    }

    const user = await usersService.getUserById(userId);
    if (!user) {
      return ctx.notFound('User not found', 'USER_NOT_FOUND');
    }

    const profile = await profileService.getProfile(userId);
    const visibility = resolveTrustPassportVisibility(profile?.settings);
    const isSelfView = requesterUserId === userId;

    if (visibility === 'private' && !isSelfView) {
      return ctx.forbidden(
        'Trust passport is private for this profile',
        'TRUST_PASSPORT_PRIVATE'
      );
    }

    const passport = await trustPassportService.getUserTrustPassport(userId);
    const visiblePassport =
      visibility === 'public_minimal' && !isSelfView
        ? redactCounts(passport)
        : passport;
    return ctx.ok({
      ...visiblePassport,
      visibility,
    });
  } catch (error) {
    ctx.context.error(`[users_trust_passport_get] Error: ${error}`, {
      correlationId: ctx.correlationId,
      userId,
    });
    return ctx.internalError(error as Error);
  }
});

app.http('users_trust_passport_get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users/{id}/trust-passport',
  handler: users_trust_passport_get,
});
