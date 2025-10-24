import type { InvocationContext } from '@azure/functions';
import jwt from 'jsonwebtoken';

import { submitAppealRoute } from '@moderation/routes/submitAppeal';
import { submitAppealHandler } from '@moderation/service/appealService';
import { httpReqMock } from '../helpers/http';

jest.mock('@moderation/service/appealService', () => ({
  submitAppealHandler: jest.fn(),
}));

const originalSecret = process.env.JWT_SECRET;
const contextStub = { log: jest.fn() } as unknown as InvocationContext;

function token() {
  return jwt.sign({ sub: 'moderator-1' }, process.env.JWT_SECRET!, { algorithm: 'HS256' });
}

function authorizedRequest(body?: unknown) {
  return httpReqMock({
    method: 'POST',
    headers: { authorization: `Bearer ${token()}` },
    body,
  });
}

describe('submitAppeal route', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    jest.clearAllMocks();
    contextStub.log = jest.fn();
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('returns CORS response for OPTIONS', async () => {
    const response = await submitAppealRoute(httpReqMock({ method: 'OPTIONS' }), contextStub);
    expect(response.status).toBe(200);
    expect(response.body).toBe('');
  });

  it('rejects disallowed methods', async () => {
    const response = await submitAppealRoute(httpReqMock({ method: 'GET' }), contextStub);
    expect(response.status).toBe(405);
    expect(JSON.parse(response.body)).toMatchObject({
      success: false,
      message: 'Method GET not allowed',
    });
  });

  it('returns 401 when authorization is missing', async () => {
    const handler = submitAppealHandler as jest.MockedFunction<typeof submitAppealHandler>;
    const response = await submitAppealRoute(httpReqMock({ method: 'POST' }), contextStub);
    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    expect(response.body).toBe(JSON.stringify({ error: 'unauthorized' }));
  });

  it('delegates to handler for authorized requests', async () => {
    const handler = submitAppealHandler as jest.MockedFunction<typeof submitAppealHandler>;
    handler.mockResolvedValueOnce({ status: 201, jsonBody: { id: 'appeal-1' } });

    const request = authorizedRequest({ reason: 'please review' });
    const response = await submitAppealRoute(request, contextStub);
    expect(handler).toHaveBeenCalledWith({
      request,
      context: contextStub,
      userId: 'moderator-1',
    });
    expect(response.status).toBe(201);
    expect(response.jsonBody).toEqual({ id: 'appeal-1' });
  });

  it('returns 500 when handler throws', async () => {
    const handler = submitAppealHandler as jest.MockedFunction<typeof submitAppealHandler>;
    handler.mockRejectedValueOnce(new Error('database down'));

    const response = await submitAppealRoute(authorizedRequest({ reason: 'please review' }), contextStub);
    expect(contextStub.log).toHaveBeenCalledWith('moderation.appeal.submit.error', expect.any(Error));
    expect(response.status).toBe(500);
    expect(response.body).toBe(JSON.stringify({ error: 'internal' }));
  });
});
