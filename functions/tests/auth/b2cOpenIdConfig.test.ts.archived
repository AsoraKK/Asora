import { jest } from '@jest/globals';

import { getB2COpenIdConfig, resetOpenIdConfigCache } from '@auth/b2cOpenIdConfig';
import { resetAuthConfigForTesting } from '@auth/config';

jest.mock('undici', () => ({
  fetch: jest.fn(),
}));

const fetchMock = jest.mocked(require('undici').fetch);

const baseEnv = {
  B2C_TENANT: 'asora',
  B2C_POLICY: 'B2C_1_SIGNIN',
  B2C_EXPECTED_ISSUER: 'https://asora.b2clogin.com/asora.onmicrosoft.com/v2.0/',
  B2C_EXPECTED_AUDIENCE: 'api://asora-api',
  AUTH_CACHE_TTL_SECONDS: '3600',
};

function setEnv(overrides: Record<string, string> = {}): void {
  for (const key of Object.keys(baseEnv)) {
    delete process.env[key];
  }
  Object.assign(process.env, baseEnv, overrides);
  resetAuthConfigForTesting();
  resetOpenIdConfigCache();
  fetchMock.mockReset();
}

describe('b2cOpenIdConfig', () => {
  const discoveryDocument = {
    issuer: baseEnv.B2C_EXPECTED_ISSUER,
    jwks_uri: 'https://asora.b2clogin.com/discovery/keys',
    token_endpoint: 'https://asora.b2clogin.com/token',
    end_session_endpoint: 'https://asora.b2clogin.com/logout',
  };

  beforeEach(() => {
    jest.useRealTimers();
    setEnv();
  });

  afterAll(() => {
    resetAuthConfigForTesting();
    resetOpenIdConfigCache();
  });

  it('fetches discovery document once and caches result until TTL expires', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => discoveryDocument });

    const first = await getB2COpenIdConfig();
    const second = await getB2COpenIdConfig();

    expect(first).toEqual(discoveryDocument);
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(Date.now() + 3_600_000 + 1);
    fetchMock.mockResolvedValue({ ok: true, json: async () => discoveryDocument });

    const refreshed = await getB2COpenIdConfig();
    expect(refreshed).toEqual(discoveryDocument);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    nowSpy.mockRestore();
  });

  it('retries transient 5xx errors then fails with last error', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 502 })
      .mockResolvedValue({ ok: true, json: async () => discoveryDocument });

    const result = await getB2COpenIdConfig();
    expect(result).toEqual(discoveryDocument);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    resetOpenIdConfigCache();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: false, status: 503 });

    await expect(getB2COpenIdConfig()).rejects.toThrow('Transient discovery error');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('throws when issuer mismatches expected value in strict mode', async () => {
    setEnv({ B2C_EXPECTED_ISSUER: 'https://different-issuer/' });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ ...discoveryDocument, issuer: 'https://other/' }),
    });

    await expect(getB2COpenIdConfig()).rejects.toThrow('Issuer mismatch for policy discovery');
  });
});
