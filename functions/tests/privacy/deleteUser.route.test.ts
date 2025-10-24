import type { InvocationContext } from '@azure/functions';
import jwt from 'jsonwebtoken';

import { deleteUserRoute } from '@privacy/routes/deleteUser';
import { deleteUserHandler } from '@privacy/service/deleteService';
import { httpReqMock } from '../helpers/http';

jest.mock('@privacy/service/deleteService', () => ({
  deleteUserHandler: jest.fn(),
}));

const originalSecret = process.env.JWT_SECRET;
const contextStub = { log: jest.fn() } as unknown as InvocationContext;

function token() {
  return jwt.sign({ sub: 'user-789' }, process.env.JWT_SECRET!, { algorithm: 'HS256' });
}

function authorizedRequest() {
  return httpReqMock({
    method: 'DELETE',
    headers: { authorization: `Bearer ${token()}` },
  });
}

describe('deleteUser route', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    jest.clearAllMocks();
    contextStub.log = jest.fn();
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('returns CORS response for OPTIONS', async () => {
    const response = await deleteUserRoute(httpReqMock({ method: 'OPTIONS' }), contextStub);
    expect(response.status).toBe(200);
    expect(response.body).toBe('');
  });

  it('rejects unsupported methods', async () => {
    const response = await deleteUserRoute(httpReqMock({ method: 'GET' }), contextStub);
    expect(response.status).toBe(405);
    expect(JSON.parse(response.body)).toMatchObject({
      success: false,
      message: 'Method GET not allowed',
    });
  });

  it('returns 401 when authorization header is missing', async () => {
    const handler = deleteUserHandler as jest.MockedFunction<typeof deleteUserHandler>;
    const response = await deleteUserRoute(httpReqMock({ method: 'DELETE' }), contextStub);
    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    expect(response.body).toBe(JSON.stringify({ error: 'unauthorized' }));
  });

  it('delegates to handler on success', async () => {
    const handler = deleteUserHandler as jest.MockedFunction<typeof deleteUserHandler>;
    handler.mockResolvedValueOnce({ status: 202, jsonBody: { jobId: 'del-123' } });

    const request = authorizedRequest();
    const response = await deleteUserRoute(request, contextStub);
    expect(handler).toHaveBeenCalledWith({
      request,
      context: contextStub,
      userId: 'user-789',
    });
    expect(response.status).toBe(202);
    expect(response.jsonBody).toEqual({ jobId: 'del-123' });
  });

  it('returns 500 when handler throws', async () => {
    const handler = deleteUserHandler as jest.MockedFunction<typeof deleteUserHandler>;
    handler.mockRejectedValueOnce(new Error('storage error'));

    const response = await deleteUserRoute(authorizedRequest(), contextStub);
    expect(contextStub.log).toHaveBeenCalledWith('privacy.delete.error', expect.any(Error));
    expect(response.status).toBe(500);
    expect(response.body).toBe(JSON.stringify({ error: 'internal' }));
  });
});
