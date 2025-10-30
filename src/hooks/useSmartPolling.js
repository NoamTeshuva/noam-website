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



  // Smart data fetching strategy
  const fetchStockData = async (symbol) => {
    try {
      
      // Get existing data
      const existing = stockData[symbol] || {};
      
      // Always fetch real-time quote
      const quote = await fetchRealQuoteData(symbol);

      // No mock fundamentals - only use real data if available
      let fundamentals = existing.pe ? existing : {};

      // Combine all data with fallbacks
      const combinedData = {
        // Keep existing data as base
        ...existing,

        // Add quote data (always available)
        ...(quote || {}),

        // Add fundamentals (financial ratios)
        ...(fundamentals || {}),

        // Ensure we have basic info
        symbol: symbol,
        lastUpdated: new Date(),
        isLoading: false,
        hasQuoteData: !!quote,
        hasFundamentalsData: !!fundamentals?.pe,

        // Add data source indicators
        isRealData: quote?.isRealData || false,
        dataSource: quote?.source || 'No Data'
      };

      // Data successfully updated for symbol

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
    }
  };

  // Set up polling for each symbol - ONLY during market hours
  useEffect(() => {
    if (!symbols || symbols.length === 0) return;

    setIsLoading(true);

    // Clear existing intervals
    Object.values(intervalsRef.current).forEach(clearInterval);
    intervalsRef.current = {};

    // Check market status every minute
    const startPolling = () => {
      const marketOpen = checkMarketHours();

      if (marketOpen) {
        // Market is OPEN - start polling stocks
        symbols.forEach((symbol, index) => {
          // Stagger initial requests to avoid rate limiting (2 second stagger)
          setTimeout(() => {
            // Initial fetch
            fetchStockData(symbol);

            // Set up polling interval: 4 minutes = 240,000ms
            // This gives us ~100 calls per symbol per day (600 total for 6 symbols)
            const interval = setInterval(() => {
              if (checkMarketHours()) {
                fetchStockData(symbol);
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
            fetchStockData(symbol);
          }, index * 2000);
        });
      }
    };

    // Start polling immediately
    startPolling();

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
          startPolling();
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

    setIsLoading(false);

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