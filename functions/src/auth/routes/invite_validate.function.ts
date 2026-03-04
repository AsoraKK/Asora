import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';
import { getInvite, isInviteActive } from '../service/inviteStore';

const INVITE_CODE_PATTERN = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export async function validateInvitePublic(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'GET', ['GET']);
  if (cors.shouldReturn && cors.response) {
    return cors.response;
  }

  const rawCode = req.query?.get?.('code')?.trim();
  if (!rawCode) {
    return createSuccessResponse({ valid: false });
  }

  const inviteCode = rawCode.toUpperCase();
  if (!INVITE_CODE_PATTERN.test(inviteCode)) {
    return createSuccessResponse({ valid: false });
  }

  try {
    const invite = await getInvite(inviteCode);
    const valid = invite ? isInviteActive(invite) : false;
    return createSuccessResponse({ valid });
  } catch (error) {
    context.error('auth.invite.validate_failed', {
      error: (error as Error).message,
    });
    return createErrorResponse(500, 'internal_error', 'Invite validation unavailable');
  }
}

const rateLimitedValidateInvite = withRateLimit(
  validateInvitePublic,
  () => getPolicyForFunction('auth-invite-validate')
);

app.http('auth-invite-validate', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'auth/invite/validate',
  handler: rateLimitedValidateInvite,
});
