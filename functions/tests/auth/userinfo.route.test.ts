import type { InvocationContext } from '@azure/functions';
import jwt from 'jsonwebtoken';

import { userInfoRoute } from '@auth/routes/userinfo';
import { userInfoHandler } from '@auth/service/userinfoService';
import { httpReqMock } from '../helpers/http';

jest.mock('@auth/service/userinfoService', () => ({
  userInfoHandler: jest.fn(),
}));

const originalSecret = process.env.JWT_SECRET;
const contextStub = { log: jest.fn() } as unknown as InvocationContext;

function token() {
  return jwt.sign({ sub: 'user-456' }, process.env.JWT_SECRET!, { algorithm: 'HS256' });
}

function authenticatedRequest(method = 'GET') {
  return httpReqMock({
    method,
    headers: { authorization: `Bearer ${token()}` },
  });
}

describe('userinfo route', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
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
    expect(response.body).toBe(JSON.stringify({ error: 'unauthorized' }));
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
