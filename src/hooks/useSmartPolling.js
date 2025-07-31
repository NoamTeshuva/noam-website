import { useState, useEffect, useRef } from 'react';

// Free API endpoints
const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';

// API keys (you'll need to add these to your .env file)
const FINNHUB_KEY = process.env.REACT_APP_FINNHUB_KEY || 'demo'; // Finnhub demo key works for testing
const ALPHA_VANTAGE_KEY = process.env.REACT_APP_ALPHA_VANTAGE_KEY || 'demo';

// Debug environment variables
console.log('🔑 API Keys loaded:', {
  finnhub: FINNHUB_KEY ? `${FINNHUB_KEY.slice(0, 8)}...` : 'NOT SET',
  alphaVantage: ALPHA_VANTAGE_KEY ? `${ALPHA_VANTAGE_KEY.slice(0, 8)}...` : 'NOT SET',
  isDemo: FINNHUB_KEY === 'demo'
});

export const useSmartPolling = (symbols) => {
  const [stockData, setStockData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const intervalsRef = useRef({});

  // Fetch real-time quote from Finnhub (free tier: 60 calls/minute)
  const fetchFinnhubQuote = async (symbol) => {
    try {
      const response = await fetch(
        `${FINNHUB_BASE}/quote?symbol=${symbol}&token=${FINNHUB_KEY}`
      );
      const data = await response.json();
      
      if (data.error || !data.c) {
        console.warn(`Finnhub API error for ${symbol}:`, data.error || 'No price data');
        // Return mock data when API fails
        return generateMockQuoteData(symbol);
      }
      
      return {
        symbol,
        price: data.c,           // Current price
        change: data.d,          // Change
        changePercent: data.dp,  // Change percent
        high: data.h,           // High price of the day
        low: data.l,            // Low price of the day
        open: data.o,           // Open price of the day
        previousClose: data.pc,  // Previous close price
        timestamp: Date.now(),
        isRealData: true
      };
    } catch (error) {
      console.error(`Finnhub error for ${symbol}:`, error);
      // Return mock data on fetch failure
      return generateMockQuoteData(symbol);
    }
  };

  // Generate realistic mock data when API fails
  const generateMockQuoteData = (symbol) => {
    const mockPrices = {
      'AAPL': { base: 185.25, volatility: 0.02 },
      'MSFT': { base: 378.85, volatility: 0.015 },
      'GOOGL': { base: 142.75, volatility: 0.025 },
      'TSLA': { base: 208.45, volatility: 0.04 },
      'NVDA': { base: 118.75, volatility: 0.035 },
      'META': { base: 486.35, volatility: 0.025 },
      'AMZN': { base: 145.30, volatility: 0.02 },
      'NFLX': { base: 425.15, volatility: 0.03 }
    };

    const mockData = mockPrices[symbol] || { base: 100, volatility: 0.02 };
    const randomChange = (Math.random() - 0.5) * mockData.volatility * mockData.base;
    const currentPrice = mockData.base + randomChange;
    const changePercent = (randomChange / mockData.base) * 100;

    return {
      symbol,
      price: parseFloat(currentPrice.toFixed(2)),
      change: parseFloat(randomChange.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      high: parseFloat((currentPrice * 1.02).toFixed(2)),
      low: parseFloat((currentPrice * 0.98).toFixed(2)),
      open: parseFloat((mockData.base).toFixed(2)),
      previousClose: parseFloat((mockData.base - randomChange).toFixed(2)),
      timestamp: Date.now(),
      isRealData: false,
      isMockData: true
    };
  };

  // Fetch company profile from Finnhub
  const fetchFinnhubProfile = async (symbol) => {
    try {
      const response = await fetch(
        `${FINNHUB_BASE}/stock/profile2?symbol=${symbol}&token=${FINNHUB_KEY}`
      );
      const data = await response.json();
      
      if (data.error || !data.name) {
        console.warn(`Finnhub profile API error for ${symbol}:`, data.error || 'No profile data');
        return generateMockProfileData(symbol);
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
      return generateMockProfileData(symbol);
    }
  };

  // Generate mock profile data when API fails
  const generateMockProfileData = (symbol) => {
    const mockProfiles = {
      'AAPL': { name: 'Apple Inc.', industry: 'Technology', exchange: 'NASDAQ' },
      'MSFT': { name: 'Microsoft Corporation', industry: 'Technology', exchange: 'NASDAQ' },
      'GOOGL': { name: 'Alphabet Inc.', industry: 'Technology', exchange: 'NASDAQ' },
      'TSLA': { name: 'Tesla Inc.', industry: 'Automotive', exchange: 'NASDAQ' },
      'NVDA': { name: 'NVIDIA Corporation', industry: 'Technology', exchange: 'NASDAQ' },
      'META': { name: 'Meta Platforms Inc.', industry: 'Technology', exchange: 'NASDAQ' },
      'AMZN': { name: 'Amazon.com Inc.', industry: 'E-commerce', exchange: 'NASDAQ' },
      'NFLX': { name: 'Netflix Inc.', industry: 'Entertainment', exchange: 'NASDAQ' }
    };

    const profile = mockProfiles[symbol] || { name: `${symbol} Inc.`, industry: 'Unknown', exchange: 'NYSE' };
    
    return {
      name: profile.name,
      industry: profile.industry,
      marketCap: Math.random() * 2000000 + 100000, // Random market cap
      shareOutstanding: Math.random() * 10000 + 1000,
      country: 'United States',
      currency: 'USD',
      exchange: profile.exchange,
      weburl: `https://example.com/${symbol.toLowerCase()}`,
      logo: '',
      isRealData: false,
      isMockData: true
    };
  };

  // Fetch fundamentals from Alpha Vantage (used sparingly due to 25/day limit)
  const fetchAlphaVantageOverview = async (symbol) => {
    try {
      const response = await fetch(
        `${ALPHA_VANTAGE_BASE}?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`
      );
      const data = await response.json();
      
      if (data['Error Message'] || data['Note']) {
        throw new Error(data['Error Message'] || 'API limit reached');
      }
      
      return {
        pe: parseFloat(data.PERatio) || null,
        eps: parseFloat(data.EPS) || null,
        bookValue: parseFloat(data.BookValue) || null,
        dividendYield: parseFloat(data.DividendYield) || null,
        beta: parseFloat(data.Beta) || null,
        week52High: parseFloat(data['52WeekHigh']) || null,
        week52Low: parseFloat(data['52WeekLow']) || null,
        sector: data.Sector,
        description: data.Description
      };
    } catch (error) {
      console.error(`Alpha Vantage error for ${symbol}:`, error);
      return {};
    }
  };

  // Smart data fetching strategy
  const fetchStockData = async (symbol) => {
    try {
      console.log(`📊 Fetching data for ${symbol}...`);
      
      // Get existing data
      const existing = stockData[symbol] || {};
      
      // Always fetch real-time quote (fast, high limit)
      console.log(`🔄 Fetching quote for ${symbol}...`);
      const quote = await fetchFinnhubQuote(symbol);
      
      // Fetch profile if we don't have it (once per symbol)
      let profile = existing.name ? existing : {};
      if (!existing.name) {
        console.log(`🏢 Fetching profile for ${symbol}...`);
        profile = await fetchFinnhubProfile(symbol);
      }
      
      // Fetch fundamentals only occasionally (low API limit)
      let fundamentals = existing.pe ? existing : {};
      const needsFundamentals = !existing.pe || 
        (Date.now() - (existing.fundamentalsUpdated || 0)) > 24 * 60 * 60 * 1000; // 24 hours
      
      if (needsFundamentals && ALPHA_VANTAGE_KEY !== 'demo') {
        console.log(`📈 Fetching fundamentals for ${symbol}...`);
        fundamentals = await fetchAlphaVantageOverview(symbol);
        fundamentals.fundamentalsUpdated = Date.now();
      }

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
        
        // Ensure we have basic info even if APIs fail
        symbol: symbol,
        name: profile?.name || existing.name || `${symbol} Inc.`,
        lastUpdated: new Date(),
        isLoading: false,
        hasQuoteData: !!quote,
        hasProfileData: !!profile?.name,
        hasFundamentalsData: !!fundamentals?.pe,
        
        // Add mock data indicators
        isMockData: quote?.isMockData || profile?.isMockData || false,
        isRealData: quote?.isRealData && profile?.isRealData,
        dataSource: quote?.isMockData ? 'Mock Data (API Unavailable)' : 'Live Data'
      };

      console.log(`✅ Combined data for ${symbol}:`, combinedData);

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

    console.log('🔄 Setting up polling for symbols:', symbols);
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

// Format utilities
export const formatters = {
  price: (price) => price ? `$${price.toFixed(2)}` : '—',
  change: (change, changePercent) => {
    if (change === null || change === undefined) return '—';
    const sign = change >= 0 ? '+' : '';
    const percent = changePercent ? ` (${sign}${changePercent.toFixed(2)}%)` : '';
    return `${sign}${change.toFixed(2)}${percent}`;
  },
  volume: (volume) => {
    if (!volume) return '—';
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
    return volume.toLocaleString();
  },
  marketCap: (marketCap) => {
    if (!marketCap) return '—';
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(1)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(1)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(1)}M`;
    return `$${marketCap.toLocaleString()}`;
  }
};