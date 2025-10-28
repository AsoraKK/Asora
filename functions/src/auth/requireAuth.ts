import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import type { Principal } from '../types/azure';
import { AuthError, verifyAuthorizationHeader } from './verifyJwt';

type ProtectedHandler = (
  req: HttpRequest & { principal: Principal },
  context: InvocationContext,
) => Promise<HttpResponseInit> | HttpResponseInit;

function buildUnauthorizedResponse(error: AuthError): HttpResponseInit {
  return {
    status: error.statusCode,
    headers: {
      'WWW-Authenticate': `Bearer error="${error.code}", error_description="${error.message}"`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ error: error.code }),
  };
}

export function requireAuth(handler: ProtectedHandler): (
  req: HttpRequest,
  context: InvocationContext,
) => Promise<HttpResponseInit> {
  return async (req, context) => {
    const header = req.headers.get('authorization');

    let principal: Principal;
    try {
      principal = await verifyAuthorizationHeader(header);
    } catch (error) {
      const authError =
        error instanceof AuthError ? error : new AuthError('invalid_token', 'Unable to validate token');
      context.log('auth.requireAuth.denied', { code: authError.code, message: authError.message });
      return buildUnauthorizedResponse(authError);
    }

    (req as HttpRequest & { principal: Principal }).principal = principal;
    context.principal = principal;

    return await handler(req as HttpRequest & { principal: Principal }, context);
  };
}
