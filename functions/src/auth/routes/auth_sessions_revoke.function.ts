/**
 * Revoke all refresh tokens for the authenticated user.
 *
 * POST /api/auth/sessions/revoke
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { extractAuthContext } from '@shared/http/authContext';
import { revokeAllRefreshTokensForUser } from '@auth/service/tokenService';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';

export const auth_sessions_revoke = httpHandler(async (ctx) => {
  let auth;
  try {
    auth = await extractAuthContext(ctx);
  } catch {
    return ctx.unauthorized('Invalid or missing authorization', 'UNAUTHORIZED');
  }

  const revoked = await revokeAllRefreshTokensForUser(auth.userId);
  return ctx.ok({ revoked });
});

app.http('auth_sessions_revoke', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/sessions/revoke',
  handler: withRateLimit(auth_sessions_revoke, () => getPolicyForFunction('auth-sessions-revoke')),
});
