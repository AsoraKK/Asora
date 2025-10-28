import type { InvocationContext } from '@azure/functions';

import { submitAppealRoute } from '@moderation/routes/submitAppeal';
import { submitAppealHandler } from '@moderation/service/appealService';
import { httpReqMock } from '../helpers/http';

jest.mock('@moderation/service/appealService', () => ({
  submitAppealHandler: jest.fn(),
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
    body,
  });
}

describe('submitAppeal route', () => {
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
      return { sub: 'moderator-1', raw: {} } as any;
    });
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
    expect(response.body).toBe(JSON.stringify({ error: 'invalid_request' }));
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
    expect(contextStub.log).toHaveBeenCalledWith(
      'moderation.appeal.submit.error',
      expect.objectContaining({ message: 'database down' })
    );
    expect(response.status).toBe(500);
    expect(response.body).toBe(JSON.stringify({ error: 'internal' }));
  });
});
