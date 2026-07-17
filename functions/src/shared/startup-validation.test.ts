jest.mock('./appInsights', () => ({
  trackException: jest.fn(),
}));

import { trackException } from './appInsights';
import { validateStartupEnvironment } from './startup-validation';

const trackExceptionMock = jest.mocked(trackException);

const baseEnv: Record<string, string> = {
  COSMOS_CONNECTION_STRING: 'AccountEndpoint=https://example/;',
  JWT_SECRET: '0123456789abcdef0123456789abcdef',
  INVITE_CODE_PEPPER: 'invite-pepper-0123456789abcdef0123456789',
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
  ORIGIN_GATEWAY_AUTH_MODE: 'off',
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
  delete process.env.APP_ENV;
  delete process.env.APP_ORIGIN;
  delete process.env.ACS_EMAIL_ENDPOINT;
  delete process.env.AUTH_EMAIL_FROM_ADDRESS;
  delete process.env.AUTH_EMAIL_FROM_NAME;
  delete process.env.EMAIL_TOKEN_HMAC_SECRET;
  delete process.env.AUTH_EMAIL_CLIENT_ID;
  delete process.env.GOOGLE_OAUTH_CLIENT_ID;
  delete process.env.GOOGLE_OAUTH_CLIENT_SECRET_WEB;
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
    delete process.env.APP_ENV;
    delete process.env.APP_ORIGIN;
    delete process.env.ACS_EMAIL_ENDPOINT;
    delete process.env.AUTH_EMAIL_FROM_ADDRESS;
    delete process.env.AUTH_EMAIL_FROM_NAME;
    delete process.env.EMAIL_TOKEN_HMAC_SECRET;
    delete process.env.AUTH_EMAIL_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET_WEB;
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

  it('fails when gateway enforcement is enabled without required tokens', () => {
    process.env.ORIGIN_GATEWAY_AUTH_MODE = 'enforce';
    delete process.env.ORIGIN_GATEWAY_TOKEN;

    expect(() => validateStartupEnvironment()).toThrow(/ORIGIN_GATEWAY_TOKEN/);
  });

  it('fails closed when MVP email configuration is missing', () => {
    process.env.APP_ENV = 'mvp';

    expect(() => validateStartupEnvironment()).toThrow(/APP_ORIGIN/);
    expect(trackExceptionMock).toHaveBeenCalled();
  });

  it('accepts the canonical MVP email configuration', () => {
    process.env.APP_ENV = 'mvp';
    process.env.ORIGIN_GATEWAY_AUTH_MODE = 'observe';
    process.env.ORIGIN_GATEWAY_TOKEN = 'current-origin-token';
    process.env.ORIGIN_GATEWAY_TOKEN_NEXT = 'next-origin-token';
    process.env.ORIGIN_OPERATIONAL_TOKEN = 'operational-health-token';
    process.env.ORIGIN_GATEWAY_LEGACY_ALLOWLIST = '[]';
    process.env.APP_ORIGIN = 'https://app.lythaus.co';
    process.env.ACS_EMAIL_ENDPOINT = 'https://lythaus-mvp.communication.azure.com/';
    process.env.AUTH_EMAIL_FROM_ADDRESS = 'no-reply@mail.lythaus.co';
    process.env.AUTH_EMAIL_FROM_NAME = 'Lythaus';
    process.env.EMAIL_TOKEN_HMAC_SECRET = 'email-token-hmac-secret-with-32-chars';
    process.env.AUTH_EMAIL_CLIENT_ID = 'asora-mobile-app';
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'public-client.apps.googleusercontent.com';
    process.env.GOOGLE_OAUTH_CLIENT_SECRET_WEB = 'google-client-secret-for-test';

    expect(() => validateStartupEnvironment()).not.toThrow();
  });

  it('fails closed when the MVP Google client configuration is missing', () => {
    process.env.APP_ENV = 'mvp';
    process.env.APP_ORIGIN = 'https://app.lythaus.co';
    process.env.ACS_EMAIL_ENDPOINT = 'https://lythaus-mvp.communication.azure.com/';
    process.env.AUTH_EMAIL_FROM_ADDRESS = 'no-reply@mail.lythaus.co';
    process.env.AUTH_EMAIL_FROM_NAME = 'Lythaus';
    process.env.EMAIL_TOKEN_HMAC_SECRET = 'email-token-hmac-secret-with-32-chars';
    process.env.AUTH_EMAIL_CLIENT_ID = 'asora-mobile-app';

    expect(() => validateStartupEnvironment()).toThrow(/GOOGLE_OAUTH_CLIENT_ID/);
  });
});
