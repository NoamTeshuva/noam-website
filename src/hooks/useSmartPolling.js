import { useState, useEffect, useRef } from 'react';
import { twelveDataAPI } from '../utils/api';

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
    const now = new Date();

    // Convert to Eastern Time
    const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = etTime.getDay(); // 0 = Sunday, 6 = Saturday
    const hours = etTime.getHours();
    const minutes = etTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    // Market hours: Monday-Friday, 9:30 AM - 4:00 PM ET
    const isWeekday = day >= 1 && day <= 5;
    const marketOpen = 9 * 60 + 30; // 9:30 AM in minutes
    const marketClose = 16 * 60; // 4:00 PM in minutes
    const isDuringMarketHours = totalMinutes >= marketOpen && totalMinutes < marketClose;

    const marketIsOpen = isWeekday && isDuringMarketHours;
    setIsMarketOpen(marketIsOpen);

    console.log(`🕐 Market status: ${marketIsOpen ? 'OPEN' : 'CLOSED'} (ET: ${etTime.toLocaleTimeString()})`);

    return marketIsOpen;
  };

  // Fetch real stock data using Twelve Data API (via Cloudflare Worker)
  const fetchRealQuoteData = async (symbol) => {
    try {
      const quote = await twelveDataAPI.getQuote(symbol);

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
          source: 'Twelve Data'
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
  const fetchFundamentals = async (symbol) => {
    // Skip if already fetched this session
    if (fundamentalsFetchedRef.current.has(symbol)) {
      return null;
    }

    try {
      const stats = await twelveDataAPI.getStatistics(symbol);

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
          dividendYield: stats.dividendYield
        };
      }
    } catch (error) {
      // Don't fail the whole request if statistics fails
      console.warn(`Statistics fetch failed for ${symbol}:`, error.message);
      // Mark as fetched to avoid repeated failures
      fundamentalsFetchedRef.current.add(symbol);
    }

    return null;
  };

  // Smart data fetching strategy
  const fetchStockData = async (symbol, fetchFundamentalsData = false) => {
    pendingFetchesRef.current++;

    try {
      // Get existing data
      const existing = stockData[symbol] || {};

      // Always fetch real-time quote
      const quote = await fetchRealQuoteData(symbol);

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
        dataSource: quote?.source || 'No Data'
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
    setIsLoading(true);
    initialLoadCompleteRef.current = false;
    pendingFetchesRef.current = 0;

    // Clear existing intervals
    Object.values(intervalsRef.current).forEach(clearInterval);
    intervalsRef.current = {};

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
    refreshAll: () => symbols?.forEach(fetchStockData)
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