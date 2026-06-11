jest.mock('./appInsights', () => ({
  trackException: jest.fn(),
}));

import { trackException } from './appInsights';
import { validateStartupEnvironment } from './startup-validation';

const trackExceptionMock = jest.mocked(trackException);

const baseEnv: Record<string, string> = {
  COSMOS_CONNECTION_STRING: 'AccountEndpoint=https://example/;',
  JWT_SECRET: '0123456789abcdef0123456789abcdef',
  JWT_ISSUER: 'asora-auth',
  HIVE_API_KEY: 'hive-test-key',
  KV_URL: 'https://example.vault.azure.net/',
  FCM_PROJECT_ID: 'project-id',
  FCM_CLIENT_EMAIL: 'fcm@example.com',
  FCM_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----',
  APPLICATIONINSIGHTS_CONNECTION_STRING: 'InstrumentationKey=test',
  COSMOS_DATABASE_NAME: 'asora',
  CORS_ALLOWED_ORIGINS: 'https://lythaus.co',
  RATE_LIMITS_ENABLED: 'true',
  RATE_LIMIT_CONTAINER: 'rate-limits',
  AUDIT_HMAC_KEY: 'audit-hmac-key',
  STRICT_STARTUP_VALIDATION: 'true',
  NODE_ENV: 'test',
};

function applyBaseEnv(): void {
  for (const [key, value] of Object.entries(baseEnv)) {
    process.env[key] = value;
  }
  delete process.env.B2C_TENANT;
  delete process.env.B2C_POLICY;
  delete process.env.B2C_EXPECTED_ISSUER;
  delete process.env.B2C_EXPECTED_AUDIENCE;
}

describe('validateStartupEnvironment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    applyBaseEnv();
  });

  afterEach(() => {
    for (const key of Object.keys(baseEnv)) {
      delete process.env[key];
    }
    delete process.env.B2C_TENANT;
    delete process.env.B2C_POLICY;
    delete process.env.B2C_EXPECTED_ISSUER;
    delete process.env.B2C_EXPECTED_AUDIENCE;
  });

  it('does not require deprecated B2C env vars', () => {
    expect(() => validateStartupEnvironment()).not.toThrow();
    expect(trackExceptionMock).not.toHaveBeenCalled();
  });

  it('still fails when JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET;

    expect(() => validateStartupEnvironment()).toThrow(/JWT_SECRET/);
    expect(trackExceptionMock).toHaveBeenCalled();
  });
});
