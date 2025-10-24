import type { InvocationContext } from '@azure/functions';
import jwt from 'jsonwebtoken';

import { voteOnAppealRoute } from '@moderation/routes/voteOnAppeal';
import { voteOnAppealHandler } from '@moderation/service/voteService';
import { httpReqMock } from '../helpers/http';

jest.mock('@moderation/service/voteService', () => ({
  voteOnAppealHandler: jest.fn(),
}));

const originalSecret = process.env.JWT_SECRET;
const contextStub = { log: jest.fn() } as unknown as InvocationContext;

function token() {
  return jwt.sign({ sub: 'moderator-2', roles: ['moderator'] }, process.env.JWT_SECRET!, {
    algorithm: 'HS256',
  });
}

function authorizedRequest(body?: unknown) {
  return httpReqMock({
    method: 'POST',
    headers: { authorization: `Bearer ${token()}` },
    params: { appealId: 'appeal-42' },
    body,
  });
}

describe('voteOnAppeal route', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    jest.clearAllMocks();
    contextStub.log = jest.fn();
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
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
    expect(response.body).toBe(JSON.stringify({ error: 'unauthorized' }));
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
    expect(contextStub.log).toHaveBeenCalledWith('moderation.appeal.vote.error', expect.any(Error));
    expect(response.status).toBe(500);
    expect(response.body).toBe(JSON.stringify({ error: 'internal' }));
  });
});
