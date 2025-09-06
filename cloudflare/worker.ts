export interface Env {
  FEED_CACHE_ENABLED?: string;
}

const FEED_PATH_PREFIX = "/api/feed";
const ALLOWED_PARAMS = new Set(["page", "pageSize", "timeWindow"]);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const auth = request.headers.get("authorization");
    const cachingEnabled = (env.FEED_CACHE_ENABLED || "true").toLowerCase() === "true";

    const isFeed = method === "GET" && url.pathname.startsWith(FEED_PATH_PREFIX);

    // Bypass conditions: non-feed, auth present, or disabled via env
    if (!isFeed || auth || !cachingEnabled) {
      const resp = await fetch(request);
      const r = new Response(resp.body, resp);
      r.headers.set("Vary", "Authorization");
      r.headers.set("X-Cache", auth ? "BYPASS" : "BYPASS");
      return r;
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

    // Store in cache (best effort)
    ctx.waitUntil(cache.put(cacheKey, resp.clone()));
    return resp;
  },
};

