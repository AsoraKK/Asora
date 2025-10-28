import type { InvocationContext } from '@azure/functions';

import { deleteUserRoute } from '@privacy/routes/deleteUser';
import { deleteUserHandler } from '@privacy/service/deleteService';
import { httpReqMock } from '../helpers/http';

jest.mock('@privacy/service/deleteService', () => ({
  deleteUserHandler: jest.fn(),
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

function authorizedRequest() {
  return httpReqMock({
    method: 'DELETE',
    headers: { authorization: 'Bearer valid-token' },
  });
}

describe('deleteUser route', () => {
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
      return { kind: 'user', sub: 'user-789', claims: {} } as any;
    });
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
    expect(response.body).toBe(JSON.stringify({ error: 'invalid_request' }));
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
    expect(contextStub.log).toHaveBeenCalledWith(
      'privacy.delete.error',
      expect.objectContaining({ message: 'storage error' })
    );
    expect(response.status).toBe(500);
    expect(response.body).toBe(JSON.stringify({ error: 'internal' }));
  });
});
