import { useState, useEffect, useRef } from 'react';
import { twelveDataAPI } from '../utils/api';

// Free API endpoints
const FINNHUB_BASE = 'https://finnhub.io/api/v1';

// API keys from environment variables
const FINNHUB_KEY = process.env.REACT_APP_FINNHUB_KEY;

export const useSmartPolling = (symbols) => {
  const [stockData, setStockData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const intervalsRef = useRef({});

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


  // Fetch company profile from Finnhub
  const fetchFinnhubProfile = async (symbol) => {
    if (!FINNHUB_KEY || FINNHUB_KEY === 'demo') {
      console.warn(`No Finnhub API key configured for ${symbol}`);
      return {};
    }

    try {
      const response = await fetch(
        `${FINNHUB_BASE}/stock/profile2?symbol=${symbol}&token=${FINNHUB_KEY}`
      );
      const data = await response.json();

      if (data.error || !data.name) {
        console.warn(`Finnhub profile API error for ${symbol}:`, data.error || 'No profile data');
        return {};
      }

      return {
        name: data.name,
        industry: data.finnhubIndustry,
        marketCap: data.marketCapitalization,
        shareOutstanding: data.shareOutstanding,
        country: data.country,
        currency: data.currency,
        exchange: data.exchange,
        weburl: data.weburl,
        logo: data.logo,
        isRealData: true
      };
    } catch (error) {
      console.error(`Finnhub profile error for ${symbol}:`, error);
      return {};
    }
  };



  // Smart data fetching strategy
  const fetchStockData = async (symbol) => {
    try {
      
      // Get existing data
      const existing = stockData[symbol] || {};
      
      // Always fetch real-time quote from multiple sources
      const quote = await fetchRealQuoteData(symbol);
      
      // Fetch profile if we don't have it (once per symbol)
      let profile = existing.name ? existing : {};
      if (!existing.name) {
        try {
          profile = await fetchFinnhubProfile(symbol);
        } catch (error) {
          console.error(`Profile fetch failed for ${symbol}:`, error);
          profile = {};
        }
      }

      // No mock fundamentals - only use real data if available
      let fundamentals = existing.pe ? existing : {};

      // Combine all data with fallbacks
      const combinedData = {
        // Keep existing data as base
        ...existing,
        
        // Add quote data (always available)
        ...(quote || {}),
        
        // Add profile data (company info)
        ...(profile || {}),
        
        // Add fundamentals (financial ratios)
        ...(fundamentals || {}),
        
        // Ensure we have basic info
        symbol: symbol,
        name: profile?.name || existing.name || null,
        lastUpdated: new Date(),
        isLoading: false,
        hasQuoteData: !!quote,
        hasProfileData: !!profile?.name,
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

  // Set up polling for each symbol
  useEffect(() => {
    if (!symbols || symbols.length === 0) return;

    // Setting up polling for symbols
    setIsLoading(true);

    // Clear existing intervals
    Object.values(intervalsRef.current).forEach(clearInterval);
    intervalsRef.current = {};

    // Start polling each symbol
    symbols.forEach((symbol, index) => {
      // Stagger initial requests to avoid rate limiting
      setTimeout(() => {
        // Initial fetch
        fetchStockData(symbol);
        
        // Set up polling interval (15 seconds for good responsiveness)
        const interval = setInterval(() => {
          fetchStockData(symbol);
        }, 15000);
        
        intervalsRef.current[symbol] = interval;
      }, index * 2000); // 2 second stagger between symbols
    });

    setIsLoading(false);

    // Cleanup
    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
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
    refreshSymbol: (symbol) => fetchStockData(symbol),
    refreshAll: () => symbols?.forEach(fetchStockData)
  };
};

// Helper hook for single symbol
export const useStockPolling = (symbol) => {
  const { stockData, isLoading, error, refreshSymbol } = useSmartPolling([symbol]);
  
  return {
    data: stockData[symbol] || null,
    isLoading,
    error,
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