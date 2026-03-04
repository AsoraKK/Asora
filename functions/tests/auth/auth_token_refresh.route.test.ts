import type { InvocationContext } from '@azure/functions';
import { httpReqMock } from '../helpers/http';
import { auth_token_refresh } from '@auth/routes/auth_token_refresh.function';

jest.mock('@auth/service/tokenService', () => ({
  refreshTokensWithRotation: jest.fn(),
}));

const { refreshTokensWithRotation } = require('@auth/service/tokenService');

const createContext = (): InvocationContext =>
  ({
    invocationId: 'auth-refresh-test',
    functionName: 'auth_token_refresh',
    traceContext: {},
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  }) as unknown as InvocationContext;

describe('auth_token_refresh route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when body is missing', async () => {
    const context = createContext();
    const response = await auth_token_refresh(httpReqMock({ method: 'POST' }), context);

    expect(response.status).toBe(400);
    expect(refreshTokensWithRotation).not.toHaveBeenCalled();
  });

  it('returns 400 when refresh_token is missing', async () => {
    const context = createContext();
    const response = await auth_token_refresh(
      httpReqMock({
        method: 'POST',
        body: {},
      }),
      context
    );

    expect(response.status).toBe(400);
    expect(refreshTokensWithRotation).not.toHaveBeenCalled();
  });

  it('returns rotated token pair on success', async () => {
    refreshTokensWithRotation.mockResolvedValue({
      access_token: 'access-1',
      refresh_token: 'refresh-2',
      token_type: 'Bearer',
      expires_in: 900,
      scope: 'read write',
    });

    const context = createContext();
    const response = await auth_token_refresh(
      httpReqMock({
        method: 'POST',
        body: { refresh_token: 'refresh-1' },
      }),
      context
    );

    expect(response.status).toBe(200);
    expect(response.jsonBody).toMatchObject({
      access_token: 'access-1',
      refresh_token: 'refresh-2',
      token_type: 'Bearer',
      expires_in: 900,
      scope: 'read write',
    });
    expect(refreshTokensWithRotation).toHaveBeenCalledWith(
      'refresh-1',
      expect.any(String),
      expect.any(String)
    );
  });

  it('maps revoked token errors to TOKEN_REVOKED', async () => {
    refreshTokensWithRotation.mockRejectedValue(new Error('Refresh token has been revoked or is invalid'));

    const context = createContext();
    const response = await auth_token_refresh(
      httpReqMock({
        method: 'POST',
        body: { refresh_token: 'refresh-revoked' },
      }),
      context
    );

    expect(response.status).toBe(401);
    expect((response.jsonBody as any).error.code).toBe('TOKEN_REVOKED');
  });

  it('maps expired token errors to TOKEN_EXPIRED', async () => {
    refreshTokensWithRotation.mockRejectedValue(new Error('Refresh token expired'));

    const context = createContext();
    const response = await auth_token_refresh(
      httpReqMock({
        method: 'POST',
        body: { refresh_token: 'refresh-expired' },
      }),
      context
    );

    expect(response.status).toBe(401);
    expect((response.jsonBody as any).error.code).toBe('TOKEN_EXPIRED');
  });
});
