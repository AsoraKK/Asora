import worker, {
  ANON_CACHEABLE_FEED_PATHS,
  buildFeedCacheKeyUrl,
  isAnonymousCacheRequest,
  shouldCacheFeedResponse,
} from '../../../cloudflare/worker';

describe('Cloudflare feed cache worker', () => {
  const mockCache = {
    match: jest.fn(),
    put: jest.fn(),
  };

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
    mockCache.match.mockReset();
    mockCache.put.mockReset();
  });

  afterAll(() => {
    fetchSpy.mockRestore();
  });

  function makeRequest(
    path: string,
    headers: Record<string, string> = {},
    method = 'GET'
  ): Request {
    return new Request(`https://edge.example.com${path}`, {
      method,
      headers,
    });
  }

  it('only caches anonymous GET discover requests', () => {
    expect(ANON_CACHEABLE_FEED_PATHS.has('/api/feed/discover')).toBe(true);
    expect(isAnonymousCacheRequest(makeRequest('/api/feed/discover'))).toBe(true);
    expect(isAnonymousCacheRequest(makeRequest('/api/feed/news'))).toBe(false);
    expect(isAnonymousCacheRequest(makeRequest('/api/feed/discover', { authorization: 'Bearer x' }))).toBe(false);
    expect(isAnonymousCacheRequest(makeRequest('/api/feed/discover', { cookie: 'session=1' }))).toBe(false);
    expect(isAnonymousCacheRequest(makeRequest('/api/feed/discover', {}, 'POST'))).toBe(false);
  });

  it('builds a cache key from all relevant feed query parameters', () => {
    const url = new URL('https://edge.example.com/api/feed/discover');
    url.search = new URLSearchParams([
      ['limit', '20'],
      ['cursor', 'abc'],
      ['includeTopics', 'tech,ai'],
      ['excludeTopics', 'spam'],
      ['region', 'us'],
      ['timeWindow', '24h'],
      ['pageSize', '50'],
      ['includeHighReputation', 'true'],
      ['authorId', 'author-1'],
      ['since', 'def'],
      ['ignored', 'noop'],
    ]).toString();

    const cacheKeyUrl = buildFeedCacheKeyUrl(url);
    expect(cacheKeyUrl.pathname).toBe('/api/feed/discover');
    expect(cacheKeyUrl.searchParams.get('cursor')).toBe('abc');
    expect(cacheKeyUrl.searchParams.get('limit')).toBe('20');
    expect(cacheKeyUrl.searchParams.get('includeTopics')).toBe('tech,ai');
    expect(cacheKeyUrl.searchParams.get('excludeTopics')).toBe('spam');
    expect(cacheKeyUrl.searchParams.get('region')).toBe('us');
    expect(cacheKeyUrl.searchParams.get('timeWindow')).toBe('24h');
    expect(cacheKeyUrl.searchParams.get('pageSize')).toBe('50');
    expect(cacheKeyUrl.searchParams.get('includeHighReputation')).toBe('true');
    expect(cacheKeyUrl.searchParams.get('authorId')).toBe('author-1');
    expect(cacheKeyUrl.searchParams.get('since')).toBe('def');
    expect(cacheKeyUrl.searchParams.has('ignored')).toBe(false);
  });

  it('accepts only JSON 200 responses for caching', () => {
    expect(
      shouldCacheFeedResponse(
        new Response('{"ok":true}', {
          status: 200,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        })
      )
    ).toBe(true);

    expect(
      shouldCacheFeedResponse(
        new Response('{"ok":false}', {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    ).toBe(false);

    expect(
      shouldCacheFeedResponse(
        new Response('{"ok":true}', {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': 'session=abc; Path=/; HttpOnly',
          },
        })
      )
    ).toBe(false);

    expect(
      shouldCacheFeedResponse(
        new Response('<html />', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      )
    ).toBe(false);
  });

  it('caches anonymous discover responses and bypasses authenticated requests', async () => {
    let storedCache: Response | null = null;

    mockCache.match.mockImplementation(async () => storedCache?.clone() ?? null);
    mockCache.put.mockImplementation(async (_key: Request, value: Response) => {
      storedCache = value.clone();
    });
    fetchSpy.mockImplementation(async () =>
      new Response(JSON.stringify({ items: [{ id: 'origin' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const anonRequest = makeRequest('/api/feed/discover?limit=20&cursor=abc&includeTopics=tech');
    const first = await worker.fetch(anonRequest, { FEED_CACHE_ENABLED: 'true' } as any, {
      waitUntil: jest.fn(),
    } as any);
    expect(first.status).toBe(200);
    expect(first.headers.get('X-Cache')).toBe('MISS');
    expect(mockCache.put).toHaveBeenCalledTimes(1);

    const second = await worker.fetch(anonRequest, { FEED_CACHE_ENABLED: 'true' } as any, {
      waitUntil: jest.fn(),
    } as any);
    expect(second.status).toBe(200);
    expect(second.headers.get('X-Cache')).toBe('HIT');
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const authed = await worker.fetch(
      makeRequest('/api/feed/discover?limit=20', { authorization: 'Bearer token' }),
      { FEED_CACHE_ENABLED: 'true' } as any,
      { waitUntil: jest.fn() } as any
    );
    expect(authed.headers.get('Cache-Control')).toBe('private, no-store');
    expect(authed.headers.get('Vary')).toBe('Authorization');
    expect(authed.headers.get('X-Cache')).toBe('BYPASS');
    expect(mockCache.put).toHaveBeenCalledTimes(1);

    const cookieBypass = await worker.fetch(
      makeRequest('/api/feed/discover?limit=20', { cookie: 'session=abc' }),
      { FEED_CACHE_ENABLED: 'true' } as any,
      { waitUntil: jest.fn() } as any
    );
    expect(cookieBypass.headers.get('Cache-Control')).toBe('private, no-store');
    expect(cookieBypass.headers.get('Vary')).toBe('Authorization');
    expect(cookieBypass.headers.get('X-Cache')).toBe('BYPASS');
    expect(mockCache.put).toHaveBeenCalledTimes(1);
  });

  it('never caches news and refuses non-200 or Set-Cookie responses', async () => {
    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'nope' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': 'sid=1; Path=/; HttpOnly',
          },
        })
      );

    const waitUntil = jest.fn();

    const newsResponse = await worker.fetch(
      makeRequest('/api/feed/news?limit=20&region=us'),
      { FEED_CACHE_ENABLED: 'true' } as any,
      { waitUntil } as any
    );
    expect(newsResponse.headers.get('Cache-Control')).toBe('private, no-store');
    expect(newsResponse.headers.get('X-Cache')).toBe('BYPASS');

    const errorResponse = await worker.fetch(
      makeRequest('/api/feed/discover?limit=20'),
      { FEED_CACHE_ENABLED: 'true' } as any,
      { waitUntil } as any
    );
    expect(errorResponse.headers.get('Cache-Control')).toBe('private, no-store');
    expect(errorResponse.headers.get('X-Cache')).toBe('BYPASS');

    const cookieResponse = await worker.fetch(
      makeRequest('/api/feed/discover?limit=20'),
      { FEED_CACHE_ENABLED: 'true' } as any,
      { waitUntil } as any
    );
    expect(cookieResponse.headers.get('Cache-Control')).toBe('private, no-store');
    expect(cookieResponse.headers.get('X-Cache')).toBe('BYPASS');
    expect(mockCache.put).not.toHaveBeenCalled();
  });
});
