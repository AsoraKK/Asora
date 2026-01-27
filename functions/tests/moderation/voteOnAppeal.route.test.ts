import type { InvocationContext } from '@azure/functions';

import { voteOnAppealRoute } from '@moderation/routes/voteOnAppeal';
import { voteOnAppealHandler } from '@moderation/service/voteService';
import { httpReqMock } from '../helpers/http';

jest.mock('@moderation/service/voteService', () => ({
  voteOnAppealHandler: jest.fn(),
}));

jest.mock('@auth/verifyJwt', () => {
  const actual = jest.requireActual('@auth/verifyJwt');
  return {
    ...actual,
    verifyAuthorizationHeader: jest.fn(),
  };
});

const { AuthError } = jest.requireActual('@auth/verifyJwt');
const verifyMock = jest.mocked(require('@auth/verifyJwt').verifyAuthorizationHeader);
const contextStub = { log: jest.fn() } as unknown as InvocationContext;

function authorizedRequest(body?: unknown) {
  return httpReqMock({
    method: 'POST',
    headers: { authorization: 'Bearer valid-token' },
    params: { appealId: 'appeal-42' },
    body,
  });
}

describe('voteOnAppeal route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    contextStub.log = jest.fn();
    verifyMock.mockImplementation(async header => {
      if (!header) {
        throw new AuthError('invalid_request', 'Authorization header missing');
      }
      if (header.includes('invalid')) {
        throw new AuthError('invalid_token', 'Unable to validate token');
      }
      // Principal must include roles at top level for requireModerator guard
      return { sub: 'moderator-2', roles: ['moderator'], raw: { roles: ['moderator'] } } as any;
    });
  });

  it('returns CORS response for OPTIONS', async () => {
    const response = await voteOnAppealRoute(httpReqMock({ method: 'OPTIONS' }), contextStub);
    expect(response.status).toBe(200);
    expect(response.body).toBe('');
  });

  it('rejects disallowed methods', async () => {
    const response = await voteOnAppealRoute(httpReqMock({ method: 'GET' }), contextStub);
    expect(response.status).toBe(405);
    expect(JSON.parse(response.body)).toMatchObject({
      success: false,
      message: 'Method GET not allowed',
    });
  });

  it('returns 401 when no authorization header present', async () => {
    const handler = voteOnAppealHandler as jest.MockedFunction<typeof voteOnAppealHandler>;
    const response = await voteOnAppealRoute(httpReqMock({ method: 'POST' }), contextStub);
    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    // requireModerator returns detailed message on auth failure
    expect(JSON.parse(response.body)).toMatchObject({ error: 'invalid_request' });
  });

  it('returns 403 when device integrity headers indicate compromised', async () => {
    const handler = voteOnAppealHandler as jest.MockedFunction<typeof voteOnAppealHandler>;
    const response = await voteOnAppealRoute(
      httpReqMock({
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'x-device-rooted': 'true',
        },
        params: { appealId: 'appeal-42' },
        body: { vote: 'approve' },
      }),
      contextStub
    );
    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(403);
    const body = JSON.parse(response.body as string);
    expect(body.code).toBe('DEVICE_INTEGRITY_BLOCKED');
  });

  it('delegates to handler with parsed parameters', async () => {
    const handler = voteOnAppealHandler as jest.MockedFunction<typeof voteOnAppealHandler>;
    handler.mockResolvedValueOnce({ status: 201, jsonBody: { voteId: 'vote-1' } });

    const request = authorizedRequest({ vote: 'approve', reason: 'valid reason', confidence: 8 });
    const response = await voteOnAppealRoute(request, contextStub);
    expect(handler).toHaveBeenCalledWith({
      request,
      context: contextStub,
      userId: 'moderator-2',
      claims: expect.any(Object),
      appealId: 'appeal-42',
    });
    expect(response.status).toBe(201);
    expect(response.jsonBody).toEqual({ voteId: 'vote-1' });
  });

  it('returns 500 when handler throws', async () => {
    const handler = voteOnAppealHandler as jest.MockedFunction<typeof voteOnAppealHandler>;
    handler.mockRejectedValueOnce(new Error('cosmos down'));

    const response = await voteOnAppealRoute(
      authorizedRequest({ vote: 'approve', reason: 'valid reason', confidence: 7 }),
      contextStub
    );
    expect(contextStub.log).toHaveBeenCalledWith(
      'moderation.appeal.vote.error',
      expect.objectContaining({ message: 'cosmos down' })
    );
    expect(response.status).toBe(500);
    expect(response.body).toBe(JSON.stringify({ error: 'internal' }));
  });
});
