import { jest } from '@jest/globals';

import { requireAuth } from '@auth/requireAuth';

jest.mock('@auth/verifyJwt', () => {
  const actual = jest.requireActual('@auth/verifyJwt');
  return {
    ...actual,
    verifyAuthorizationHeader: jest.fn(),
  };
});

const { AuthError } = jest.requireActual('@auth/verifyJwt');
const verifyMock = jest.mocked(require('@auth/verifyJwt').verifyAuthorizationHeader);

function createRequest(header?: string): any {
  const headers = new Map<string, string>();
  if (header) {
    headers.set('authorization', header);
  }
  return { headers, method: 'GET', params: {} };
}

function createContext(): any {
  return { log: jest.fn(), principal: undefined };
}

describe('requireAuth', () => {
  beforeEach(() => {
    verifyMock.mockReset();
  });

  it('returns 401 with WWW-Authenticate when verification fails', async () => {
    verifyMock.mockRejectedValue(new AuthError('invalid_request', 'Authorization header missing'));

    const handler = requireAuth(async () => ({ status: 200 }));
    const response = await handler(createRequest(), createContext());

    expect(response.status).toBe(401);
    expect(response.headers?.['WWW-Authenticate']).toContain('invalid_request');
  });

  it('attaches principal and invokes handler on success', async () => {
    const principal = { sub: 'user-123', raw: {} } as any;
    verifyMock.mockResolvedValue(principal);

    const handler = requireAuth(async (req, context) => {
      expect(req.principal).toBe(principal);
      expect(context.principal).toBe(principal);
      return { status: 200, body: { ok: true } };
    });

    const response = await handler(createRequest('Bearer token'), createContext());
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('maps unknown errors to invalid_token responses', async () => {
    verifyMock.mockRejectedValue(new Error('network error'));

    const handler = requireAuth(async () => ({ status: 200 }));
    const response = await handler(createRequest('Bearer token'), createContext());
    expect(response.headers?.['WWW-Authenticate']).toContain('invalid_token');
  });
});
