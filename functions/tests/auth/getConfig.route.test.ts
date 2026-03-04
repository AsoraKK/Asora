import { HttpRequest, InvocationContext } from '@azure/functions';
import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

import { getAuthConfig } from '@auth/routes/getConfig';

// Mock Azure SDK modules
jest.mock('@azure/identity');
jest.mock('@azure/keyvault-secrets');

const mockContext = {
  log: jest.fn(),
  error: jest.fn(),
} as unknown as InvocationContext;

const mockRequest = {} as HttpRequest;

describe('GET /config/auth', () => {
  let mockSecretClient: jest.Mocked<SecretClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock DefaultAzureCredential
    (DefaultAzureCredential as jest.Mock).mockImplementation(() => ({}));

    // Mock SecretClient
    mockSecretClient = {
      getSecret: jest.fn(),
    } as any;

    (SecretClient as jest.Mock).mockImplementation(() => mockSecretClient);

    // Set required env var
    process.env.KV_URL = 'https://test-vault.vault.azure.net/';
  });

  afterEach(() => {
    delete process.env.KV_URL;
  });

  it('should return B2C configuration when all secrets are present', async () => {
    // Setup mock responses
    const mockSecrets = {
      'b2c-tenant': { value: 'asoraauth.onmicrosoft.com' },
      'b2c-mobile-client-id': { value: 'd993e983-9f6e-44b4-b098-607af033832f' },
      'b2c-signin-policy': { value: 'B2C_1_signupsignin' },
      'b2c-authority-host': { value: 'asoraauth.b2clogin.com' },
      'b2c-scopes': { value: 'openid offline_access email profile' },
      'b2c-redirect-uri-android': { value: 'com.asora.app://oauth/callback' },
      'b2c-redirect-uri-ios': { value: 'msald993e983-9f6e-44b4-b098-607af033832f://auth' },
      'b2c-google-idp-hint': { value: 'Google' },
    };

    mockSecretClient.getSecret.mockImplementation((secretName: string) => {
      return Promise.resolve(mockSecrets[secretName as keyof typeof mockSecrets]);
    });

    const response = await getAuthConfig(mockRequest, mockContext);

    expect(response.status).toBe(200);
    const body = JSON.parse(response.body as string);
    expect(body).toEqual({
      tenant: 'asoraauth.onmicrosoft.com',
      clientId: 'd993e983-9f6e-44b4-b098-607af033832f',
      policy: 'B2C_1_signupsignin',
      authorityHost: 'asoraauth.b2clogin.com',
      scopes: ['openid', 'offline_access', 'email', 'profile'],
      redirectUris: {
        android: 'com.asora.app://oauth/callback',
        ios: 'msald993e983-9f6e-44b4-b098-607af033832f://auth',
      },
      knownAuthorities: ['asoraauth.b2clogin.com'],
      googleIdpHint: 'Google',
    });

    expect(mockContext.log).toHaveBeenCalledWith('auth.config.fetched', {
      tenant: 'asoraauth.onmicrosoft.com',
      policy: 'B2C_1_signupsignin',
      clientId: 'd993e983...',
    });
  });

  it('should return 500 when KV_URL environment variable is missing', async () => {
    delete process.env.KV_URL;

    const response = await getAuthConfig(mockRequest, mockContext);

    expect(response.status).toBe(500);
    const body = JSON.parse(response.body as string);
    expect(body).toEqual({
      error: 'Configuration service unavailable',
    });
    expect(mockContext.error).toHaveBeenCalledWith('KV_URL environment variable not configured');
  });

  it('should return 500 when Key Vault access fails', async () => {
    mockSecretClient.getSecret.mockRejectedValue(new Error('Key Vault access denied'));

    const response = await getAuthConfig(mockRequest, mockContext);

    expect(response.status).toBe(500);
    const body = JSON.parse(response.body as string);
    expect(body).toEqual({
      error: 'Failed to load auth configuration',
    });
    expect(mockContext.error).toHaveBeenCalledWith('auth.config.error', expect.any(Error));
  });

  it('should handle missing optional googleIdpHint secret', async () => {
    const mockSecrets = {
      'b2c-tenant': { value: 'asoraauth.onmicrosoft.com' },
      'b2c-mobile-client-id': { value: 'd993e983-9f6e-44b4-b098-607af033832f' },
      'b2c-signin-policy': { value: 'B2C_1_signupsignin' },
      'b2c-authority-host': { value: 'asoraauth.b2clogin.com' },
      'b2c-scopes': { value: 'openid offline_access email profile' },
      'b2c-redirect-uri-android': { value: 'com.asora.app://oauth/callback' },
      'b2c-redirect-uri-ios': { value: 'msald993e983-9f6e-44b4-b098-607af033832f://auth' },
    };

    mockSecretClient.getSecret.mockImplementation((secretName: string) => {
      if (secretName === 'b2c-google-idp-hint') {
        return Promise.reject(new Error('Secret not found'));
      }
      return Promise.resolve(mockSecrets[secretName as keyof typeof mockSecrets]);
    });

    const response = await getAuthConfig(mockRequest, mockContext);

    expect(response.status).toBe(200);
    const body = JSON.parse(response.body as string);
    expect(body.googleIdpHint).toBeUndefined();
  });

  it('should parse space-separated scopes correctly', async () => {
    const mockSecrets = {
      'b2c-tenant': { value: 'test.onmicrosoft.com' },
      'b2c-mobile-client-id': { value: 'test-client-id' },
      'b2c-signin-policy': { value: 'B2C_1_test' },
      'b2c-authority-host': { value: 'test.b2clogin.com' },
      'b2c-scopes': { value: 'scope1 scope2 scope3' },
      'b2c-redirect-uri-android': { value: 'com.test://callback' },
      'b2c-redirect-uri-ios': { value: 'msaltest://auth' },
      'b2c-google-idp-hint': { value: 'Google' },
    };

    mockSecretClient.getSecret.mockImplementation((secretName: string) => {
      return Promise.resolve(mockSecrets[secretName as keyof typeof mockSecrets]);
    });

    const response = await getAuthConfig(mockRequest, mockContext);

    const body = JSON.parse(response.body as string);
    expect(body.scopes).toEqual(['scope1', 'scope2', 'scope3']);
  });

  it('should filter out empty scopes', async () => {
    const mockSecrets = {
      'b2c-tenant': { value: 'test.onmicrosoft.com' },
      'b2c-mobile-client-id': { value: 'test-client-id' },
      'b2c-signin-policy': { value: 'B2C_1_test' },
      'b2c-authority-host': { value: 'test.b2clogin.com' },
      'b2c-scopes': { value: 'scope1  scope2   scope3' }, // Multiple spaces
      'b2c-redirect-uri-android': { value: 'com.test://callback' },
      'b2c-redirect-uri-ios': { value: 'msaltest://auth' },
      'b2c-google-idp-hint': { value: 'Google' },
    };

    mockSecretClient.getSecret.mockImplementation((secretName: string) => {
      return Promise.resolve(mockSecrets[secretName as keyof typeof mockSecrets]);
    });

    const response = await getAuthConfig(mockRequest, mockContext);

    const body = JSON.parse(response.body as string);
    expect(body.scopes).toEqual(['scope1', 'scope2', 'scope3']);
  });

  it('should include authorityHost in knownAuthorities', async () => {
    const mockSecrets = {
      'b2c-tenant': { value: 'test.onmicrosoft.com' },
      'b2c-mobile-client-id': { value: 'test-client-id' },
      'b2c-signin-policy': { value: 'B2C_1_test' },
      'b2c-authority-host': { value: 'custom.b2clogin.com' },
      'b2c-scopes': { value: 'openid' },
      'b2c-redirect-uri-android': { value: 'com.test://callback' },
      'b2c-redirect-uri-ios': { value: 'msaltest://auth' },
      'b2c-google-idp-hint': { value: 'Google' },
    };

    mockSecretClient.getSecret.mockImplementation((secretName: string) => {
      return Promise.resolve(mockSecrets[secretName as keyof typeof mockSecrets]);
    });

    const response = await getAuthConfig(mockRequest, mockContext);

    const body = JSON.parse(response.body as string);
    expect(body.knownAuthorities).toEqual(['custom.b2clogin.com']);
  });
});
