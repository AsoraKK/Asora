/**
 * Get User Trust Passport Function
 *
 * GET /api/users/{id}/trust-passport
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { trustPassportService, type TrustPassportSummary } from '@users/service/trustPassportService';
import { usersService } from '@auth/service/usersService';

export const users_trust_passport_get = httpHandler<void, TrustPassportSummary>(async (ctx) => {
  const userId = ctx.params.id;
  if (!userId) {
    return ctx.badRequest('User ID is required', 'INVALID_REQUEST');
  }

  try {
    const user = await usersService.getUserById(userId);
    if (!user) {
      return ctx.notFound('User not found', 'USER_NOT_FOUND');
    }

    const passport = await trustPassportService.getUserTrustPassport(userId);
    return ctx.ok(passport);
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

