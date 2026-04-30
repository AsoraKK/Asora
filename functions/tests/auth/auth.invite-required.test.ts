/**
 * Auth hardening: invite-required state → 403
 *
 * When the platform is gated by invite-only and a user has not yet been
 * activated, the token exchange endpoint must return 403 with
 * `error: "invite_required"`.
 *
 * This test focuses on the invite gate in the token-exchange flow
 * (auth/token) and is complementary to auth.token.invite.test.ts.
 */

import { HttpRequest, InvocationContext } from '@azure/functions';
import { tokenRoute as tokenHandler } from '@auth/routes/token';

// ─────────────────────────────────────────────────────────────
// Cosmos mock – user is inactive (awaiting invite)
// ─────────────────────────────────────────────────────────────

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
                      id: 'sess-invite-test',
                      partitionKey: 'client-app',
                      redirectUri: 'https://app.lythaus.com/callback',
                      clientId: 'asora-mobile-app',
                      userId: 'user-inactive',
                      expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
                      // code_verifier: 'invite-verifier'  →  SHA-256 base64url below
                      codeChallenge: 'iMnq5o6zALKXGivsnlom_0F5_WYda32GHkxlV7mq7hQ',
                      codeChallengeMethod: 'S256',
                      nonce: 'nonce-invite',
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
                  id: 'user-inactive',
                  email: 'waiting@example.com',
                  role: 'user',
                  tier: 'free',
                  reputationScore: 0,
                  createdAt: new Date().toISOString(),
                  lastLoginAt: new Date().toISOString(),
                  isActive: false, // <-- awaiting invite activation
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

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): HttpRequest {
  return {
    method: 'POST',
    url: 'https://api.asora.dev/auth/token',
    headers: new Headers({ 'content-type': 'application/json' }),
    query: new URLSearchParams(),
    params: {},
    user: null as any,
    json: async () => body,
  } as unknown as HttpRequest;
}

function makeContext(): InvocationContext {
  return { invocationId: 'test-invite-required', log: jest.fn(), error: jest.fn() } as unknown as InvocationContext;
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-invite-required-tests!';
  process.env.JWT_ISSUER = 'asora-auth';
});

describe('invite-required gate on token exchange', () => {
  it('returns 403 with error="invite_required" for an inactive user', async () => {
    const body = {
      grant_type: 'authorization_code',
      code: 'invite-code',
      redirect_uri: 'https://app.lythaus.com/callback',
      client_id: 'asora-mobile-app',
      code_verifier: 'verifier',
    };

    const response = await tokenHandler(makeRequest(body), makeContext());

    expect(response.status).toBe(403);
    const parsed = JSON.parse(response.body as string);
    expect(parsed.error).toBe('invite_required');
  });

  it('includes a human-readable description in the response body', async () => {
    const body = {
      grant_type: 'authorization_code',
      code: 'invite-code',
      redirect_uri: 'https://app.lythaus.com/callback',
      client_id: 'asora-mobile-app',
      code_verifier: 'verifier',
    };

    const response = await tokenHandler(makeRequest(body), makeContext());
    const parsed = JSON.parse(response.body as string);

    expect(typeof parsed.error_description).toBe('string');
    expect(parsed.error_description.length).toBeGreaterThan(0);
  });

  it('sets no-cache headers so invite errors are not stored in any cache', async () => {
    const body = {
      grant_type: 'authorization_code',
      code: 'invite-code',
      redirect_uri: 'https://app.lythaus.com/callback',
      client_id: 'asora-mobile-app',
      code_verifier: 'verifier',
    };

    const response = await tokenHandler(makeRequest(body), makeContext());
    const headers = response.headers as Record<string, string>;

    expect(headers?.['Cache-Control']).toMatch(/no-store/);
  });
});
