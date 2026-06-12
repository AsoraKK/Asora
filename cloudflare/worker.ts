/// <reference lib="dom" />

import { applyEdgeRateLimitHeaders, enforceEdgeRateLimit } from '../edge/worker/src/rateLimit';

export interface Env {
  FEED_CACHE_ENABLED?: string;
  RATE_LIMIT_KV?: KVNamespace;
  EMAIL_HASH_SALT?: string;
}

const FEED_PATH_PREFIX = '/api/feed';
export const ANON_CACHEABLE_FEED_PATHS = new Set(['/api/feed/discover']);
const CACHE_KEY_PARAMS = new Set([
  'cursor',
  'limit',
  'page',
  'pageSize',
  'timeWindow',
  'region',
  'includeTopics',
  'excludeTopics',
  'includeHighReputation',
  'authorId',
  'since',
]);
const EDGE_LIMIT = { limit: 60, windowSeconds: 60 };

export function isAnonymousCacheRequest(request: Request, url = new URL(request.url)): boolean {
  if (request.method.toUpperCase() !== 'GET') {
    return false;
  }

  if (!url.pathname.startsWith(FEED_PATH_PREFIX)) {
    return false;
  }

  if (request.headers.has('authorization') || request.headers.has('cookie')) {
    return false;
  }

  return ANON_CACHEABLE_FEED_PATHS.has(url.pathname);
}

export function buildFeedCacheKeyUrl(requestUrl: URL): URL {
  const cacheUrl = new URL(requestUrl.toString());
  const entries: Array<[string, string]> = [];

  cacheUrl.searchParams.forEach((value, key) => {
    if (CACHE_KEY_PARAMS.has(key)) {
      entries.push([key, value]);
    }
  });

  entries.sort(([aKey, aValue], [bKey, bValue]) => {
    const keyCompare = aKey.localeCompare(bKey);
    return keyCompare !== 0 ? keyCompare : aValue.localeCompare(bValue);
  });

  cacheUrl.search = '';
  for (const [key, value] of entries) {
    cacheUrl.searchParams.append(key, value);
  }

  return cacheUrl;
}

export function shouldCacheFeedResponse(response: Response): boolean {
  if (response.status !== 200) {
    return false;
  }

  if (response.headers.has('set-cookie')) {
    return false;
  }

  const contentType = response.headers.get('content-type')?.toLowerCase() || '';
  return contentType.includes('application/json');
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const auth = request.headers.get("authorization");
    const hasCookie = request.headers.has('cookie');
    const cachingEnabled = (env.FEED_CACHE_ENABLED || "true").toLowerCase() === "true";

    const isFeed = method === "GET" && url.pathname.startsWith(FEED_PATH_PREFIX);
    // Only anonymous feed reads are cacheable here; public, authenticated, and
    // admin traffic bypass this worker path entirely.
    const isAnonCacheableFeedPath = isAnonymousCacheRequest(request, url);

    // Bypass conditions: non-feed, auth present, or disabled via env.
    if (!isFeed || auth || hasCookie || !cachingEnabled || !isAnonCacheableFeedPath) {
      const resp = await fetch(request);
      const r = new Response(resp.body, resp);
      r.headers.set("Vary", "Authorization");
      if (auth || hasCookie || (isFeed && !isAnonCacheableFeedPath)) {
        r.headers.set("Cache-Control", "private, no-store");
      }
      r.headers.set("X-Cache", "BYPASS");
      return r;
    }

    const rateLimitResult = await enforceEdgeRateLimit(request, env, {
      limit: EDGE_LIMIT.limit,
      windowSeconds: EDGE_LIMIT.windowSeconds,
      scope: 'ip',
    });

    if (!rateLimitResult.allowed && rateLimitResult.response) {
      rateLimitResult.response.headers.set('X-Cache', 'RATE_LIMIT');
      rateLimitResult.response.headers.set('Vary', 'Authorization');
      return rateLimitResult.response;
    }

    const cacheUrl = buildFeedCacheKeyUrl(url);
    const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });
    const cache = caches.default;

    // Try edge cache
    let cached = await cache.match(cacheKey);
    if (cached) {
      const hit = new Response(cached.body, cached);
      hit.headers.set("X-Cache", "HIT");
      hit.headers.set("Vary", "Authorization");
      if (rateLimitResult) {
        applyEdgeRateLimitHeaders(hit, rateLimitResult);
      }
      return hit;
    }

    // Miss: fetch origin
    const originResp = await fetch(request);
    const resp = new Response(originResp.body, originResp);

    if (!shouldCacheFeedResponse(resp)) {
      resp.headers.set('Cache-Control', 'private, no-store');
      resp.headers.set('Vary', 'Authorization');
      resp.headers.set('X-Cache', 'BYPASS');
      if (rateLimitResult) {
        applyEdgeRateLimitHeaders(resp, rateLimitResult);
      }
      return resp;
    }

    // Set edge caching hints
    const cacheControl = 'public, s-maxage=30, stale-while-revalidate=60';
    resp.headers.set('Cache-Control', cacheControl);
    resp.headers.set('Vary', 'Authorization');
    resp.headers.set('X-Cache', 'MISS');
    if (rateLimitResult) {
      applyEdgeRateLimitHeaders(resp, rateLimitResult);
    }

    // Store in cache (best effort)
    ctx.waitUntil(cache.put(cacheKey, resp.clone()));
    return resp;
  },
};
