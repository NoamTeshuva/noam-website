/**
 * Cache Manager
 * Central cache with localStorage persistence and market-hours-aware TTLs
 * Implements stale-while-revalidate pattern for optimal UX
 */

import { isMarketOpen } from '../utils/marketHours';

// Cache key prefix to avoid collisions
const CACHE_PREFIX = 'mkt_cache_';
const CACHE_META_KEY = 'mkt_cache_meta';

// TTL Configuration (in milliseconds)
const TTL_CONFIG = {
  quote: {
    marketOpen: 1 * 60 * 1000,      // 1 minute during trading
    marketClosed: 60 * 60 * 1000    // 1 hour when closed
  },
  statistics: {
    marketOpen: 60 * 60 * 1000,     // 1 hour during trading
    marketClosed: 24 * 60 * 60 * 1000 // 24 hours when closed
  },
  peers: {
    marketOpen: 24 * 60 * 60 * 1000,  // 24 hours always
    marketClosed: 24 * 60 * 60 * 1000
  },
  timeSeries: {
    marketOpen: 1 * 60 * 1000,      // 1 minute during trading
    marketClosed: 60 * 60 * 1000    // 1 hour when closed
  }
};

// Stale threshold multiplier (data is stale after TTL, but usable until this multiple)
const STALE_MULTIPLIER = 5;

/**
 * Get the appropriate TTL for a data type based on market status
 * @param {string} dataType - Type of data (quote, statistics, peers, timeSeries)
 * @returns {number} TTL in milliseconds
 */
function getTTL(dataType) {
  const config = TTL_CONFIG[dataType] || TTL_CONFIG.quote;
  return isMarketOpen() ? config.marketOpen : config.marketClosed;
}

/**
 * Generate cache key for a symbol and data type
 * @param {string} symbol - Stock symbol
 * @param {string} dataType - Type of data
 * @returns {string} Cache key
 */
function getCacheKey(symbol, dataType) {
  return `${CACHE_PREFIX}${dataType}_${symbol.toUpperCase()}`;
}

/**
 * Get cached data for a symbol
 * @param {string} symbol - Stock symbol
 * @param {string} dataType - Type of data (quote, statistics, peers, timeSeries)
 * @returns {Object|null} Cached data with metadata or null if not found
 */
export function getFromCache(symbol, dataType) {
  try {
    const key = getCacheKey(symbol, dataType);
    const cached = localStorage.getItem(key);

    if (!cached) return null;

    const { data, timestamp, ttl } = JSON.parse(cached);
    const age = Date.now() - timestamp;
    const currentTTL = getTTL(dataType);

    // Check if data is still fresh
    const isFresh = age < currentTTL;

    // Check if data is stale but still usable
    const isStale = age >= currentTTL && age < currentTTL * STALE_MULTIPLIER;

    // Check if data is expired (unusable)
    const isExpired = age >= currentTTL * STALE_MULTIPLIER;

    if (isExpired) {
      // Data is too old, remove it
      localStorage.removeItem(key);
      return null;
    }

    return {
      data,
      timestamp,
      age,
      isFresh,
      isStale,
      ttl: currentTTL,
      source: 'localStorage'
    };
  } catch (error) {
    console.warn(`Cache read error for ${symbol}/${dataType}:`, error);
    return null;
  }
}

/**
 * Store data in cache
 * @param {string} symbol - Stock symbol
 * @param {string} dataType - Type of data
 * @param {Object} data - Data to cache
 */
export function setInCache(symbol, dataType, data) {
  try {
    const key = getCacheKey(symbol, dataType);
    const ttl = getTTL(dataType);

    const cacheEntry = {
      data,
      timestamp: Date.now(),
      ttl
    };

    localStorage.setItem(key, JSON.stringify(cacheEntry));
    updateCacheMeta(symbol, dataType);
  } catch (error) {
    // Handle localStorage full
    if (error.name === 'QuotaExceededError') {
      console.warn('Cache full, clearing old entries...');
      clearOldCacheEntries();
      try {
        localStorage.setItem(getCacheKey(symbol, dataType), JSON.stringify({
          data,
          timestamp: Date.now(),
          ttl: getTTL(dataType)
        }));
      } catch (e) {
        console.error('Cache write failed even after cleanup:', e);
      }
    } else {
      console.error('Cache write error:', error);
    }
  }
}

/**
 * Remove specific item from cache
 * @param {string} symbol - Stock symbol
 * @param {string} dataType - Type of data
 */
export function removeFromCache(symbol, dataType) {
  try {
    const key = getCacheKey(symbol, dataType);
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Cache remove error:', error);
  }
}

/**
 * Clear all cached data for a symbol
 * @param {string} symbol - Stock symbol
 */
export function clearSymbolCache(symbol) {
  const dataTypes = ['quote', 'statistics', 'peers', 'timeSeries'];
  dataTypes.forEach(dataType => removeFromCache(symbol, dataType));
}

/**
 * Clear entire cache
 */
export function clearAllCache() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    localStorage.removeItem(CACHE_META_KEY);
    console.log(`🗑️ Cleared ${keysToRemove.length} cache entries`);
  } catch (error) {
    console.error('Cache clear error:', error);
  }
}

/**
 * Clear old/expired cache entries
 */
function clearOldCacheEntries() {
  try {
    const keysToRemove = [];
    const now = Date.now();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX) && key !== CACHE_META_KEY) {
        try {
          const cached = JSON.parse(localStorage.getItem(key));
          const age = now - cached.timestamp;
          // Remove if older than 24 hours
          if (age > 24 * 60 * 60 * 1000) {
            keysToRemove.push(key);
          }
        } catch (e) {
          // Remove invalid entries
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`🧹 Cleaned up ${keysToRemove.length} old cache entries`);
  } catch (error) {
    console.error('Cache cleanup error:', error);
  }
}

/**
 * Update cache metadata for statistics
 */
function updateCacheMeta(symbol, dataType) {
  try {
    const meta = JSON.parse(localStorage.getItem(CACHE_META_KEY) || '{}');
    meta.lastUpdate = Date.now();
    meta.entries = meta.entries || {};
    meta.entries[`${symbol}_${dataType}`] = Date.now();
    localStorage.setItem(CACHE_META_KEY, JSON.stringify(meta));
  } catch (error) {
    // Non-critical, ignore
  }
}

/**
 * Get cache statistics for debugging
 * @returns {Object} Cache statistics
 */
export function getCacheStats() {
  const stats = {
    entries: 0,
    fresh: 0,
    stale: 0,
    totalSize: 0,
    byType: {}
  };

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX) && key !== CACHE_META_KEY) {
        const value = localStorage.getItem(key);
        stats.entries++;
        stats.totalSize += (key.length + (value?.length || 0)) * 2; // UTF-16

        try {
          const cached = JSON.parse(value);
          const age = Date.now() - cached.timestamp;

          // Extract data type from key
          const keyParts = key.replace(CACHE_PREFIX, '').split('_');
          const dataType = keyParts[0];
          const ttl = getTTL(dataType);

          stats.byType[dataType] = (stats.byType[dataType] || 0) + 1;

          if (age < ttl) {
            stats.fresh++;
          } else {
            stats.stale++;
          }
        } catch (e) {
          // Invalid entry
        }
      }
    }

    stats.totalSizeKB = (stats.totalSize / 1024).toFixed(2);
  } catch (error) {
    console.error('Cache stats error:', error);
  }

  return stats;
}

/**
 * Check if cached data exists and is fresh (no refresh needed)
 * @param {string} symbol - Stock symbol
 * @param {string} dataType - Type of data
 * @returns {boolean} True if fresh cache exists
 */
export function hasFreshCache(symbol, dataType) {
  const cached = getFromCache(symbol, dataType);
  return cached?.isFresh === true;
}

/**
 * Check if cached data exists (fresh or stale)
 * @param {string} symbol - Stock symbol
 * @param {string} dataType - Type of data
 * @returns {boolean} True if any cache exists
 */
export function hasCache(symbol, dataType) {
  return getFromCache(symbol, dataType) !== null;
}

/**
 * Perform cache-first fetch with stale-while-revalidate
 * @param {string} symbol - Stock symbol
 * @param {string} dataType - Type of data
 * @param {Function} fetchFn - Function to fetch fresh data
 * @returns {Promise<Object>} Data with cache metadata
 */
export async function cacheFirst(symbol, dataType, fetchFn) {
  const cached = getFromCache(symbol, dataType);

  // If we have fresh data, return it immediately
  if (cached?.isFresh) {
    console.log(`📦 Cache HIT (fresh) for ${symbol}/${dataType}`);
    return {
      ...cached.data,
      _cached: true,
      _stale: false,
      _cacheAge: cached.age,
      _offline: false
    };
  }

  // If we have stale data, return it but revalidate in background
  if (cached?.isStale) {
    console.log(`📦 Cache HIT (stale) for ${symbol}/${dataType} - revalidating...`);

    // Revalidate in background (don't await)
    fetchFn().then(freshData => {
      if (freshData) {
        setInCache(symbol, dataType, freshData);
        console.log(`✅ Cache revalidated for ${symbol}/${dataType}`);
      }
    }).catch(error => {
      console.warn(`⚠️ Background revalidation failed for ${symbol}/${dataType}:`, error.message);
    });

    return {
      ...cached.data,
      _cached: true,
      _stale: true,
      _cacheAge: cached.age,
      _offline: false
    };
  }

  // No cache, fetch fresh data
  console.log(`📦 Cache MISS for ${symbol}/${dataType} - fetching...`);

  try {
    const freshData = await fetchFn();
    if (freshData) {
      setInCache(symbol, dataType, freshData);
    }
    return {
      ...freshData,
      _cached: false,
      _stale: false,
      _offline: false
    };
  } catch (error) {
    // If fetch fails and we have any cached data (even expired), use it
    if (cached) {
      console.warn(`⚠️ Fetch failed, using expired cache for ${symbol}/${dataType}`);
      return {
        ...cached.data,
        _cached: true,
        _stale: true,
        _offline: true,
        _error: error.message
      };
    }
    throw error;
  }
}

/**
 * Preload cache for multiple symbols
 * @param {string[]} symbols - Array of stock symbols
 * @param {string} dataType - Type of data
 * @param {Function} fetchFn - Function to fetch data (receives symbol)
 * @param {number} staggerMs - Delay between requests (default: 8000ms)
 */
export async function preloadCache(symbols, dataType, fetchFn, staggerMs = 8000) {
  const symbolsToFetch = symbols.filter(symbol => !hasFreshCache(symbol, dataType));

  if (symbolsToFetch.length === 0) {
    console.log(`📦 All ${dataType} data already cached`);
    return;
  }

  console.log(`🔄 Preloading ${dataType} for ${symbolsToFetch.length} symbols...`);

  for (let i = 0; i < symbolsToFetch.length; i++) {
    const symbol = symbolsToFetch[i];

    try {
      const data = await fetchFn(symbol);
      if (data) {
        setInCache(symbol, dataType, data);
        console.log(`✅ Preloaded ${symbol}/${dataType} (${i + 1}/${symbolsToFetch.length})`);
      }
    } catch (error) {
      console.warn(`⚠️ Preload failed for ${symbol}/${dataType}:`, error.message);
    }

    // Stagger requests to stay under rate limits
    if (i < symbolsToFetch.length - 1) {
      await new Promise(resolve => setTimeout(resolve, staggerMs));
    }
  }
}

// Export TTL config for debugging
export const TTLS = TTL_CONFIG;
