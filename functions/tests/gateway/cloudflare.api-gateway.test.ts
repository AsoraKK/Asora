import worker, {
  buildCacheKeyUrl,
  buildOriginRequest,
  isAnonymousCacheRequest,
  isExpectedHostname,
} from '../../../cloudflare/api-gateway/worker';

describe('Lythaus API gateway Worker', () => {
  const mockCache = { match: jest.fn(), put: jest.fn() };
  const env = {
    EXPECTED_HOSTNAMES: 'lythaus-api-preview.example.workers.dev',
    ORIGIN_BASE: 'https://origin.example.com',
    ORIGIN_AUTH_TOKEN: 'origin-secret',
    CORS_ALLOWED_ORIGINS: 'https://preview.example.pages.dev',
    RATE_LIMIT_REQUIRED: 'false',
  } as any;
  const fetchSpy = jest.spyOn(globalThis, 'fetch');

  beforeAll(() => {
    Object.defineProperty(globalThis, 'caches', {
      configurable: true,
      value: { default: mockCache },
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    fetchSpy.mockReset();
    mockCache.match.mockResolvedValue(null);
  });

  afterAll(() => fetchSpy.mockRestore());

  function request(path: string, init: RequestInit = {}): Request {
    return new Request(`https://lythaus-api-preview.example.workers.dev${path}`, init);
  }

  it('accepts only configured hostnames and fails closed without an origin', async () => {
    expect(isExpectedHostname(new URL('https://lythaus-api-preview.example.workers.dev/api/health'), env)).toBe(true);
    expect(isExpectedHostname(new URL('https://api.lythaus.co/api/health'), env)).toBe(false);

    const response = await worker.fetch(request('/api/health'), { ...env, ORIGIN_BASE: '' }, { waitUntil: jest.fn() } as any);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: 'gateway_not_configured' });
  });

  it('preserves the /api path, strips spoofable headers, and adds the origin token', () => {
    const originRequest = buildOriginRequest(
      request('/api/auth/token?mode=test', {
        method: 'POST',
        headers: {
          'X-Lythaus-Origin-Token': 'client-spoof',
          'X-Forwarded-Host': 'attacker.example',
          Authorization: 'Bearer client-token',
        },
        body: '{}',
      }),
      env,
      'correlation-1234'
    );
    expect(originRequest.url).toBe('https://origin.example.com/api/auth/token?mode=test');
    expect(originRequest.headers.get('X-Lythaus-Origin-Token')).toBe('origin-secret');
    expect(originRequest.headers.get('X-Forwarded-Host')).toBeNull();
    expect(originRequest.headers.get('Authorization')).toBe('Bearer client-token');
  });

  it('allows exact-origin preflight and denies unapproved origins', async () => {
    const allowed = await worker.fetch(
      request('/api/health', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://preview.example.pages.dev',
          'Access-Control-Request-Method': 'GET',
        },
      }),
      env,
      { waitUntil: jest.fn() } as any
    );
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe('https://preview.example.pages.dev');

    const denied = await worker.fetch(
      request('/api/health', { headers: { Origin: 'https://attacker.example' } }),
      env,
      { waitUntil: jest.fn() } as any
    );
    expect(denied.status).toBe(403);
  });

  it('caches only anonymous discovery and bypasses credentials', () => {
    expect(isAnonymousCacheRequest(request('/api/feed/discover'))).toBe(true);
    expect(isAnonymousCacheRequest(request('/api/feed/discover', { headers: { Authorization: 'Bearer token' } }))).toBe(false);
    expect(isAnonymousCacheRequest(request('/api/feed/discover', { headers: { Cookie: 'session=1' } }))).toBe(false);
    expect(isAnonymousCacheRequest(request('/api/feed/news'))).toBe(false);
    const key = buildCacheKeyUrl(new URL('https://lythaus-api-preview.example.workers.dev/api/feed/discover?limit=20&ignored=yes'));
    expect(key.search).toBe('?limit=20');
  });

  it('marks protected responses private and never exposes origin headers', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          Server: 'Azure',
          'X-Ms-Request-Id': 'private-origin-id',
          'Cache-Control': 'public, max-age=60',
        },
      })
    );
    const response = await worker.fetch(
      request('/api/auth/userinfo', { headers: { Authorization: 'Bearer token' } }),
      env,
      { waitUntil: jest.fn() } as any
    );
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('X-Cache')).toBe('BYPASS');
    expect(response.headers.get('Server')).toBeNull();
    expect(response.headers.get('X-Ms-Request-Id')).toBeNull();
  });

  it('returns a controlled error when the origin fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchSpy.mockRejectedValue(new Error('origin hostname details'));
    const response = await worker.fetch(request('/api/health'), env, { waitUntil: jest.fn() } as any);
    expect(response.status).toBe(502);
    const body = await response.text();
    expect(body).not.toContain('origin.example.com');
    expect(body).not.toContain('hostname details');
    consoleSpy.mockRestore();
  });
});
