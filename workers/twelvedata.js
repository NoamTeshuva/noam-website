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

    // Check if we should use Yahoo Finance (market closed)
    // Only for quote and statistics endpoints
    if (pathname === "/api/quote" || pathname === "/api/statistics") {
      const isMarketOpen = checkMarketHours();

      if (!isMarketOpen) {
        return handleYahooFinanceRequest(pathname, searchParams, env, ctx);
      }
    }

    // Map /api/* -> Twelve Data endpoints (market is open)
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

/**
 * Handle Yahoo Finance API requests (used when market is closed)
 * Returns data in Twelve Data compatible format
 */
async function handleYahooFinanceRequest(pathname, searchParams, env, ctx) {
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return new Response(JSON.stringify({ error: "Missing ?symbol parameter" }), {
      status: 400,
      headers: { "content-type": "application/json", ...CORS_HEADERS }
    });
  }

  // Build Yahoo Finance API URL
  const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;

  // Cache key specific to Yahoo Finance (separate from Twelve Data cache)
  const cache = caches.default;
  const cacheKey = new Request(`https://yahoo-cache/${symbol}${pathname}`, {
    headers: { Accept: "application/json" }
  });

  // TTL for market closed: 1 hour fresh, 2 hours stale-while-revalidate
  const ttl = { maxAge: 3600, swr: 7200 };

  // Try to get from cache
  let resp = await cache.match(cacheKey);

  if (!resp) {
    // Cache miss - fetch from Yahoo Finance
    try {
      const upstream = await fetch(yahooUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json"
        },
        cf: { cacheTtl: 0, cacheEverything: false }
      });

      if (!upstream.ok) {
        console.error(`Yahoo Finance error ${upstream.status} for ${symbol}`);
        return new Response(JSON.stringify({
          error: `Yahoo Finance error ${upstream.status}`,
          status: upstream.status,
          fallbackToTD: true
        }), {
          status: upstream.status,
          headers: { "content-type": "application/json", ...CORS_HEADERS }
        });
      }

      const yahooData = await upstream.json();
      const quote = yahooData?.quoteResponse?.result?.[0];

      if (!quote) {
        return new Response(JSON.stringify({
          error: "Symbol not found on Yahoo Finance",
          fallbackToTD: true
        }), {
          status: 404,
          headers: { "content-type": "application/json", ...CORS_HEADERS }
        });
      }

      // Transform Yahoo Finance data to Twelve Data format based on endpoint
      let transformedData;

      if (pathname === "/api/quote") {
        transformedData = transformYahooToQuote(quote);
      } else if (pathname === "/api/statistics") {
        transformedData = transformYahooToStatistics(quote);
      }

      const responseText = JSON.stringify(transformedData);

      // Create cacheable response
      resp = new Response(responseText, {
        status: 200,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": `public, max-age=${ttl.maxAge}, stale-while-revalidate=${ttl.swr}`,
          ...CORS_HEADERS,
          "x-cache": "MISS",
          "x-data-source": "Yahoo Finance",
          "x-market-open": "false",
          "x-cache-ttl": String(ttl.maxAge)
        }
      });

      // Store in edge cache
      ctx.waitUntil(cache.put(cacheKey, resp.clone()));

      console.log(`📈 Yahoo Finance cache MISS for ${symbol}${pathname} (TTL: ${ttl.maxAge}s, market: closed)`);
    } catch (error) {
      console.error(`Yahoo Finance fetch error for ${symbol}:`, error);
      return new Response(JSON.stringify({
        error: "Failed to fetch from Yahoo Finance",
        fallbackToTD: true
      }), {
        status: 500,
        headers: { "content-type": "application/json", ...CORS_HEADERS }
      });
    }
  } else {
    // Cache hit - add headers
    const headers = new Headers(resp.headers);
    headers.set("x-cache", "HIT");
    headers.set("x-data-source", "Yahoo Finance");
    headers.set("x-market-open", "false");
    resp = new Response(resp.body, {
      status: resp.status,
      headers: headers
    });
  }

  return resp;
}

/**
 * Transform Yahoo Finance quote to Twelve Data quote format
 */
function transformYahooToQuote(quote) {
  return {
    symbol: quote.symbol,
    name: quote.shortName || quote.longName,
    exchange: quote.exchange,
    currency: quote.currency,
    datetime: new Date().toISOString(),
    timestamp: Math.floor(Date.now() / 1000),
    open: quote.regularMarketOpen?.toString(),
    high: quote.regularMarketDayHigh?.toString(),
    low: quote.regularMarketDayLow?.toString(),
    close: quote.regularMarketPrice?.toString(),
    previous_close: quote.regularMarketPreviousClose?.toString(),
    change: quote.regularMarketChange?.toString(),
    percent_change: quote.regularMarketChangePercent?.toString(),
    volume: quote.regularMarketVolume,
    average_volume: quote.averageDailyVolume10Day || quote.averageDailyVolume3Month,
    is_market_open: false,
    // Source indicator for frontend
    _source: "yahoo"
  };
}

/**
 * Transform Yahoo Finance data to Twelve Data statistics format
 */
function transformYahooToStatistics(quote) {
  return {
    symbol: quote.symbol,
    name: quote.shortName || quote.longName,
    exchange: quote.exchange,
    currency: quote.currency,
    statistics: {
      // Valuation
      market_capitalization: quote.marketCap,
      enterprise_value: quote.enterpriseValue,
      trailing_pe: quote.trailingPE,
      forward_pe: quote.forwardPE,
      peg_ratio: quote.pegRatio,
      price_to_sales_ttm: quote.priceToSalesTrailing12Months,
      price_to_book: quote.priceToBook,
      enterprise_to_revenue: quote.enterpriseToRevenue,
      enterprise_to_ebitda: quote.enterpriseToEbitda,

      // Financial metrics
      profit_margin: quote.profitMargins,
      operating_margin: quote.operatingMargins,
      return_on_assets: quote.returnOnAssets,
      return_on_equity: quote.returnOnEquity,
      revenue: quote.totalRevenue,
      revenue_per_share: quote.revenuePerShare,
      quarterly_revenue_growth: quote.revenueGrowth,
      gross_profit: quote.grossProfits,
      ebitda: quote.ebitda,
      net_income: quote.netIncomeToCommon,
      diluted_eps_ttm: quote.epsTrailingTwelveMonths,
      quarterly_earnings_growth: quote.earningsQuarterlyGrowth,

      // Stock metrics
      beta: quote.beta,
      "52_week_high": quote.fiftyTwoWeekHigh,
      "52_week_low": quote.fiftyTwoWeekLow,
      "50_day_ma": quote.fiftyDayAverage,
      "200_day_ma": quote.twoHundredDayAverage,
      shares_outstanding: quote.sharesOutstanding,
      shares_float: quote.floatShares,
      shares_short: quote.sharesShort,
      short_ratio: quote.shortRatio,
      short_percent_of_float: quote.shortPercentOfFloat,

      // Dividends
      dividend_rate: quote.dividendRate,
      dividend_yield: quote.dividendYield,
      trailing_annual_dividend_rate: quote.trailingAnnualDividendRate,
      trailing_annual_dividend_yield: quote.trailingAnnualDividendYield,
      payout_ratio: quote.payoutRatio,
      ex_dividend_date: quote.exDividendDate
    },
    // Source indicator for frontend
    _source: "yahoo"
  };
}
