/**
 * Peer Quotes Cache Service
 * Persistent cache for peer stock quotes to avoid refetching on tab switches
 *
 * Cache TTL: 5 minutes during market hours, unlimited when market closed
 * Storage: localStorage with memory fallback
 */

const CACHE_KEY = 'peerQuotesCache';
const CACHE_TTL = 300000; // 5 minutes

/**
 * Check if US market is currently open (NYSE hours)
 * @returns {boolean} - True if market is open
 */
const isMarketOpen = () => {
  const now = new Date();
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = etTime.getDay(); // 0 = Sunday, 6 = Saturday
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Market hours: Monday-Friday, 9:30 AM - 4:00 PM ET
  const isWeekday = day >= 1 && day <= 5;
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const marketClose = 16 * 60; // 4:00 PM

  return isWeekday && totalMinutes >= marketOpen && totalMinutes < marketClose;
};

/**
 * Get cached peer quotes for a parent symbol
 * @param {string} parentSymbol - The parent stock symbol
 * @returns {Object|null} - Cached peer data with metadata or null if missing
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
    const marketOpen = isMarketOpen();

    // During market closed: use any cached data (ignore TTL)
    if (!marketOpen) {
      console.log(`🌙 [PeerQuotesCache] Market closed - using cached data for ${upperSymbol} (${Math.round(age / 1000)}s old)`);
      return {
        ...data,
        _cacheInfo: {
          age,
          marketClosed: true,
          reason: 'market_closed'
        }
      };
    }

    // During market open: respect TTL
    if (age > CACHE_TTL) {
      console.log(`⏰ [PeerQuotesCache] Cache expired for ${upperSymbol} (${Math.round(age / 1000)}s old) - market is open`);
      return null;
    }

    console.log(`📋 [PeerQuotesCache] Cache hit for ${upperSymbol} (${Math.round(age / 1000)}s old)`);
    return {
      ...data,
      _cacheInfo: {
        age,
        marketClosed: false,
        reason: 'fresh_cache'
      }
    };

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

// Export market hours check for external use
export { isMarketOpen };

// Expose debug utilities to window
if (typeof window !== 'undefined') {
  window.peerQuotesCache = {
    get: getCachedPeerQuotes,
    clear: clearPeerQuotesCache,
    stats: getPeerQuotesCacheStats,
    isMarketOpen: isMarketOpen
  };
  console.log('🔧 [PeerQuotesCache] Debug tools available: window.peerQuotesCache');
}
