import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';

export async function health(
  _req: HttpRequest,
  _ctx: InvocationContext
): Promise<HttpResponseInit> {
  return { status: 200, jsonBody: { ok: true } };
}

/* istanbul ignore next */
const rateLimitedHealth = withRateLimit(health, (req, context) => getPolicyForFunction('health'));

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: rateLimitedHealth,
});
