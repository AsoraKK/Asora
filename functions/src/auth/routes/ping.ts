import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function ping(
  _req: HttpRequest,
  _context: InvocationContext,
): Promise<HttpResponseInit> {
  return {
    status: 200,
    jsonBody: { ok: true, timestamp: new Date().toISOString() },
  };
}

app.http('auth-ping', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'auth/ping',
  handler: ping,
});
