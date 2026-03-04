import { validateStartupEnvironment, validateEasyAuthPresence } from '../../src/shared/startup-validation';
import { trackException } from '../../src/shared/appInsights';

jest.mock('../../src/shared/appInsights', () => ({
  trackException: jest.fn(),
}));

const mockTrackException = trackException as jest.MockedFunction<typeof trackException>;

describe('startup-validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('logs critical message when required env vars are missing', () => {
    // Clear all required env vars
    delete process.env.COSMOS_CONNECTION_STRING;
    delete process.env.JWT_SECRET;
    delete process.env.JWT_ISSUER;
    delete process.env.HIVE_API_KEY;
    delete process.env.KV_URL;
    delete process.env.B2C_TENANT;
    delete process.env.B2C_POLICY;
    delete process.env.B2C_EXPECTED_ISSUER;
    delete process.env.B2C_EXPECTED_AUDIENCE;
    delete process.env.FCM_PROJECT_ID;
    delete process.env.FCM_CLIENT_EMAIL;
    delete process.env.FCM_PRIVATE_KEY;

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    validateStartupEnvironment();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[STARTUP] CRITICAL')
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('COSMOS_CONNECTION_STRING')
    );
    expect(logSpy).toHaveBeenCalledWith('[STARTUP] Environment validation complete');

    errorSpy.mockRestore();
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('warns about missing optional env vars', () => {
    // Set all required vars
    process.env.COSMOS_CONNECTION_STRING = 'test';
    process.env.JWT_SECRET = 'test';
    process.env.JWT_ISSUER = 'test';
    process.env.HIVE_API_KEY = 'test';
    process.env.KV_URL = 'test';
    process.env.B2C_TENANT = 'test';
    process.env.B2C_POLICY = 'test';
    process.env.B2C_EXPECTED_ISSUER = 'test';
    process.env.B2C_EXPECTED_AUDIENCE = 'test';
    process.env.FCM_PROJECT_ID = 'test';
    process.env.FCM_CLIENT_EMAIL = 'test';
    process.env.FCM_PRIVATE_KEY = 'test';
    // Clear optional vars
    delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    delete process.env.COSMOS_DATABASE_NAME;
    delete process.env.CORS_ALLOWED_ORIGINS;
    delete process.env.RATE_LIMITS_ENABLED;
    delete process.env.RATE_LIMIT_CONTAINER;

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    validateStartupEnvironment();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[STARTUP] Optional env vars not set')
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('APPLICATIONINSIGHTS_CONNECTION_STRING')
    );
    // Should NOT log a critical error when all required vars are present
    expect(errorSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('[STARTUP] Environment validation complete');

    warnSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('completes without warnings when all vars are set', () => {
    process.env.COSMOS_CONNECTION_STRING = 'test';
    process.env.JWT_SECRET = 'test';
    process.env.JWT_ISSUER = 'test';
    process.env.HIVE_API_KEY = 'test';
    process.env.KV_URL = 'test';
    process.env.B2C_TENANT = 'test';
    process.env.B2C_POLICY = 'test';
    process.env.B2C_EXPECTED_ISSUER = 'test';
    process.env.B2C_EXPECTED_AUDIENCE = 'test';
    process.env.FCM_PROJECT_ID = 'test';
    process.env.FCM_CLIENT_EMAIL = 'test';
    process.env.FCM_PRIVATE_KEY = 'test';
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING = 'test';
    process.env.COSMOS_DATABASE_NAME = 'test';
    process.env.CORS_ALLOWED_ORIGINS = 'test';
    process.env.RATE_LIMITS_ENABLED = 'true';
    process.env.RATE_LIMIT_CONTAINER = 'test';
    process.env.AUDIT_HMAC_KEY = 'test-hmac-key';

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    validateStartupEnvironment();

    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('[STARTUP] Environment validation complete');

    errorSpy.mockRestore();
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('tracks exception via appInsights when required vars are missing', () => {
    delete process.env.COSMOS_CONNECTION_STRING;
    delete process.env.JWT_SECRET;

    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();

    validateStartupEnvironment();

    expect(mockTrackException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ severity: 'critical', component: 'startup' })
    );

    jest.restoreAllMocks();
  });

  it('throws when required vars are missing in strict production mode', () => {
    delete process.env.COSMOS_CONNECTION_STRING;
    delete process.env.JWT_SECRET;
    process.env.NODE_ENV = 'production';

    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();

    expect(() => validateStartupEnvironment()).toThrow('[STARTUP] CRITICAL');

    jest.restoreAllMocks();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// EasyAuth drift detection
// ═══════════════════════════════════════════════════════════════════════
describe('validateEasyAuthPresence', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does nothing in non-production environments', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.WEBSITE_AUTH_ENABLED;

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    validateEasyAuthPresence();

    expect(errorSpy).not.toHaveBeenCalled();
    expect(mockTrackException).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('does nothing in development', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.WEBSITE_AUTH_ENABLED;

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    validateEasyAuthPresence();

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('warns in production when WEBSITE_AUTH_ENABLED is missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.WEBSITE_AUTH_ENABLED;

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    validateEasyAuthPresence();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('WEBSITE_AUTH_ENABLED')
    );
    expect(mockTrackException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        severity: 'critical',
        check: 'easyauth_drift',
      })
    );
    errorSpy.mockRestore();
  });

  it('warns in staging when WEBSITE_AUTH_ENABLED is missing', () => {
    process.env.NODE_ENV = 'staging';
    delete process.env.WEBSITE_AUTH_ENABLED;

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    validateEasyAuthPresence();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('WEBSITE_AUTH_ENABLED')
    );
    errorSpy.mockRestore();
  });

  it('warns when APP_ENV=production and WEBSITE_AUTH_ENABLED is missing', () => {
    delete process.env.NODE_ENV;
    process.env.APP_ENV = 'production';
    delete process.env.WEBSITE_AUTH_ENABLED;

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    validateEasyAuthPresence();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('WEBSITE_AUTH_ENABLED')
    );
    errorSpy.mockRestore();
  });

  it('does NOT warn when WEBSITE_AUTH_ENABLED=True in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.WEBSITE_AUTH_ENABLED = 'True';

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    validateEasyAuthPresence();

    expect(errorSpy).not.toHaveBeenCalled();
    expect(mockTrackException).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('accepts lowercase "true" for WEBSITE_AUTH_ENABLED', () => {
    process.env.NODE_ENV = 'production';
    process.env.WEBSITE_AUTH_ENABLED = 'true';

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    validateEasyAuthPresence();

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
