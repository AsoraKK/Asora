import { isRegisteredRedirectUri } from './redirectUriPolicy';

describe('OAuth redirect URI policy', () => {
  const original = process.env.OAUTH_REDIRECT_URIS;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (original === undefined) delete process.env.OAUTH_REDIRECT_URIS;
    else process.env.OAUTH_REDIRECT_URIS = original;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it('preserves registered native and canonical web callbacks', () => {
    expect(isRegisteredRedirectUri('com.asora.app://oauth/callback')).toBe(true);
    expect(isRegisteredRedirectUri('asora://oauth/callback')).toBe(true);
    expect(isRegisteredRedirectUri('https://app.lythaus.co/auth/callback')).toBe(true);
  });

  it('allows only an explicitly configured immutable preview callback', () => {
    process.env.NODE_ENV = 'preview';
    process.env.OAUTH_REDIRECT_URIS = 'https://preview-commit.lythaus-web.pages.dev/auth/callback';
    expect(isRegisteredRedirectUri('https://preview-commit.lythaus-web.pages.dev/auth/callback')).toBe(true);
    expect(isRegisteredRedirectUri('https://other-preview.lythaus-web.pages.dev/auth/callback')).toBe(false);
  });

  it('rejects attacker, credential-bearing, and fragment callbacks', () => {
    expect(isRegisteredRedirectUri('https://attacker.example/callback')).toBe(false);
    expect(isRegisteredRedirectUri('https://user:secret@app.lythaus.co/auth/callback')).toBe(false);
    expect(isRegisteredRedirectUri('https://app.lythaus.co/auth/callback#token')).toBe(false);
  });

  it('rejects obsolete public callbacks and Pages callbacks in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.OAUTH_REDIRECT_URIS = 'https://preview-commit.lythaus-web.pages.dev/auth/callback';
    expect(isRegisteredRedirectUri('https://lythaus-web.pages.dev/auth/callback')).toBe(false);
    expect(isRegisteredRedirectUri('https://app.lythaus.asora.co.za/auth/callback')).toBe(false);
    expect(isRegisteredRedirectUri('https://preview-commit.lythaus-web.pages.dev/auth/callback')).toBe(false);
  });
});
