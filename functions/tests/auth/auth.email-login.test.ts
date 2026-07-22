import type { HttpRequest, InvocationContext } from '@azure/functions';

import { emailLoginHandler } from '@auth/service/emailLoginService';
import { usersService } from '@auth/service/usersService';
import { issueTokensForPgUser } from '@auth/service/tokenService';

jest.mock('@auth/service/usersService', () => ({
  usersService: {
    getUserByEmail: jest.fn(),
    getProviderLink: jest.fn(),
    createProviderLink: jest.fn(),
  },
}));

jest.mock('@auth/service/tokenService', () => ({
  issueTokensForPgUser: jest.fn(),
}));

const request = (body: unknown): HttpRequest => ({
  method: 'POST',
  url: 'https://api.example.test/api/auth/email',
  headers: new Headers({ 'content-type': 'application/json' }),
  query: new URLSearchParams(),
  params: {},
  user: null,
  json: async () => body,
}) as unknown as HttpRequest;

const context = { invocationId: 'email-login-test' } as InvocationContext;
const internalUser = {
  id: '0195f010-7b55-7d8b-8c08-a796d57e8aa7',
  primary_email: 'smoke@example.test',
  roles: ['user'],
  tier: 'free',
  reputation_score: 0,
  created_at: '2026-07-21T00:00:00.000Z',
  updated_at: '2026-07-21T00:00:00.000Z',
};

describe('auth/email', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.GOOGLE_IDENTITY_PLATFORM_API_KEY = 'test-api-key';
    process.env.JWT_AUDIENCE = 'lythaus-acceptance';
    global.fetch = jest.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        localId: 'provider-subject',
        email: internalUser.primary_email,
        idToken: 'provider-id-token',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        users: [{
          localId: 'provider-subject',
          email: internalUser.primary_email,
          emailVerified: true,
        }],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    jest.mocked(usersService.getUserByEmail).mockResolvedValue(internalUser);
    jest.mocked(usersService.getProviderLink).mockResolvedValue(null);
    jest.mocked(usersService.createProviderLink).mockResolvedValue({
      provider: 'password',
      provider_sub: 'provider-subject',
      user_id: internalUser.id,
      created_at: internalUser.created_at,
    });
    jest.mocked(issueTokensForPgUser).mockResolvedValue({
      access_token: 'short-lived-access',
      refresh_token: 'rotating-refresh',
      token_type: 'Bearer',
      expires_in: 900,
      scope: 'read write',
      user: {
        id: internalUser.id,
        email: internalUser.primary_email,
        role: 'user',
        roles: ['user'],
        tier: 'free',
        reputationScore: 0,
      },
    });
  });

  it('verifies the provider, preserves invite-only membership, and issues Lythaus tokens', async () => {
    const response = await emailLoginHandler(request({
      email: 'SMOKE@example.test',
      password: 'correct-password',
      client_id: 'lythaus-acceptance',
    }), context);

    expect(response.status).toBe(200);
    expect(usersService.getUserByEmail).toHaveBeenCalledWith('smoke@example.test');
    expect(global.fetch).toHaveBeenNthCalledWith(1, 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword', expect.objectContaining({
      headers: expect.objectContaining({ 'X-Goog-Api-Key': 'test-api-key' }),
    }));
    expect(usersService.createProviderLink).toHaveBeenCalledWith('password', 'provider-subject', internalUser.id);
    expect(issueTokensForPgUser).toHaveBeenCalledWith(internalUser, 'lythaus-acceptance', context.invocationId);
    expect(JSON.parse(response.body as string).data.access_token).toBe('short-lived-access');
  });

  it('rejects unverified provider identities', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ idToken: 'provider-id-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        users: [{
          localId: 'provider-subject',
          email: internalUser.primary_email,
          emailVerified: false,
        }],
      }), { status: 200 }));

    const response = await emailLoginHandler(request({
      email: internalUser.primary_email,
      password: 'correct-password',
    }), context);

    expect(response.status).toBe(401);
    expect(issueTokensForPgUser).not.toHaveBeenCalled();
  });

  it('does not create an internal user when the verified identity lacks an invite', async () => {
    jest.mocked(usersService.getUserByEmail).mockResolvedValue(null);
    const response = await emailLoginHandler(request({
      email: internalUser.primary_email,
      password: 'correct-password',
    }), context);

    expect(response.status).toBe(403);
    expect(usersService.createProviderLink).not.toHaveBeenCalled();
    expect(issueTokensForPgUser).not.toHaveBeenCalled();
  });

  it('returns a generic unavailable response without leaking provider details', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('', { status: 503 }));
    const response = await emailLoginHandler(request({
      email: internalUser.primary_email,
      password: 'correct-password',
    }), context);

    expect(response.status).toBe(503);
    expect(response.body).not.toContain('identitytoolkit.googleapis.com');
    expect(response.body).not.toContain('test-api-key');
  });
});
