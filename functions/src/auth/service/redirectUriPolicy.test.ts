import { isRegisteredRedirectUri } from './redirectUriPolicy';

describe('OAuth redirect URI policy', () => {
  const original = process.env.OAUTH_REDIRECT_URIS;

  afterEach(() => {
    if (original === undefined) delete process.env.OAUTH_REDIRECT_URIS;
    else process.env.OAUTH_REDIRECT_URIS = original;
  });

  it('preserves registered native and canonical web callbacks', () => {
    expect(isRegisteredRedirectUri('com.asora.app://oauth/callback')).toBe(true);
    expect(isRegisteredRedirectUri('asora://oauth/callback')).toBe(true);
    expect(isRegisteredRedirectUri('https://app.lythaus.co/auth/callback')).toBe(true);
  });

  it('allows only an explicitly configured immutable preview callback', () => {
    process.env.OAUTH_REDIRECT_URIS = 'https://a606f6f7.lythaus-web.pages.dev/auth/callback';
    expect(isRegisteredRedirectUri('https://a606f6f7.lythaus-web.pages.dev/auth/callback')).toBe(true);
    expect(isRegisteredRedirectUri('https://other-preview.lythaus-web.pages.dev/auth/callback')).toBe(false);
  });

  it('rejects attacker, credential-bearing, and fragment callbacks', () => {
    expect(isRegisteredRedirectUri('https://attacker.example/callback')).toBe(false);
    expect(isRegisteredRedirectUri('https://user:secret@app.lythaus.co/auth/callback')).toBe(false);
    expect(isRegisteredRedirectUri('https://app.lythaus.co/auth/callback#token')).toBe(false);
  });
});
