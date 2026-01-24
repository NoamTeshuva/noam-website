import { useState, useEffect, useRef } from 'react';
import { twelveDataAPI, cachedTwelveDataAPI } from '../utils/api';
import { isMarketOpen as checkMarketStatus } from '../utils/marketHours';
import { getCacheStats } from '../services/cacheManager';

export const useSmartPolling = (symbols) => {
  const [stockData, setStockData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const intervalsRef = useRef({});
  const marketCheckInterval = useRef(null);
  const fundamentalsFetchedRef = useRef(new Set()); // Track which symbols have fundamentals
  const initialLoadCompleteRef = useRef(false);
  const pendingFetchesRef = useRef(0);

  // Check if US market is currently open (NYSE hours)
  const checkMarketHours = () => {
    const marketIsOpen = checkMarketStatus();
    setIsMarketOpen(marketIsOpen);

    const etTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    console.log(`🕐 Market status: ${marketIsOpen ? 'OPEN' : 'CLOSED'} (ET: ${etTime.toLocaleTimeString()})`);

    return marketIsOpen;
  };

  // Load cached data instantly on mount
  const loadCachedData = (symbolsList) => {
    const cachedStockData = {};
    let hasAnyCachedData = false;

    symbolsList.forEach(symbol => {
      const cachedQuote = cachedTwelveDataAPI.getCachedQuote(symbol);
      const cachedStats = cachedTwelveDataAPI.getCachedStatistics(symbol);

      if (cachedQuote || cachedStats) {
        hasAnyCachedData = true;
        cachedStockData[symbol] = {
          symbol,
          // Quote data
          ...(cachedQuote || {}),
          // Statistics data
          ...(cachedStats || {}),
          // Mark as cached
          isLoading: false,
          usingCachedData: true,
          _cached: true,
          _stale: cachedQuote?._stale || cachedStats?._stale || false,
          dataSource: cachedQuote ? 'Twelve Data (Cached)' : 'No Data',
          lastUpdated: cachedQuote?.lastUpdated || cachedStats?.lastUpdated || new Date()
        };
        console.log(`📦 Loaded cached data for ${symbol}`, {
          hasQuote: !!cachedQuote,
          hasStats: !!cachedStats,
          isStale: cachedQuote?._stale || cachedStats?._stale
        });
      }
    });

    if (hasAnyCachedData) {
      setStockData(cachedStockData);
      setIsLoading(false); // Show cached data immediately
      console.log(`📦 Loaded ${Object.keys(cachedStockData).length} symbols from cache`, getCacheStats());
    }

    return hasAnyCachedData;
  };

  // Fetch real stock data using Twelve Data API (via Cloudflare Worker)
  // Uses cache-first strategy for optimal performance
  const fetchRealQuoteData = async (symbol, { skipCache = false } = {}) => {
    try {
      // Check if we have fresh cache and can skip the API call
      if (!skipCache && cachedTwelveDataAPI.hasFreshCache(symbol, 'quote')) {
        const cached = cachedTwelveDataAPI.getCachedQuote(symbol);
        if (cached && cached.price) {
          console.log(`⚡ Using fresh cache for ${symbol} (age: ${Math.round(cached._cacheAge / 1000)}s)`);
          return {
            symbol: cached.symbol,
            price: cached.price,
            change: cached.change,
            changePercent: cached.changePercent,
            high: cached.high,
            low: cached.low,
            open: cached.open,
            previousClose: cached.previousClose,
            volume: cached.volume,
            timestamp: Date.now(),
            isRealData: true,
            source: 'Twelve Data (Cached)',
            _cached: true,
            _stale: false,
            _cacheAge: cached._cacheAge
          };
        }
      }

      // Use cached API which implements stale-while-revalidate
      const quote = await cachedTwelveDataAPI.getQuote(symbol, { skipCache });

      if (quote && quote.price) {
        return {
          symbol: quote.symbol,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          high: quote.high,
          low: quote.low,
          open: quote.open,
          previousClose: quote.previousClose,
          volume: quote.volume,
          timestamp: Date.now(),
          isRealData: true,
          source: quote._cached ? 'Twelve Data (Cached)' : 'Twelve Data',
          _cached: quote._cached || false,
          _stale: quote._stale || false,
          _offline: quote._offline || false,
          _cacheAge: quote._cacheAge
        };
      }
    } catch (error) {
      console.error(`Twelve Data API failed for ${symbol}:`, error);
      throw error; // Propagate error instead of returning mock data
    }

    // No data available
    return null;
  };

  // Fetch fundamentals/statistics data (P/E, EPS, Beta, Market Cap)
  // Uses cache-first strategy - statistics rarely change
  const fetchFundamentals = async (symbol) => {
    // Skip if already fetched this session (with fresh cache)
    if (fundamentalsFetchedRef.current.has(symbol)) {
      // But return cached data if available
      const cached = cachedTwelveDataAPI.getCachedStatistics(symbol);
      if (cached) {
        return {
          marketCap: cached.marketCap,
          pe: cached.pe,
          forwardPe: cached.forwardPe,
          eps: cached.eps,
          beta: cached.beta,
          week52High: cached.week52High,
          week52Low: cached.week52Low,
          dividendYield: cached.dividendYield,
          _cached: true,
          _stale: cached._stale
        };
      }
      return null;
    }

    try {
      // Use cached API for statistics (long TTL since data changes infrequently)
      const stats = await cachedTwelveDataAPI.getStatistics(symbol);

      if (stats) {
        fundamentalsFetchedRef.current.add(symbol);
        return {
          marketCap: stats.marketCap,
          pe: stats.pe,
          forwardPe: stats.forwardPe,
          eps: stats.eps,
          beta: stats.beta,
          week52High: stats.week52High,
          week52Low: stats.week52Low,
          dividendYield: stats.dividendYield,
          _cached: stats._cached || false,
          _stale: stats._stale || false
        };
      }
    } catch (error) {
      // Don't fail the whole request if statistics fails
      console.warn(`Statistics fetch failed for ${symbol}:`, error.message);
      // Mark as fetched to avoid repeated failures
      fundamentalsFetchedRef.current.add(symbol);

      // Return cached data on error (offline support)
      const cached = cachedTwelveDataAPI.getCachedStatistics(symbol);
      if (cached) {
        console.log(`📦 Using cached statistics for ${symbol} after error`);
        return {
          marketCap: cached.marketCap,
          pe: cached.pe,
          forwardPe: cached.forwardPe,
          eps: cached.eps,
          beta: cached.beta,
          week52High: cached.week52High,
          week52Low: cached.week52Low,
          dividendYield: cached.dividendYield,
          _cached: true,
          _stale: true,
          _offline: true
        };
      }
    }

    return null;
  };

  // Smart data fetching strategy
  const fetchStockData = async (symbol, fetchFundamentalsData = false, forceRefresh = false) => {
    pendingFetchesRef.current++;

    try {
      // Get existing data
      const existing = stockData[symbol] || {};

      // Fetch quote (respects cache unless forceRefresh)
      const quote = await fetchRealQuoteData(symbol, { skipCache: forceRefresh });

      // Fetch fundamentals on first load (or if requested)
      let fundamentals = null;
      if (fetchFundamentalsData && !fundamentalsFetchedRef.current.has(symbol)) {
        fundamentals = await fetchFundamentals(symbol);
      }

      // Use existing fundamentals if we have them
      const existingFundamentals = existing.pe ? {
        marketCap: existing.marketCap,
        pe: existing.pe,
        forwardPe: existing.forwardPe,
        eps: existing.eps,
        beta: existing.beta,
        week52High: existing.week52High,
        week52Low: existing.week52Low,
        dividendYield: existing.dividendYield
      } : {};

      // Combine all data with fallbacks
      const combinedData = {
        // Keep existing data as base
        ...existing,

        // Add quote data (always available)
        ...(quote || {}),

        // Add fundamentals (from existing or newly fetched)
        ...existingFundamentals,
        ...(fundamentals || {}),

        // Ensure we have basic info
        symbol: symbol,
        lastUpdated: new Date(),
        isLoading: false,
        hasQuoteData: !!quote,
        hasFundamentalsData: !!(fundamentals?.pe || existingFundamentals.pe),

        // Add data source indicators
        isRealData: quote?.isRealData || false,
        dataSource: quote?.source || 'No Data',

        // Add cache metadata
        _cached: quote?._cached || false,
        _stale: quote?._stale || false,
        _offline: quote?._offline || false,
        _cacheAge: quote?._cacheAge,
        usingCachedData: quote?._cached || quote?._stale || quote?._offline || false
      };

      setStockData(prev => ({
        ...prev,
        [symbol]: combinedData
      }));

      setLastUpdated(new Date());
      setError(null);

    } catch (error) {
      console.error(`❌ Error fetching ${symbol}:`, error);

      // Check if this is a TD rate limit exhaustion error
      const errMsg = error.message || '';
      const isTDExhausted = errMsg.startsWith('TD_EXHAUSTED:');

      if (isTDExhausted) {
        // Keep showing existing cached data, just mark as cached
        const existing = stockData[symbol];
        if (existing && existing.price) {
          console.warn(`⏸️ Using cached data for ${symbol} due to rate limit`);
          setStockData(prev => ({
            ...prev,
            [symbol]: {
              ...existing,
              isLoading: false,
              usingCachedData: true,
              rateLimitMessage: errMsg.replace('TD_EXHAUSTED:', ''),
              lastUpdated: existing.lastUpdated || new Date()
            }
          }));
          return; // Don't set global error
        }
      }

      // For other errors, set error state
      setError(error.message);

      // Set error state for this symbol
      setStockData(prev => ({
        ...prev,
        [symbol]: {
          ...prev[symbol],
          symbol: symbol,
          name: `${symbol} Inc.`,
          isLoading: false,
          hasError: true,
          error: error.message,
          lastUpdated: new Date()
        }
      }));
    } finally {
      pendingFetchesRef.current--;

      // Only clear loading state when all initial fetches are complete
      if (pendingFetchesRef.current === 0 && !initialLoadCompleteRef.current) {
        initialLoadCompleteRef.current = true;
        setIsLoading(false);
      }
    }
  };

  // Set up polling for each symbol - ONLY during market hours
  useEffect(() => {
    if (!symbols || symbols.length === 0) return;

    // Reset state for new symbol list
    initialLoadCompleteRef.current = false;
    pendingFetchesRef.current = 0;

    // Clear existing intervals
    Object.values(intervalsRef.current).forEach(clearInterval);
    intervalsRef.current = {};

    // PHASE 1: Load cached data instantly (before any API calls)
    const hasCachedData = loadCachedData(symbols);
    if (!hasCachedData) {
      setIsLoading(true); // Only show loading if no cache
    }

    // Check market status every minute
    const startPolling = (isInitialLoad = false) => {
      const marketOpen = checkMarketHours();

      if (marketOpen) {
        // Market is OPEN - start polling stocks
        symbols.forEach((symbol, index) => {
          // Stagger initial requests to avoid rate limiting (2 second stagger)
          setTimeout(() => {
            // Initial fetch with fundamentals
            fetchStockData(symbol, isInitialLoad);

            // Set up polling interval: 4 minutes = 240,000ms
            // This gives us ~100 calls per symbol per day (600 total for 6 symbols)
            const interval = setInterval(() => {
              if (checkMarketHours()) {
                fetchStockData(symbol, false); // No fundamentals on subsequent fetches
              }
            }, 240000); // 4 minutes

            intervalsRef.current[symbol] = interval;
          }, index * 2000); // 2 second stagger between symbols
        });
      } else {
        // Market is CLOSED - fetch once to show last prices, then stop
        console.log('⏸️ Market closed - fetching last prices only');
        symbols.forEach((symbol, index) => {
          setTimeout(() => {
            fetchStockData(symbol, isInitialLoad);
          }, index * 2000);
        });
      }
    };

    // Start polling immediately with initial load flag
    startPolling(true);

    // Setup market check with dynamic interval
    const setupMarketCheck = () => {
      const currentlyOpen = checkMarketHours();

      // When market is open: check every minute to detect close
      // When market is closed: check every 30 minutes to detect open
      const checkInterval = currentlyOpen ? 60000 : 1800000; // 1min or 30min

      console.log(`⏰ Next market check in ${currentlyOpen ? '1 minute' : '30 minutes'}`);

      marketCheckInterval.current = setTimeout(() => {
        const wasOpen = isMarketOpen;
        const nowOpen = checkMarketHours();

        // Market just opened - restart polling
        if (!wasOpen && nowOpen) {
          console.log('🔔 Market just opened - starting live polling');
          startPolling(false);
        }
        // Market just closed - stop polling
        else if (wasOpen && !nowOpen) {
          console.log('🔕 Market just closed - stopping live polling');
          Object.values(intervalsRef.current).forEach(clearInterval);
          intervalsRef.current = {};
        }

        // Schedule next check
        setupMarketCheck();
      }, checkInterval);
    };

    // Start market checking
    setupMarketCheck();

    // Note: isLoading is now set to false in fetchStockData when all fetches complete

    // Cleanup
    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
      if (marketCheckInterval.current) clearTimeout(marketCheckInterval.current);
      intervalsRef.current = {};
    };
  }, [symbols]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
    };
  }, []);

  return {
    stockData,
    isLoading,
    lastUpdated,
    error,
    isMarketOpen,
    refreshSymbol: (symbol) => fetchStockData(symbol),
    refreshAll: () => symbols?.forEach(symbol => fetchStockData(symbol)),
    // Force refresh bypasses cache completely
    forceRefreshSymbol: (symbol) => fetchStockData(symbol, true),
    forceRefreshAll: () => symbols?.forEach(symbol => fetchStockData(symbol, true)),
    // Cache statistics for debugging
    getCacheStats
  };
};

// Helper hook for single symbol
export const useStockPolling = (symbol) => {
  const { stockData, isLoading, error, isMarketOpen, refreshSymbol } = useSmartPolling([symbol]);

  return {
    data: stockData[symbol] || null,
    isLoading,
    error,
    isMarketOpen,
    refresh: () => refreshSymbol(symbol)
  };
};

// Format utilities - show "---" for missing data
export const formatters = {
  price: (price) => (price !== null && price !== undefined && !isNaN(price)) ? `$${price.toFixed(2)}` : '---',
  change: (change, changePercent) => {
    if (change === null || change === undefined || isNaN(change)) return '---';
    const sign = change >= 0 ? '+' : '';
    const percent = (changePercent !== null && changePercent !== undefined && !isNaN(changePercent))
      ? ` (${sign}${changePercent.toFixed(2)}%)`
      : '';
    return `${sign}${change.toFixed(2)}${percent}`;
  },
  volume: (volume) => {
    if (!volume || isNaN(volume)) return '---';
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
    return volume.toLocaleString();
  },
  marketCap: (marketCap) => {
    if (!marketCap || isNaN(marketCap)) return '---';
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(1)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(1)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(1)}M`;
    return `$${marketCap.toLocaleString()}`;
  }
};