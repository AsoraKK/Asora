import { applyEdgeRateLimitHeaders, enforceEdgeRateLimit } from '../edge/worker/src/rateLimit';

export interface Env {
  FEED_CACHE_ENABLED?: string;
  RATE_LIMIT_KV?: KVNamespace;
  EMAIL_HASH_SALT?: string;
}

const FEED_PATH_PREFIX = "/api/feed";
const ANON_CACHEABLE_FEED_PATHS = new Set([
  "/api/feed/discover",
  "/api/feed/news",
]);
const ALLOWED_PARAMS = new Set(["page", "pageSize", "timeWindow"]);
const EDGE_LIMIT = { limit: 60, windowSeconds: 60 };

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const auth = request.headers.get("authorization");
    const cachingEnabled = (env.FEED_CACHE_ENABLED || "true").toLowerCase() === "true";

    const isFeed = method === "GET" && url.pathname.startsWith(FEED_PATH_PREFIX);
    const isAnonCacheableFeedPath = ANON_CACHEABLE_FEED_PATHS.has(url.pathname);

    // Bypass conditions: non-feed, auth present, or disabled via env
    if (!isFeed || auth || !cachingEnabled || !isAnonCacheableFeedPath) {
      const resp = await fetch(request);
      const r = new Response(resp.body, resp);
      r.headers.set("Vary", "Authorization");
      if (auth || (isFeed && !isAnonCacheableFeedPath)) {
        r.headers.set("Cache-Control", "private, no-store");
      }
      r.headers.set("X-Cache", auth ? "BYPASS" : "BYPASS");
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

    // Build normalized cache key: only page, pageSize, timeWindow. Sort for stability.
    const cacheUrl = new URL(request.url);
    const entries: Array<[string, string]> = [];
    cacheUrl.searchParams.forEach((v, k) => {
      if (ALLOWED_PARAMS.has(k)) entries.push([k, v]);
    });
    entries.sort(([a], [b]) => a.localeCompare(b));
    cacheUrl.search = "";
    for (const [k, v] of entries) cacheUrl.searchParams.append(k, v);

    const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
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
    // Set edge caching hints
    const cacheControl = "public, s-maxage=30, stale-while-revalidate=60";
    resp.headers.set("Cache-Control", cacheControl);
    resp.headers.set("Vary", "Authorization");
    resp.headers.set("X-Cache", "MISS");
    if (rateLimitResult) {
      applyEdgeRateLimitHeaders(resp, rateLimitResult);
    }

    // Store in cache (best effort)
    ctx.waitUntil(cache.put(cacheKey, resp.clone()));
    return resp;
  },
};
