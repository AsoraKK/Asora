import type { InvocationContext } from '@azure/functions';

import { flagContentRoute } from '@moderation/routes/flagContent';
import { flagContentHandler } from '@moderation/service/flagService';
import { httpReqMock } from '../helpers/http';

jest.mock('@moderation/service/flagService', () => ({
  flagContentHandler: jest.fn(),
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

describe('flagContent route', () => {
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
    const response = await flagContentRoute(httpReqMock({ method: 'OPTIONS' }), contextStub);
    expect(response.status).toBe(200);
    expect(response.body).toBe('');
  });

  it('returns 401 when authorization is missing', async () => {
    const handler = flagContentHandler as jest.MockedFunction<typeof flagContentHandler>;
    const response = await flagContentRoute(httpReqMock({ method: 'POST' }), contextStub);
    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    expect(response.body).toBe(JSON.stringify({ error: 'invalid_request' }));
  });

  it('delegates to handler for authorized requests', async () => {
    const handler = flagContentHandler as jest.MockedFunction<typeof flagContentHandler>;
    handler.mockResolvedValueOnce({ status: 204 });

    const request = authorizedRequest({ reason: 'spam' });
    const response = await flagContentRoute(request, contextStub);
    expect(handler).toHaveBeenCalledWith({
      request,
      context: contextStub,
      userId: 'moderator-1',
    });
    expect(response.status).toBe(204);
  });

  it('returns 500 when handler throws', async () => {
    const handler = flagContentHandler as jest.MockedFunction<typeof flagContentHandler>;
    handler.mockRejectedValueOnce(new Error('cosmos down'));

    const response = await flagContentRoute(authorizedRequest({ reason: 'spam' }), contextStub);
    expect(contextStub.log).toHaveBeenCalledWith(
      'moderation.flag.error',
      expect.objectContaining({ message: 'cosmos down' })
    );
    expect(response.status).toBe(500);
    expect(response.body).toBe(JSON.stringify({ error: 'internal' }));
  });
});
