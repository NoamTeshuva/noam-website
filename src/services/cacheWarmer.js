/**
 * Cache Warmer Service
 * Preloads cache for watchlist symbols on app start and market open
 * Uses staggered requests to stay under API rate limits
 */

import { twelveDataAPI } from '../utils/api';
import { setInCache, hasFreshCache, getCacheStats } from './cacheManager';
import { isMarketOpen, getTimeUntilMarketOpen } from '../utils/marketHours';

// Minimum delay between API requests (ms) - 8 seconds to stay under 8 req/min
const REQUEST_STAGGER_MS = 8000;

// Track warming state
let isWarming = false;
let warmingAbortController = null;
let marketOpenTimeout = null;

/**
 * Warm the cache for a list of symbols
 * Fetches quotes and statistics for symbols that don't have fresh cache
 * @param {string[]} symbols - Array of stock symbols
 * @param {Object} options - Options
 * @param {boolean} options.force - Force refresh even if cache is fresh
 * @param {Function} options.onProgress - Progress callback (current, total)
 * @param {Function} options.onComplete - Completion callback (stats)
 * @returns {Promise<Object>} Warming results
 */
export async function warmCache(symbols, { force = false, onProgress, onComplete } = {}) {
  if (isWarming) {
    console.log('⚠️ Cache warming already in progress');
    return { status: 'already_running' };
  }

  if (!symbols || symbols.length === 0) {
    return { status: 'no_symbols' };
  }

  isWarming = true;
  warmingAbortController = new AbortController();

  const results = {
    quotes: { success: 0, skipped: 0, failed: 0 },
    statistics: { success: 0, skipped: 0, failed: 0 },
    startTime: Date.now(),
    endTime: null
  };

  console.log(`🔥 Starting cache warm for ${symbols.length} symbols...`);

  try {
    let progress = 0;
    const totalOps = symbols.length * 2; // quotes + statistics

    for (const symbol of symbols) {
      // Check for abort
      if (warmingAbortController.signal.aborted) {
        console.log('🛑 Cache warming aborted');
        break;
      }

      // Warm quote data
      if (force || !hasFreshCache(symbol, 'quote')) {
        try {
          const quote = await twelveDataAPI.getQuote(symbol);
          if (quote) {
            setInCache(symbol, 'quote', quote);
            results.quotes.success++;
            console.log(`✅ Warmed quote cache for ${symbol}`);
          }
        } catch (error) {
          results.quotes.failed++;
          console.warn(`⚠️ Failed to warm quote for ${symbol}:`, error.message);

          // Stop if rate limited
          if (error.message?.includes('TD_EXHAUSTED')) {
            console.log('🛑 Rate limit hit, stopping cache warm');
            break;
          }
        }
      } else {
        results.quotes.skipped++;
        console.log(`⏭️ Skipped quote for ${symbol} (fresh cache)`);
      }

      progress++;
      onProgress?.(progress, totalOps);

      // Wait before next request
      await delay(REQUEST_STAGGER_MS);

      // Warm statistics data
      if (force || !hasFreshCache(symbol, 'statistics')) {
        try {
          const stats = await twelveDataAPI.getStatistics(symbol);
          if (stats) {
            setInCache(symbol, 'statistics', stats);
            results.statistics.success++;
            console.log(`✅ Warmed statistics cache for ${symbol}`);
          }
        } catch (error) {
          results.statistics.failed++;
          console.warn(`⚠️ Failed to warm statistics for ${symbol}:`, error.message);

          if (error.message?.includes('TD_EXHAUSTED')) {
            console.log('🛑 Rate limit hit, stopping cache warm');
            break;
          }
        }
      } else {
        results.statistics.skipped++;
        console.log(`⏭️ Skipped statistics for ${symbol} (fresh cache)`);
      }

      progress++;
      onProgress?.(progress, totalOps);

      // Wait before next symbol
      if (symbols.indexOf(symbol) < symbols.length - 1) {
        await delay(REQUEST_STAGGER_MS);
      }
    }

    results.endTime = Date.now();
    results.duration = results.endTime - results.startTime;

    console.log('🔥 Cache warming complete:', {
      duration: `${(results.duration / 1000).toFixed(1)}s`,
      quotes: results.quotes,
      statistics: results.statistics,
      cacheStats: getCacheStats()
    });

    onComplete?.(results);
    return results;

  } finally {
    isWarming = false;
    warmingAbortController = null;
  }
}

/**
 * Stop any in-progress cache warming
 */
export function stopWarmCache() {
  if (warmingAbortController) {
    warmingAbortController.abort();
    console.log('🛑 Cache warming stop requested');
  }
}

/**
 * Schedule cache warming when market opens
 * @param {string[]} symbols - Array of stock symbols to warm
 * @param {Function} getSymbols - Function that returns current symbols (for dynamic lists)
 */
export function scheduleMarketOpenWarm(symbols, getSymbols) {
  // Clear any existing scheduled warm
  if (marketOpenTimeout) {
    clearTimeout(marketOpenTimeout);
    marketOpenTimeout = null;
  }

  // If market is already open, warm now
  if (isMarketOpen()) {
    const currentSymbols = getSymbols ? getSymbols() : symbols;
    warmCache(currentSymbols);
    return;
  }

  // Schedule warm for market open
  const timeUntilOpen = getTimeUntilMarketOpen();

  if (timeUntilOpen > 0 && timeUntilOpen < 24 * 60 * 60 * 1000) {
    console.log(`⏰ Scheduling cache warm for market open in ${formatDuration(timeUntilOpen)}`);

    marketOpenTimeout = setTimeout(() => {
      const currentSymbols = getSymbols ? getSymbols() : symbols;
      console.log('🔔 Market opening - starting scheduled cache warm');
      warmCache(currentSymbols);
    }, timeUntilOpen);
  }
}

/**
 * Cancel scheduled market open warming
 */
export function cancelScheduledWarm() {
  if (marketOpenTimeout) {
    clearTimeout(marketOpenTimeout);
    marketOpenTimeout = null;
    console.log('⏰ Cancelled scheduled cache warm');
  }
}

/**
 * Check if cache warming is currently in progress
 * @returns {boolean} True if warming
 */
export function isCacheWarming() {
  return isWarming;
}

// Helper: delay promise
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: format duration for logging
function formatDuration(ms) {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
