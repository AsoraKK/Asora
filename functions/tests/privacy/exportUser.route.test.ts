import type { InvocationContext } from '@azure/functions';
import jwt from 'jsonwebtoken';

import { exportUserRoute } from '@privacy/routes/exportUser';
import { exportUserHandler } from '@privacy/service/exportService';
import { httpReqMock } from '../helpers/http';

jest.mock('@privacy/service/exportService', () => ({
  exportUserHandler: jest.fn(),
}));

const originalSecret = process.env.JWT_SECRET;
const contextStub = { log: jest.fn() } as unknown as InvocationContext;

function token() {
  return jwt.sign({ sub: 'user-321' }, process.env.JWT_SECRET!, { algorithm: 'HS256' });
}

function authorizedRequest() {
  return httpReqMock({
    method: 'GET',
    headers: { authorization: `Bearer ${token()}` },
  });
}

describe('exportUser route', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    jest.clearAllMocks();
    contextStub.log = jest.fn();
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('returns CORS response for OPTIONS', async () => {
    const response = await exportUserRoute(httpReqMock({ method: 'OPTIONS' }), contextStub);
    expect(response.status).toBe(200);
    expect(response.body).toBe('');
  });

  it('rejects unsupported methods', async () => {
    const response = await exportUserRoute(httpReqMock({ method: 'POST' }), contextStub);
    expect(response.status).toBe(405);
    expect(JSON.parse(response.body)).toMatchObject({
      success: false,
      message: 'Method POST not allowed',
    });
  });

  it('returns 401 when guest principal', async () => {
    const handler = exportUserHandler as jest.MockedFunction<typeof exportUserHandler>;
    const response = await exportUserRoute(httpReqMock({ method: 'GET' }), contextStub);
    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    expect(response.body).toBe(JSON.stringify({ error: 'unauthorized' }));
  });

  it('delegates to handler for authorized requests', async () => {
    const handler = exportUserHandler as jest.MockedFunction<typeof exportUserHandler>;
    handler.mockResolvedValueOnce({ status: 200, jsonBody: { link: 'https://download' } });

    const request = authorizedRequest();
    const response = await exportUserRoute(request, contextStub);
    expect(handler).toHaveBeenCalledWith({
      request,
      context: contextStub,
      userId: 'user-321',
    });
    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual({ link: 'https://download' });
  });

  it('returns 500 when handler throws', async () => {
    const handler = exportUserHandler as jest.MockedFunction<typeof exportUserHandler>;
    handler.mockRejectedValueOnce(new Error('queue offline'));

    const response = await exportUserRoute(authorizedRequest(), contextStub);
    expect(contextStub.log).toHaveBeenCalledWith('privacy.export.error', expect.any(Error));
    expect(response.status).toBe(500);
    expect(response.body).toBe(JSON.stringify({ error: 'internal' }));
  });
});
