import { jest } from '@jest/globals';

import { authRequired, getPrincipalOrThrow, parseAuth } from '@shared/middleware/auth';

jest.mock('@auth/verifyJwt', () => {
  const actual = jest.requireActual('@auth/verifyJwt');
  return {
    ...actual,
    tryGetPrincipal: jest.fn(),
    verifyAuthorizationHeader: jest.fn(),
  };
});

const verifyMock = jest.mocked(require('@auth/verifyJwt').verifyAuthorizationHeader);
const tryGetPrincipalMock = jest.mocked(require('@auth/verifyJwt').tryGetPrincipal);

function createRequest(header?: string): any {
  const headers = new Map<string, string>();
  if (header) {
    headers.set('authorization', header);
  }
  return { headers };
}

describe('shared auth middleware', () => {
  beforeEach(() => {
    verifyMock.mockReset();
    tryGetPrincipalMock.mockReset();
  });

  it('parseAuth returns null when principal cannot be resolved', async () => {
    tryGetPrincipalMock.mockResolvedValue(null);
    const principal = await parseAuth(createRequest());
    expect(principal).toBeNull();
  });

  it('parseAuth returns principal when available', async () => {
    const principal = { sub: 'abc', raw: {} } as any;
    tryGetPrincipalMock.mockResolvedValue(principal);
    const result = await parseAuth(createRequest('Bearer token'));
    expect(result).toBe(principal);
  });

  it('getPrincipalOrThrow delegates to verifier', async () => {
    const principal = { sub: 'abc', raw: {} } as any;
    verifyMock.mockResolvedValue(principal);
    const result = await getPrincipalOrThrow(createRequest('Bearer token'));
    expect(result).toBe(principal);
    expect(verifyMock).toHaveBeenCalledTimes(1);
  });

  it('authRequired throws when principal is null', () => {
    expect(() => authRequired(null)).toThrowError();
  });
});
