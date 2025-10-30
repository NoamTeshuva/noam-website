/**
 * Cloudflare Worker - Market Data API Proxy
 * Proxies Twelve Data and Finnhub APIs
 * Keeps API keys server-side and adds edge caching
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

    // Route to Finnhub or Twelve Data
    if (pathname.startsWith("/api/finnhub/")) {
      return handleFinnhubRequest(pathname, searchParams, env, ctx);
    }

    // Map /api/* -> Twelve Data endpoints
    return handleTwelveDataRequest(pathname, searchParams, env, ctx);
  }
};

/**
 * Handle Finnhub API requests
 */
async function handleFinnhubRequest(pathname, searchParams, env, ctx) {
  // Map /api/finnhub/* -> Finnhub endpoints
  const endpoint = pathname.replace("/api/finnhub", ""); // "/stock/peers"
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return new Response(JSON.stringify({ error: "Missing ?symbol parameter" }), {
      status: 400,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
    });
  }

  // Build Finnhub API URL
  const finnhubUrl = new URL(`https://finnhub.io/api/v1${endpoint}`);
  finnhubUrl.searchParams.set("symbol", symbol);
  finnhubUrl.searchParams.set("token", env.FINNHUB_TOKEN);

  // 24h edge cache for peers data
  const cacheTtl = endpoint === "/stock/peers" ? 86400 : 3600;
  const cache = caches.default;
  const cacheKey = new Request(finnhubUrl.toString(), {
    headers: { Accept: "application/json" }
  });

  // Try to get from cache
  let resp = await cache.match(cacheKey);

  if (!resp) {
    // Cache miss - fetch from Finnhub
    const upstream = await fetch(finnhubUrl, {
      cf: { cacheTtl: 0, cacheEverything: false }
    });

    const text = await upstream.text();

    // Handle rate limits and errors
    if (!upstream.ok) {
      const errorData = {
        error: `Finnhub error ${upstream.status}`,
        status: upstream.status,
        cached: false
      };

      // Log rate limit events
      if (upstream.status === 429) {
        console.error("FINNHUB_429: Rate limit exceeded");
      }

      return new Response(JSON.stringify(errorData), {
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
        "cache-control": `public, max-age=${cacheTtl}`,
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, OPTIONS",
        "x-cache": "MISS"
      }
    });

    // Store in edge cache
    ctx.waitUntil(cache.put(cacheKey, resp.clone()));
  } else {
    // Add cache hit header
    const headers = new Headers(resp.headers);
    headers.set("x-cache", "HIT");
    resp = new Response(resp.body, {
      status: resp.status,
      headers: headers
    });
  }

  return resp;
}

/**
 * Handle Twelve Data API requests
 */
async function handleTwelveDataRequest(pathname, searchParams, env, ctx) {
  const endpoint = pathname.replace("/api", ""); // "/quote" or "/time_series"
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return new Response(JSON.stringify({ error: "Missing ?symbol parameter" }), {
      status: 400,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" }
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
      // Log TD rate limit events
      if (upstream.status === 429) {
        console.error("TD_429_MINUTE: Twelve Data rate limit exceeded");
      }

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
        "access-control-allow-methods": "GET, OPTIONS",
        "x-cache": "MISS"
      }
    });

    // Store in edge cache
    ctx.waitUntil(cache.put(cacheKey, resp.clone()));
  } else {
    // Add cache hit header
    const headers = new Headers(resp.headers);
    headers.set("x-cache", "HIT");
    resp = new Response(resp.body, {
      status: resp.status,
      headers: headers
    });
  }

  return resp;
}
