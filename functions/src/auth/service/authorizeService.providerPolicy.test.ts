import { HttpRequest, type InvocationContext } from '@azure/functions';

import { authorizeHandler } from './authorizeService';

const callback = 'https://app.lythaus.co/auth/callback';
const codeChallenge = 'A'.repeat(43);

function request(provider: string): HttpRequest {
  const url = new URL('https://api.lythaus.co/api/auth/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', 'lythaus-web');
  url.searchParams.set('redirect_uri', callback);
  url.searchParams.set('state', 'provider-policy-state');
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('idp', provider);
  return new HttpRequest({ url: url.toString(), method: 'GET' });
}

const context = {
  invocationId: 'provider-policy-test',
  functionName: 'auth-authorize',
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
} as unknown as InvocationContext;

describe('authorize MVP provider policy', () => {
  const originalRedirectUris = process.env.OAUTH_REDIRECT_URIS;

  beforeEach(() => {
    process.env.OAUTH_REDIRECT_URIS = callback;
  });

  afterAll(() => {
    if (originalRedirectUris === undefined) delete process.env.OAUTH_REDIRECT_URIS;
    else process.env.OAUTH_REDIRECT_URIS = originalRedirectUris;
  });

  it.each(['Apple', 'World ID'])('returns a neutral unavailable result for %s', async (provider) => {
    const response = await authorizeHandler(request(provider), context);
    const location = new URL(String(response.headers?.Location));

    expect(response.status).toBe(302);
    expect(response.headers?.['Cache-Control']).toBe('no-cache, no-store');
    expect(location.origin + location.pathname).toBe(callback);
    expect(location.searchParams.get('error')).toBe('provider_unavailable');
    expect(location.searchParams.get('error_description')).toBe(
      'Requested sign-in method is not available'
    );
    expect(location.searchParams.get('state')).toBe('provider-policy-state');
    expect(location.toString().toLowerCase()).not.toContain(provider.toLowerCase());
  });
});
