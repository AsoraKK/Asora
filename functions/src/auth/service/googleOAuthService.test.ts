import {
  buildGoogleAuthorizationUrl,
  exchangeAndVerifyGoogleCode,
} from './googleOAuthService';

const CLIENT_ID = 'public-client.apps.googleusercontent.com';

function fakeClient(payload: Record<string, unknown> | undefined, idToken = 'provider-id-token') {
  return {
    getToken: jest.fn().mockResolvedValue({ tokens: { id_token: idToken } }),
    verifyIdToken: jest.fn().mockResolvedValue({ getPayload: () => payload }),
  };
}

describe('Google OAuth service', () => {
  beforeEach(() => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = CLIENT_ID;
  });

  afterAll(() => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
  });

  it('builds an exact Authorization Code and PKCE S256 request', () => {
    const url = buildGoogleAuthorizationUrl({
      clientId: CLIENT_ID,
      redirectUri: 'https://preview.lythaus-web.pages.dev/auth/callback',
      state: 'state-1',
      nonce: 'nonce-1',
      codeChallenge: 'A'.repeat(43),
    });

    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe(CLIENT_ID);
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://preview.lythaus-web.pages.dev/auth/callback'
    );
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe('state-1');
    expect(url.searchParams.get('nonce')).toBe('nonce-1');
  });

  it('accepts only a verified Google identity with matching nonce and audience', async () => {
    const client = fakeClient({
      iss: 'https://accounts.google.com',
      aud: CLIENT_ID,
      exp: Math.floor(Date.now() / 1000) + 300,
      sub: 'google-subject-1',
      email: 'Test.User@Example.com',
      email_verified: true,
      nonce: 'nonce-1',
    });

    await expect(
      exchangeAndVerifyGoogleCode(
        {
          code: 'provider-code',
          codeVerifier: 'verifier',
          clientId: CLIENT_ID,
          redirectUri: 'https://app.lythaus.co/auth/callback',
          nonce: 'nonce-1',
        },
        client
      )
    ).resolves.toEqual({ sub: 'google-subject-1', email: 'test.user@example.com' });
  });

  it.each([
    ['wrong issuer', { iss: 'https://issuer.invalid', aud: CLIENT_ID, exp: 9999999999, sub: 'sub', email: 'a@b.co', email_verified: true, nonce: 'nonce-1' }],
    ['wrong audience', { iss: 'https://accounts.google.com', aud: 'wrong-client', exp: 9999999999, sub: 'sub', email: 'a@b.co', email_verified: true, nonce: 'nonce-1' }],
    ['expired token', { iss: 'https://accounts.google.com', aud: CLIENT_ID, exp: 1, sub: 'sub', email: 'a@b.co', email_verified: true, nonce: 'nonce-1' }],
    ['invalid nonce', { iss: 'https://accounts.google.com', aud: CLIENT_ID, exp: 9999999999, sub: 'sub', email: 'a@b.co', email_verified: true, nonce: 'wrong' }],
    ['unverified email', { iss: 'https://accounts.google.com', aud: CLIENT_ID, exp: 9999999999, sub: 'sub', email: 'a@b.co', email_verified: false, nonce: 'nonce-1' }],
  ])('rejects %s', async (_name, payload) => {
    await expect(
      exchangeAndVerifyGoogleCode(
        {
          code: 'provider-code',
          codeVerifier: 'verifier',
          clientId: CLIENT_ID,
          redirectUri: 'https://app.lythaus.co/auth/callback',
          nonce: 'nonce-1',
        },
        fakeClient(payload)
      )
    ).rejects.toThrow();
  });

  it('rejects a wrong public client ID before provider exchange', async () => {
    const client = fakeClient(undefined);
    await expect(
      exchangeAndVerifyGoogleCode(
        {
          code: 'provider-code',
          codeVerifier: 'verifier',
          clientId: 'wrong-client',
          redirectUri: 'https://app.lythaus.co/auth/callback',
          nonce: 'nonce-1',
        },
        client
      )
    ).rejects.toThrow('client ID mismatch');
    expect(client.getToken).not.toHaveBeenCalled();
  });
});
