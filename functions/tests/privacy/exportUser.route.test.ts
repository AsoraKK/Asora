import type { InvocationContext } from '@azure/functions';

import { exportUserRoute } from '@privacy/routes/exportUser';
import { exportUserHandler } from '@privacy/service/exportService';
import { httpReqMock } from '../helpers/http';

jest.mock('@privacy/service/exportService', () => ({
  exportUserHandler: jest.fn(),
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
    method: 'GET',
    headers: { authorization: 'Bearer valid-token' },
  });
}

describe('exportUser route', () => {
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
      return { kind: 'user', sub: 'user-321', claims: {} } as any;
    });
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
    expect(response.body).toBe(JSON.stringify({ error: 'invalid_request' }));
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
    expect(contextStub.log).toHaveBeenCalledWith(
      'privacy.export.error',
      expect.objectContaining({ message: 'queue offline' })
    );
    expect(response.status).toBe(500);
    expect(response.body).toBe(JSON.stringify({ error: 'internal' }));
  });
});
