import type { InvocationContext } from '@azure/functions';
import { httpReqMock } from '../helpers/http';
import { auth_sessions_revoke } from '@auth/routes/auth_sessions_revoke.function';

jest.mock('@shared/http/authContext', () => ({
  extractAuthContext: jest.fn(),
}));

jest.mock('@auth/service/tokenService', () => ({
  revokeAllRefreshTokensForUser: jest.fn(),
}));

const { extractAuthContext } = require('@shared/http/authContext');
const { revokeAllRefreshTokensForUser } = require('@auth/service/tokenService');

const createContext = (): InvocationContext =>
  ({
    invocationId: 'auth-sessions-revoke-test',
    functionName: 'auth_sessions_revoke',
    traceContext: {},
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  }) as unknown as InvocationContext;

describe('auth_sessions_revoke route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when auth is missing', async () => {
    extractAuthContext.mockRejectedValue(new Error('unauthorized'));

    const response = await auth_sessions_revoke(
      httpReqMock({ method: 'POST' }),
      createContext()
    );

    expect(response.status).toBe(401);
    expect(revokeAllRefreshTokensForUser).not.toHaveBeenCalled();
  });

  it('revokes all refresh tokens for authenticated user', async () => {
    extractAuthContext.mockResolvedValue({
      userId: 'user-123',
      roles: ['user'],
      tier: 'free',
    });
    revokeAllRefreshTokensForUser.mockResolvedValue(3);

    const response = await auth_sessions_revoke(
      httpReqMock({
        method: 'POST',
        headers: { authorization: 'Bearer token' },
      }),
      createContext()
    );

    expect(response.status).toBe(200);
    expect((response.jsonBody as any).revoked).toBe(3);
    expect(revokeAllRefreshTokensForUser).toHaveBeenCalledWith('user-123');
  });
});
