export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/feed")) {
      return new Response("Not handled", { status: 404 });
    }

    const method = request.method === "HEAD" ? "GET" : request.method;
    const upstream = new URL(url.pathname + url.search, env.ORIGIN_BASE);
    const hasAuth = request.headers.has("authorization");

    const init = {
      method,
      headers: request.headers,
      cf: hasAuth
        ? { cacheEverything: false, cacheTtl: 0 }
        : { cacheEverything: true, cacheTtl: 60 }
    };

    if (hasAuth || method !== "GET") {
      const res = await fetch(upstream, init);
      const out = new Response(res.body, res);
      if (hasAuth) out.headers.set("Cache-Control", "private, no-store");
      out.headers.append("Vary", "Authorization");
      return out;
    }

    const key = new Request(upstream.toString(), request);
    const hit = await caches.default.match(key);
    if (hit) return hit;

    const res = await fetch(upstream, init);
    const out = new Response(res.body, res);
    out.headers.set("Cache-Control", "public, max-age=60");
    out.headers.append("Vary", "Authorization");
    if (res.status === 200) ctx.waitUntil(caches.default.put(key, out.clone()));
    return out;
  }
};

