/**
 * Peer Quotes Cache Service
 * Persistent cache for peer stock quotes to avoid refetching on tab switches
 *
 * Cache TTL: 5 minutes
 * Storage: localStorage with memory fallback
 */

const CACHE_KEY = 'peerQuotesCache';
const CACHE_TTL = 300000; // 5 minutes

/**
 * Get cached peer quotes for a parent symbol
 * @param {string} parentSymbol - The parent stock symbol
 * @returns {Object|null} - Cached peer data or null if expired/missing
 */
export const getCachedPeerQuotes = (parentSymbol) => {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (!stored) return null;

    const cache = JSON.parse(stored);
    const upperSymbol = parentSymbol.toUpperCase();

    // Check if we have data for this symbol
    if (!cache[upperSymbol]) return null;

    const { data, timestamp } = cache[upperSymbol];
    const age = Date.now() - timestamp;

    // Check if cache is still valid
    if (age > CACHE_TTL) {
      console.log(`⏰ [PeerQuotesCache] Cache expired for ${upperSymbol} (${Math.round(age / 1000)}s old)`);
      return null;
    }

    console.log(`📋 [PeerQuotesCache] Cache hit for ${upperSymbol} (${Math.round(age / 1000)}s old)`);
    return data;

  } catch (error) {
    console.warn('[PeerQuotesCache] Failed to load cache:', error);
    return null;
  }
};

/**
 * Save peer quotes to cache
 * @param {string} parentSymbol - The parent stock symbol
 * @param {Object} quotes - Object with peer quotes { SYMBOL: { price, change, ... } }
 */
export const savePeerQuotes = (parentSymbol, quotes) => {
  try {
    const upperSymbol = parentSymbol.toUpperCase();

    // Load existing cache
    let cache = {};
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      cache = JSON.parse(stored);
    }

    // Update cache for this symbol
    cache[upperSymbol] = {
      data: quotes,
      timestamp: Date.now()
    };

    // Remove old entries (older than 24 hours)
    const now = Date.now();
    Object.keys(cache).forEach(key => {
      if (now - cache[key].timestamp > 86400000) { // 24 hours
        delete cache[key];
      }
    });

    // Save to localStorage
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    console.log(`💾 [PeerQuotesCache] Saved ${Object.keys(quotes).length} peer quotes for ${upperSymbol}`);

  } catch (error) {
    console.warn('[PeerQuotesCache] Failed to save cache:', error);
  }
};

/**
 * Clear cache for a specific symbol or all symbols
 * @param {string|null} parentSymbol - Symbol to clear, or null for all
 */
export const clearPeerQuotesCache = (parentSymbol = null) => {
  try {
    if (!parentSymbol) {
      // Clear all
      localStorage.removeItem(CACHE_KEY);
      console.log('🗑️ [PeerQuotesCache] Cleared all peer quotes cache');
      return;
    }

    const upperSymbol = parentSymbol.toUpperCase();
    const stored = localStorage.getItem(CACHE_KEY);
    if (!stored) return;

    const cache = JSON.parse(stored);
    delete cache[upperSymbol];
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    console.log(`🗑️ [PeerQuotesCache] Cleared cache for ${upperSymbol}`);

  } catch (error) {
    console.warn('[PeerQuotesCache] Failed to clear cache:', error);
  }
};

/**
 * Get cache statistics
 * @returns {Object} - Cache stats
 */
export const getPeerQuotesCacheStats = () => {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (!stored) {
      return { symbols: 0, totalQuotes: 0, size: 0 };
    }

    const cache = JSON.parse(stored);
    const symbols = Object.keys(cache);
    const totalQuotes = symbols.reduce((sum, key) => {
      return sum + Object.keys(cache[key].data || {}).length;
    }, 0);

    return {
      symbols: symbols.length,
      totalQuotes,
      size: new Blob([stored]).size,
      entries: symbols.map(key => ({
        symbol: key,
        peers: Object.keys(cache[key].data || {}).length,
        age: Math.round((Date.now() - cache[key].timestamp) / 1000),
        timestamp: new Date(cache[key].timestamp).toLocaleString()
      }))
    };
  } catch (error) {
    console.warn('[PeerQuotesCache] Failed to get stats:', error);
    return { symbols: 0, totalQuotes: 0, size: 0 };
  }
};

// Expose debug utilities to window
if (typeof window !== 'undefined') {
  window.peerQuotesCache = {
    get: getCachedPeerQuotes,
    clear: clearPeerQuotesCache,
    stats: getPeerQuotesCacheStats
  };
  console.log('🔧 [PeerQuotesCache] Debug tools available: window.peerQuotesCache');
}
