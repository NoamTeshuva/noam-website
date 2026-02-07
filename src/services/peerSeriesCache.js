/**
 * Peer Series Cache Service
 * Persistent cache for peer stock daily time series bars.
 * Used by PeerAnalysis to avoid re-fetching bars on tab switches.
 *
 * Cache TTL: 1 hour during market hours, unlimited when market closed
 * Storage: localStorage with 24h auto-cleanup
 */

import { isMarketOpen } from '../utils/marketHours';

const CACHE_KEY = 'peerSeriesCache';
const CACHE_TTL = 3600000; // 1 hour

/**
 * Get cached time series bars for a symbol
 * @param {string} symbol - Stock symbol
 * @returns {Array|null} - Cached bars array or null
 */
export const getCachedPeerSeries = (symbol) => {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (!stored) return null;

    const cache = JSON.parse(stored);
    const upperSymbol = symbol.toUpperCase();

    if (!cache[upperSymbol]) return null;

    const { data, timestamp } = cache[upperSymbol];
    const age = Date.now() - timestamp;
    const marketOpen = isMarketOpen();

    // During market closed: use any cached data (daily bars don't change)
    if (!marketOpen) {
      console.log(`[PeerSeriesCache] Market closed - using cached series for ${upperSymbol} (${Math.round(age / 1000)}s old)`);
      return data;
    }

    // During market open: respect TTL (1 hour)
    if (age > CACHE_TTL) {
      console.log(`[PeerSeriesCache] Cache expired for ${upperSymbol} (${Math.round(age / 1000)}s old)`);
      return null;
    }

    console.log(`[PeerSeriesCache] Cache hit for ${upperSymbol} (${Math.round(age / 1000)}s old)`);
    return data;

  } catch (error) {
    console.warn('[PeerSeriesCache] Failed to load cache:', error);
    return null;
  }
};

/**
 * Save time series bars to cache
 * @param {string} symbol - Stock symbol
 * @param {Array} bars - Array of OHLCV bars
 */
export const savePeerSeries = (symbol, bars) => {
  try {
    const upperSymbol = symbol.toUpperCase();

    let cache = {};
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      cache = JSON.parse(stored);
    }

    cache[upperSymbol] = {
      data: bars,
      timestamp: Date.now()
    };

    // Remove entries older than 24 hours
    const now = Date.now();
    Object.keys(cache).forEach(key => {
      if (now - cache[key].timestamp > 86400000) {
        delete cache[key];
      }
    });

    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    console.log(`[PeerSeriesCache] Saved ${bars.length} bars for ${upperSymbol}`);

  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      // Clear old entries and retry
      console.warn('[PeerSeriesCache] Storage full, clearing old entries...');
      try {
        localStorage.removeItem(CACHE_KEY);
        const fresh = {};
        fresh[symbol.toUpperCase()] = { data: bars, timestamp: Date.now() };
        localStorage.setItem(CACHE_KEY, JSON.stringify(fresh));
      } catch (e) {
        console.error('[PeerSeriesCache] Failed to save even after cleanup:', e);
      }
    } else {
      console.warn('[PeerSeriesCache] Failed to save cache:', error);
    }
  }
};

/**
 * Clear cache for a specific symbol or all symbols
 * @param {string|null} symbol - Symbol to clear, or null for all
 */
export const clearPeerSeriesCache = (symbol = null) => {
  try {
    if (!symbol) {
      localStorage.removeItem(CACHE_KEY);
      console.log('[PeerSeriesCache] Cleared all cache');
      return;
    }

    const upperSymbol = symbol.toUpperCase();
    const stored = localStorage.getItem(CACHE_KEY);
    if (!stored) return;

    const cache = JSON.parse(stored);
    delete cache[upperSymbol];
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    console.log(`[PeerSeriesCache] Cleared cache for ${upperSymbol}`);

  } catch (error) {
    console.warn('[PeerSeriesCache] Failed to clear cache:', error);
  }
};
