import { HttpRequest, InvocationContext } from '@azure/functions';

import { authorizeRoute } from '@auth/routes/authorize';
import { tokenRoute } from '@auth/routes/token';
import { userInfoRoute } from '@auth/routes/userinfo';
import { flagContentRoute } from '@moderation/routes/flagContent';
import { submitAppealRoute } from '@moderation/routes/submitAppeal';
import { voteOnAppealRoute } from '@moderation/routes/voteOnAppeal';
import { deleteUserRoute } from '@privacy/routes/deleteUser';
import { exportUserRoute } from '@privacy/routes/exportUser';

type RouteHandler = (req: HttpRequest, ctx: InvocationContext) => Promise<any>;

const context = {
  invocationId: 'cors-test',
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
} as unknown as InvocationContext;

function makeRequest(method: string): HttpRequest {
  return {
    method,
    headers: new Headers(),
    query: new URLSearchParams(),
    params: {},
    url: 'https://example.test/api',
    user: undefined,
  } as unknown as HttpRequest;
}

const routes: Array<[
  name: string,
  handler: RouteHandler,
  allowed: string[],
  invalidMethod: string,
]> = [
  ['auth authorize', authorizeRoute, ['GET'], 'POST'],
  ['auth token', tokenRoute, ['POST'], 'GET'],
  ['auth userinfo', userInfoRoute, ['GET', 'POST'], 'DELETE'],
  ['moderation flag', flagContentRoute, ['POST'], 'GET'],
  ['moderation submit appeal', submitAppealRoute, ['POST'], 'GET'],
  ['moderation vote appeal', voteOnAppealRoute, ['POST'], 'GET'],
  ['privacy delete user', deleteUserRoute, ['DELETE'], 'POST'],
  ['privacy export user', exportUserRoute, ['GET'], 'POST'],
];

describe('HTTP route CORS guards', () => {
  it.each(routes)('%s returns CORS response for OPTIONS', async (_name, handler) => {
    const response = await handler(makeRequest('OPTIONS'), context);
    const headers = response.headers as Record<string, string> | undefined;
    expect(response.status).toBe(200);
    expect(headers?.['Access-Control-Allow-Methods']).toContain('OPTIONS');
    expect(response.body).toBe('');
  });

  it.each(routes)('%s rejects unsupported methods', async (name, handler, allowed, invalid) => {
    expect(allowed).not.toContain(invalid);
    const response = await handler(makeRequest(invalid), context);
    expect(response.status).toBe(405);
    const body = JSON.parse(response.body ?? '{}');
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/not allowed/i);
    expect(body.error).toBeUndefined();
  });
});
