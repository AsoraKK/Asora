import { jest } from '@jest/globals';

import { resetAuthConfigForTesting } from '@auth/config';
import { getJwkByKid, resetJwksCache } from '@auth/jwks';

jest.mock('undici', () => ({
  fetch: jest.fn(),
}));

jest.mock('@auth/b2cOpenIdConfig', () => ({
  getB2COpenIdConfig: jest.fn().mockResolvedValue({
    issuer: 'https://issuer/',
    jwks_uri: 'https://issuer/jwks',
    token_endpoint: 'https://issuer/token',
  }),
}));

const fetchMock = jest.mocked(require('undici').fetch);

const jwk = {
  kty: 'RSA',
  kid: 'key-1',
  use: 'sig',
  e: 'AQAB',
  n: 'sXchAJ8Q0UppSk0WSd4hFglY4E8h0l3PgniTqOwHNQ3QFmLijYHQeTLAJEup6MvF0GkV5w7wZ4F5jEzXk07F6Y9MkvBb7U2BGLRDWw37C3ItEZ1U7XVPBfxDN9amPnnfPyjEi-1XBl-B6OkJ4MSKc5g9ITVnXsn1uCqItgDQcRqVGEtVgJ8rtOItSrbkZNe6KJaD6DGm14HPjbKXfPJDADGLwWz37HZz7-wosCX1T-HOdGmS3w0LpuwZ8KEwPxKx73QpLq8l2yxiWGiA7jpI5g-MFmaK4pewe21Q_BVu8a-ioYb81s4AnN_Hn61yoiarO_XvxpP8YF6ohwL7M9Jw',
};

function setEnv(overrides: Record<string, string> = {}): void {
  Object.assign(process.env, {
    B2C_TENANT: 'asora',
    B2C_POLICY: 'B2C_1_TEST',
    B2C_EXPECTED_ISSUER: 'https://issuer/',
    B2C_EXPECTED_AUDIENCE: 'api://asora',
    AUTH_CACHE_TTL_SECONDS: '60',
    ...overrides,
  });
  resetAuthConfigForTesting();
  resetJwksCache();
  fetchMock.mockReset();
}

describe('jwks', () => {
  beforeEach(() => {
    setEnv();
  });

  afterAll(() => {
    resetAuthConfigForTesting();
    resetJwksCache();
  });

  it('fetches JWKS once and caches keys by kid', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ keys: [jwk] }) });

    const key = await getJwkByKid('key-1', 'RS256');
    expect(key).toMatchObject(jwk);

    const cached = await getJwkByKid('key-1', 'RS256');
    expect(cached).toBe(key);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refreshes JWKS when kid is missing and then returns key', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ keys: [{ ...jwk, kid: 'other' }] }) })
      .mockResolvedValue({ ok: true, json: async () => ({ keys: [jwk] }) });

    const key = await getJwkByKid('key-1', 'RS256');
    expect(key.kid).toBe('key-1');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects keys signed with disallowed algorithms', async () => {
    setEnv({ B2C_ALLOWED_ALGS: 'RS256' });
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ keys: [jwk] }) });

    await expect(getJwkByKid('key-1', 'RS512')).rejects.toThrow('Disallowed JWT signing algorithm');
  });
});
