/**
 * Cloudflare Worker - Market Data API Proxy
 * Proxies Twelve Data and Finnhub APIs
 * Keeps API keys server-side and adds edge caching
 * Includes JWT-based authentication
 */

// JWT Secret should be set as environment variable: JWT_SECRET
// Password hash should be set as environment variable: AUTH_PASSWORD_HASH
// Username should be set as environment variable: AUTH_USERNAME

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization"
};

// Rate limiting for login attempts (simple in-memory, resets on worker restart)
const loginAttempts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_ATTEMPTS = 5;

/**
 * Check if US stock market is currently open
 * Market hours: Monday-Friday, 9:30 AM - 4:00 PM ET
 * @returns {boolean} True if market is open
 */
function checkMarketHours() {
  const now = new Date();
  // Convert to ET using manual offset (UTC-5 for EST, UTC-4 for EDT)
  // For simplicity, we use a fixed offset; in production you'd want proper timezone handling
  const etOffset = isDST(now) ? -4 : -5;
  const etTime = new Date(now.getTime() + (etOffset * 60 + now.getTimezoneOffset()) * 60000);

  const day = etTime.getDay(); // 0 = Sunday, 6 = Saturday
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Market hours: Monday-Friday, 9:30 AM - 4:00 PM ET
  const isWeekday = day >= 1 && day <= 5;
  const marketOpen = 9 * 60 + 30; // 9:30 AM in minutes
  const marketClose = 16 * 60; // 4:00 PM in minutes
  const isDuringMarketHours = totalMinutes >= marketOpen && totalMinutes < marketClose;

  return isWeekday && isDuringMarketHours;
}

/**
 * Check if date is in Daylight Saving Time (US rules)
 * DST starts second Sunday in March, ends first Sunday in November
 */
function isDST(date) {
  const year = date.getUTCFullYear();

  // Second Sunday in March
  const marchStart = new Date(Date.UTC(year, 2, 1));
  const dstStart = new Date(marchStart);
  dstStart.setUTCDate(14 - marchStart.getUTCDay());
  dstStart.setUTCHours(7); // 2 AM ET = 7 AM UTC

  // First Sunday in November
  const novStart = new Date(Date.UTC(year, 10, 1));
  const dstEnd = new Date(novStart);
  dstEnd.setUTCDate(7 - novStart.getUTCDay());
  dstEnd.setUTCHours(6); // 2 AM ET = 6 AM UTC (still in DST)

  return date >= dstStart && date < dstEnd;
}

/**
 * Get appropriate cache TTL based on market status and endpoint
 * @param {string} endpoint - API endpoint (e.g., "/quote", "/statistics")
 * @returns {Object} { maxAge: number, staleWhileRevalidate: number }
 */
function getCacheTTL(endpoint) {
  const marketOpen = checkMarketHours();

  // TTL configuration (in seconds)
  const ttlConfig = {
    '/quote': {
      marketOpen: { maxAge: 60, swr: 120 },      // 1 min fresh, 2 min stale-ok
      marketClosed: { maxAge: 3600, swr: 7200 }  // 1 hr fresh, 2 hr stale-ok
    },
    '/statistics': {
      marketOpen: { maxAge: 3600, swr: 7200 },     // 1 hr fresh, 2 hr stale-ok
      marketClosed: { maxAge: 86400, swr: 172800 } // 24 hr fresh, 48 hr stale-ok
    },
    '/time_series': {
      marketOpen: { maxAge: 60, swr: 120 },      // 1 min fresh, 2 min stale-ok
      marketClosed: { maxAge: 3600, swr: 7200 }  // 1 hr fresh, 2 hr stale-ok
    }
  };

  const config = ttlConfig[endpoint] || ttlConfig['/quote'];
  return marketOpen ? config.marketOpen : config.marketClosed;
}

export default {
  async fetch(request, env, ctx) {
    const { pathname, searchParams } = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    // Only handle /api/* routes
    if (!pathname.startsWith("/api/")) {
      return new Response("Not found", { status: 404 });
    }

    // Auth endpoints (no token required)
    if (pathname === "/api/auth/login") {
      return handleLogin(request, env);
    }

    if (pathname === "/api/auth/verify") {
      return handleVerifyToken(request, env);
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
 * Handle login requests
 */
async function handleLogin(request, env) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // Get client IP for rate limiting
  const clientIP = request.headers.get("cf-connecting-ip") || "unknown";

  // Check rate limit
  const now = Date.now();
  const attempts = loginAttempts.get(clientIP) || { count: 0, firstAttempt: now };

  // Reset if window has passed
  if (now - attempts.firstAttempt > RATE_LIMIT_WINDOW) {
    attempts.count = 0;
    attempts.firstAttempt = now;
  }

  if (attempts.count >= MAX_ATTEMPTS) {
    const remainingTime = Math.ceil((RATE_LIMIT_WINDOW - (now - attempts.firstAttempt)) / 1000);
    return jsonResponse({
      error: "Too many login attempts",
      retryAfter: remainingTime
    }, 429);
  }

  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      attempts.count++;
      loginAttempts.set(clientIP, attempts);
      return jsonResponse({ error: "Missing credentials" }, 400);
    }

    // Normalize username
    const normalizedUsername = username.trim().toLowerCase();
    const expectedUsername = (env.AUTH_USERNAME || "").toLowerCase();

    // Verify credentials
    const isValidPassword = await verifyPassword(password, env.AUTH_PASSWORD_HASH || "");
    const isValidUsername = normalizedUsername === expectedUsername;

    if (!isValidUsername || !isValidPassword) {
      attempts.count++;
      loginAttempts.set(clientIP, attempts);
      return jsonResponse({ error: "Invalid credentials" }, 401);
    }

    // Clear attempts on successful login
    loginAttempts.delete(clientIP);

    // Generate JWT
    const token = await generateJWT({ username: normalizedUsername }, env.JWT_SECRET);

    return jsonResponse({
      success: true,
      token,
      expiresIn: 86400 // 24 hours
    });

  } catch (error) {
    console.error("Login error:", error);
    return jsonResponse({ error: "Login failed" }, 500);
  }
}

/**
 * Handle token verification
 */
async function handleVerifyToken(request, env) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return jsonResponse({ valid: false, error: "No token provided" }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const payload = await verifyJWT(token, env.JWT_SECRET);
    if (payload) {
      return jsonResponse({ valid: true, username: payload.username });
    }
    return jsonResponse({ valid: false, error: "Invalid token" }, 401);
  } catch (error) {
    return jsonResponse({ valid: false, error: "Token verification failed" }, 401);
  }
}

/**
 * Generate a simple JWT using Web Crypto API
 */
async function generateJWT(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);

  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + 86400 // 24 hours
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = await hmacSign(data, secret);
  return `${data}.${signature}`;
}

/**
 * Verify JWT token
 */
async function verifyJWT(token, secret) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const data = `${header}.${payload}`;

    // Verify signature
    const expectedSignature = await hmacSign(data, secret);
    if (signature !== expectedSignature) return null;

    // Decode and check expiration
    const decodedPayload = JSON.parse(base64UrlDecode(payload));
    const now = Math.floor(Date.now() / 1000);

    if (decodedPayload.exp && decodedPayload.exp < now) {
      return null; // Token expired
    }

    return decodedPayload;
  } catch (error) {
    return null;
  }
}

/**
 * HMAC-SHA256 signing
 */
async function hmacSign(data, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Verify password against stored hash (SHA-256 based)
 * Hash format: salt:hash (both base64url encoded)
 */
async function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;

  const [salt, hash] = storedHash.split(":");
  const encoder = new TextEncoder();

  // Hash the provided password with the same salt
  const dataToHash = encoder.encode(salt + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataToHash);
  const computedHash = base64UrlEncode(String.fromCharCode(...new Uint8Array(hashBuffer)));

  // Constant-time comparison
  return computedHash === hash;
}

/**
 * Generate password hash (utility function - run once to generate hash)
 * Use: generatePasswordHash("yourpassword")
 */
async function generatePasswordHash(password) {
  const encoder = new TextEncoder();

  // Generate random salt
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const salt = base64UrlEncode(String.fromCharCode(...saltBytes));

  // Hash password with salt
  const dataToHash = encoder.encode(salt + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataToHash);
  const hash = base64UrlEncode(String.fromCharCode(...new Uint8Array(hashBuffer)));

  return `${salt}:${hash}`;
}

// Base64URL encoding/decoding
function base64UrlEncode(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return atob(str);
}

// Helper for JSON responses
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      ...CORS_HEADERS
    }
  });
}

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
 * Uses market-aware dynamic TTLs for optimal caching
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

  // Get dynamic TTL based on market hours
  const ttl = getCacheTTL(endpoint);
  const isMarketOpen = checkMarketHours();

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

    // Create cacheable response with stale-while-revalidate
    resp = new Response(text, {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": `public, max-age=${ttl.maxAge}, stale-while-revalidate=${ttl.swr}`,
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, OPTIONS",
        "x-cache": "MISS",
        "x-market-open": isMarketOpen ? "true" : "false",
        "x-cache-ttl": String(ttl.maxAge)
      }
    });

    // Store in edge cache
    ctx.waitUntil(cache.put(cacheKey, resp.clone()));

    console.log(`📊 TD cache MISS for ${symbol}${endpoint} (TTL: ${ttl.maxAge}s, market: ${isMarketOpen ? 'open' : 'closed'})`);
  } else {
    // Add cache hit headers
    const headers = new Headers(resp.headers);
    headers.set("x-cache", "HIT");
    headers.set("x-market-open", isMarketOpen ? "true" : "false");
    resp = new Response(resp.body, {
      status: resp.status,
      headers: headers
    });
  }

  return resp;
}
