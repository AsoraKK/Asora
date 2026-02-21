/// <reference types="jest" />
import { HttpRequest, InvocationContext } from '@azure/functions';
import { tokenRoute as tokenHandler } from '@auth/routes/token';

// Mock Cosmos client factory
jest.mock('@shared/clients/cosmos', () => ({
  getCosmosClient: jest.fn(() => ({
    database: jest.fn().mockReturnValue({
      container: jest.fn().mockImplementation((name: string) => {
        if (name === 'auth_sessions') {
          return {
            items: {
              query: jest.fn().mockReturnValue({
                fetchAll: jest.fn().mockResolvedValue({
                  resources: [
                    {
                      id: 'sess1',
                      partitionKey: 'client-123',
                      redirectUri: 'http://localhost/cb',
                      clientId: 'asora-mobile-app',
                      userId: 'user-1',
                      expiresAt: new Date(Date.now() + 10 * 60000).toISOString(),
                      codeChallenge: 'iMnq5o6zALKXGivsnlom_0F5_WYda32GHkxlV7mq7hQ',
                      codeChallengeMethod: 'S256',
                      nonce: 'nonce',
                    },
                  ],
                }),
              }),
            },
            item: jest.fn().mockReturnValue({
              patch: jest.fn().mockResolvedValue({}),
            }),
          };
        }
        if (name === 'users') {
          return {
            item: jest.fn().mockReturnValue({
              read: jest.fn().mockResolvedValue({
                resource: {
                  id: 'user-1',
                  email: 'u@example.com',
                  role: 'user',
                  tier: 'free',
                  reputationScore: 0,
                  createdAt: new Date().toISOString(),
                  lastLoginAt: new Date().toISOString(),
                  isActive: false,
                },
              }),
            }),
          };
        }
        return {};
      }),
    }),
  })),
}));

function req(body: any): HttpRequest {
  return {
    method: 'POST',
    url: 'http://localhost/api/auth/token',
    headers: new Headers({ 'content-type': 'application/json' }),
    query: new URLSearchParams(),
    params: {},
    user: null as any,
    json: async () => body,
  } as unknown as HttpRequest;
}

function ctx(): InvocationContext {
  return { invocationId: 'test', log: jest.fn(), error: jest.fn() } as unknown as InvocationContext;
}

describe('auth/token invite gating', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key-for-invite-tests';
    process.env.JWT_ISSUER = 'asora-auth';
  });
  it('denies inactive users with invite_required', async () => {
    // code_verifier 'verifier' has SHA256 base64url '4X6T1gZC8P5f1QmHif4Tq3G3Q0vS5yJ8tQ0b3u1z9iA'
    const body = {
      grant_type: 'authorization_code',
      code: 'abc',
      redirect_uri: 'http://localhost/cb',
      client_id: 'asora-mobile-app',
      code_verifier: 'verifier',
    };
    const response = await tokenHandler(req(body), ctx());
    expect(response.status).toBe(403);
    const parsed = JSON.parse(response.body as string);
    expect(parsed.error).toBe('invite_required');
    expect(parsed.error_description).toMatch(/Awaiting invite/i);
  });
});
