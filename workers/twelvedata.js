/**
 * Cloudflare Worker - Twelve Data API Proxy
 * Keeps API key server-side and adds edge caching
 */

export default {
  async fetch(request, env, ctx) {
    const { pathname, searchParams } = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, OPTIONS",
          "access-control-allow-headers": "Content-Type"
        }
      });
    }

    // Only handle /api/* routes
    if (!pathname.startsWith("/api/")) {
      return new Response("Not found", { status: 404 });
    }

    // Map /api/* -> Twelve Data endpoints
    const endpoint = pathname.replace("/api", ""); // "/quote" or "/time_series"
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return new Response(JSON.stringify({ error: "Missing ?symbol parameter" }), {
        status: 400,
        headers: { "content-type": "application/json" }
      });
    }

    // Build Twelve Data API URL
    const td = new URL(`https://api.twelvedata.com${endpoint}`);
    td.searchParams.set("symbol", symbol);
    td.searchParams.set("apikey", env.TWELVEDATA_KEY);

    // Add default parameters for time_series
    if (endpoint === "/time_series") {
      td.searchParams.set("interval", searchParams.get("interval") || "1min");
      td.searchParams.set("outputsize", searchParams.get("outputsize") || "1");
    }

    // 60s edge cache to stay well under free-tier limits (8 calls/min, 800/day)
    const cache = caches.default;
    const cacheKey = new Request(td.toString(), {
      headers: { Accept: "application/json" }
    });

    // Try to get from cache
    let resp = await cache.match(cacheKey);

    if (!resp) {
      // Cache miss - fetch from Twelve Data
      const upstream = await fetch(td, {
        cf: { cacheTtl: 0, cacheEverything: false }
      });

      const text = await upstream.text();

      if (!upstream.ok) {
        return new Response(text || `Upstream error ${upstream.status}`, {
          status: upstream.status,
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*"
          }
        });
      }

      // Create cacheable response
      resp = new Response(text, {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "public, max-age=60",
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, OPTIONS"
        }
      });

      // Store in edge cache
      ctx.waitUntil(cache.put(cacheKey, resp.clone()));
    }

    return resp;
  }
};
