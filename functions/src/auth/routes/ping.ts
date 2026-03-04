import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';

export async function ping(
  _req: HttpRequest,
  _context: InvocationContext,
): Promise<HttpResponseInit> {
  return {
    status: 200,
    jsonBody: { ok: true, timestamp: new Date().toISOString() },
  };
}

/* istanbul ignore next */
const rateLimitedPing = withRateLimit(ping, (req, context) => getPolicyForFunction('auth-ping'));

app.http('auth-ping', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'auth/ping',
  handler: rateLimitedPing,
});
