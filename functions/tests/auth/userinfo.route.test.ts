import type { InvocationContext } from '@azure/functions';

import { userInfoRoute } from '@auth/routes/userinfo';
import { userInfoHandler } from '@auth/service/userinfoService';
import { httpReqMock } from '../helpers/http';

jest.mock('@auth/service/userinfoService', () => ({
  userInfoHandler: jest.fn(),
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

function authenticatedRequest(method = 'GET') {
  return httpReqMock({
    method,
    headers: { authorization: 'Bearer valid-token' },
  });
}

describe('userinfo route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyMock.mockImplementation(async header => {
      if (!header) {
        throw new AuthError('invalid_request', 'Authorization header missing');
      }
      if (header.includes('invalid')) {
        throw new AuthError('invalid_token', 'Unable to validate token');
      }
      return { kind: 'user', sub: 'user-456', claims: {} } as any;
    });
  });

  it('returns CORS response for OPTIONS', async () => {
    const response = await userInfoRoute(httpReqMock({ method: 'OPTIONS' }), contextStub);
    expect(response.status).toBe(200);
    expect(response.body).toBe('');
  });

  it('rejects methods other than GET/POST', async () => {
    const response = await userInfoRoute(httpReqMock({ method: 'PUT' }), contextStub);
    expect(response.status).toBe(405);
    expect(JSON.parse(response.body)).toMatchObject({
      success: false,
      message: 'Method PUT not allowed',
    });
  });

  it('returns 401 for guests', async () => {
    const handler = userInfoHandler as jest.MockedFunction<typeof userInfoHandler>;
    const response = await userInfoRoute(httpReqMock({ method: 'GET' }), contextStub);
    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    expect(response.body).toBe(JSON.stringify({ error: 'invalid_request' }));
  });

  it('delegates to handler for authorized users', async () => {
    const handler = userInfoHandler as jest.MockedFunction<typeof userInfoHandler>;
    handler.mockResolvedValueOnce({ status: 200, jsonBody: { sub: 'user-456' } });

    const request = authenticatedRequest('POST');
    const response = await userInfoRoute(request, contextStub);
    expect(handler).toHaveBeenCalledWith(request, contextStub);
    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual({ sub: 'user-456' });
  });
});
