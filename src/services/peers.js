/**
 * Comprehensive Peers Service
 *
 * Primary source: Finnhub Company Peers API
 * Hydration: Twelve Data for quotes and names
 * Fallback: TD-based discovery using sector/industry/market cap
 * Caching: 24h for peers, 60s for hydrated quotes
 */

import { twelveDataAPI } from '../utils/api';

const WORKER_URL = process.env.REACT_APP_WORKER_URL || '/api';
const PEERS_CACHE_TTL = 86400000; // 24 hours
const HYDRATED_CACHE_TTL = 60000; // 60 seconds
const MAX_PEERS = 5;

// In-memory cache
const peersCache = new Map();
const hydratedCache = new Map();

/**
 * Main entry point: Get peers for a symbol
 * @param {string} symbol - Stock symbol
 * @returns {Promise<string[]>} - Up to 5 peer tickers (excluding self)
 */
export const getPeers = async (symbol) => {
  const upperSymbol = symbol.toUpperCase();

  // Check cache first
  const cached = getCachedPeers(upperSymbol);
  if (cached) {
    console.log(`📋 [PEERS] Cache hit for ${upperSymbol}:`, cached);
    return cached;
  }

  console.log(`🔍 [PEERS] Fetching peers for ${upperSymbol}...`);

  try {
    // Try Finnhub first
    const finnhubPeers = await fetchFinnhubPeers(upperSymbol);

    if (finnhubPeers && finnhubPeers.length > 0) {
      const filtered = filterPeers(finnhubPeers, upperSymbol);
      cachePeers(upperSymbol, filtered);
      console.log(`✅ [PEERS] Finnhub peers for ${upperSymbol}:`, filtered);
      return filtered;
    }

    console.log(`⚠️ [PEERS] No Finnhub peers for ${upperSymbol}, trying fallback...`);

    // Fallback to TD-based discovery
    const tdPeers = await fetchTDFallbackPeers(upperSymbol);
    const filtered = filterPeers(tdPeers, upperSymbol);
    cachePeers(upperSymbol, filtered, true); // Mark as fallback
    console.log(`✅ [PEERS] TD fallback peers for ${upperSymbol}:`, filtered);
    return filtered;

  } catch (error) {
    console.error(`❌ [PEERS] Error fetching peers for ${upperSymbol}:`, error);

    // If we have stale cache, return it
    const staleCache = peersCache.get(upperSymbol);
    if (staleCache) {
      console.log(`📋 [PEERS] Returning stale cache for ${upperSymbol}`);
      return staleCache.peers;
    }

    return [];
  }
};

/**
 * Get peers with hydrated data (name + last price)
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Array>} - Array of peer objects with hydrated data
 */
export const getPeersHydrated = async (symbol) => {
  const upperSymbol = symbol.toUpperCase();

  // Check hydrated cache
  const cached = getCachedHydratedPeers(upperSymbol);
  if (cached) {
    console.log(`📋 [PEERS-HYDRATED] Cache hit for ${upperSymbol}`);
    return cached;
  }

  // Get peer tickers
  const peerSymbols = await getPeers(upperSymbol);

  if (peerSymbols.length === 0) {
    return [];
  }

  console.log(`💧 [PEERS-HYDRATED] Hydrating ${peerSymbols.length} peers for ${upperSymbol}...`);

  // Hydrate with TD data (with delay to avoid rate limits)
  const hydrated = [];
  for (let i = 0; i < peerSymbols.length; i++) {
    const peerSymbol = peerSymbols[i];

    try {
      // Add delay between requests (TD has 8 req/min limit)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const quoteData = await twelveDataAPI.getQuote(peerSymbol);

      hydrated.push({
        symbol: peerSymbol,
        name: quoteData.name || `${peerSymbol} Inc.`,
        lastPrice: quoteData.price || null,
        change: quoteData.change || null,
        changePercent: quoteData.changePercent || null,
        source: 'Twelve Data'
      });

    } catch (error) {
      console.warn(`⚠️ [PEERS-HYDRATED] Failed to hydrate ${peerSymbol}:`, error.message);

      // Graceful degradation - return ticker without quote
      hydrated.push({
        symbol: peerSymbol,
        name: `${peerSymbol} Inc.`,
        lastPrice: null,
        change: null,
        changePercent: null,
        source: null
      });
    }
  }

  cacheHydratedPeers(upperSymbol, hydrated);
  console.log(`✅ [PEERS-HYDRATED] Hydrated ${hydrated.length} peers for ${upperSymbol}`);
  return hydrated;
};

/**
 * Invalidate cache for a symbol or all symbols
 * @param {string} [symbol] - Optional symbol to invalidate (if omitted, clears all)
 */
export const invalidatePeers = (symbol = null) => {
  if (symbol) {
    const upperSymbol = symbol.toUpperCase();
    peersCache.delete(upperSymbol);
    hydratedCache.delete(upperSymbol);
    console.log(`🗑️ [PEERS] Invalidated cache for ${upperSymbol}`);
  } else {
    peersCache.clear();
    hydratedCache.clear();
    console.log(`🗑️ [PEERS] Invalidated all peer caches`);
  }
};

/**
 * Fetch peers from Finnhub
 * @private
 */
async function fetchFinnhubPeers(symbol) {
  try {
    const response = await fetch(
      `${WORKER_URL}/finnhub/stock/peers?symbol=${encodeURIComponent(symbol)}`
    );

    if (response.status === 429) {
      console.error('FINNHUB_429: Rate limit exceeded');
      return null;
    }

    if (!response.ok) {
      console.error(`[PEERS] Finnhub error ${response.status}`);
      return null;
    }

    const data = await response.json();

    // Finnhub returns an array of strings
    if (Array.isArray(data)) {
      return data;
    }

    return null;

  } catch (error) {
    console.error('[PEERS] Finnhub fetch error:', error);
    return null;
  }
}

/**
 * TD-based fallback: discover peers using sector/industry/market cap
 * @private
 */
async function fetchTDFallbackPeers(symbol) {
  console.log(`🔄 [PEERS-FALLBACK] Building TD fallback for ${symbol}...`);

  // For now, use a lightweight predefined mapping as fallback
  // In production, this would query TD /profile and /stocks endpoints
  const fallbackMap = {
    // Cruise lines
    'RCL': ['CCL', 'NCLH', 'CUK', 'ONON'],
    'CCL': ['RCL', 'NCLH', 'CUK', 'ONON'],
    'NCLH': ['RCL', 'CCL', 'CUK', 'ONON'],

    // Tech giants
    'AAPL': ['MSFT', 'GOOGL', 'META', 'AMZN'],
    'MSFT': ['AAPL', 'GOOGL', 'AMZN', 'META'],
    'GOOGL': ['AAPL', 'MSFT', 'META', 'AMZN'],
    'META': ['GOOGL', 'SNAP', 'PINS', 'SPOT'],
    'AMZN': ['AAPL', 'MSFT', 'GOOGL', 'WMT'],

    // EV & Auto
    'TSLA': ['NIO', 'RIVN', 'LCID', 'F'],
    'NIO': ['TSLA', 'LI', 'XPEV', 'RIVN'],
    'F': ['GM', 'TSLA', 'STLA', 'TM'],
    'GM': ['F', 'TSLA', 'STLA', 'TM'],

    // Semiconductors
    'NVDA': ['AMD', 'INTC', 'TSM', 'QCOM'],
    'AMD': ['NVDA', 'INTC', 'QCOM', 'MU'],
    'INTC': ['AMD', 'NVDA', 'QCOM', 'TSM'],

    // Banks
    'JPM': ['BAC', 'WFC', 'C', 'GS'],
    'BAC': ['JPM', 'WFC', 'C', 'USB'],
    'WFC': ['JPM', 'BAC', 'C', 'USB'],
  };

  return fallbackMap[symbol] || [];
}

/**
 * Filter and validate peer symbols
 * @private
 */
function filterPeers(peers, originalSymbol) {
  if (!Array.isArray(peers)) return [];

  return peers
    .filter(p => p && typeof p === 'string')
    .map(p => p.toUpperCase())
    .filter(p => p !== originalSymbol.toUpperCase()) // Exclude self
    .filter(p => p.length >= 1 && p.length <= 5) // Valid ticker format
    .slice(0, MAX_PEERS); // Limit to MAX_PEERS
}

/**
 * Cache peer data
 * @private
 */
function cachePeers(symbol, peers, isFallback = false) {
  peersCache.set(symbol, {
    peers,
    timestamp: Date.now(),
    isFallback
  });
}

/**
 * Get cached peers if still valid
 * @private
 */
function getCachedPeers(symbol) {
  const cached = peersCache.get(symbol);

  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age < PEERS_CACHE_TTL) {
    return cached.peers;
  }

  // Cache expired
  peersCache.delete(symbol);
  return null;
}

/**
 * Cache hydrated peer data
 * @private
 */
function cacheHydratedPeers(symbol, hydrated) {
  hydratedCache.set(symbol, {
    data: hydrated,
    timestamp: Date.now()
  });
}

/**
 * Get cached hydrated peers if still valid
 * @private
 */
function getCachedHydratedPeers(symbol) {
  const cached = hydratedCache.get(symbol);

  if (!cached) return null;

  const age = Date.now() - cached.timestamp;
  if (age < HYDRATED_CACHE_TTL) {
    return cached.data;
  }

  // Cache expired
  hydratedCache.delete(symbol);
  return null;
}

/**
 * Check if peer data is from fallback
 * @param {string} symbol - Stock symbol
 * @returns {boolean} - True if from fallback
 */
export const isPeerDataFallback = (symbol) => {
  const cached = peersCache.get(symbol.toUpperCase());
  return cached ? cached.isFallback : false;
};
