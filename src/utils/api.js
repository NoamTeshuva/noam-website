// Twelve Data API configuration (via Cloudflare Worker proxy)
const TWELVE_DATA_API_BASE = process.env.REACT_APP_WORKER_URL || '/api';

// Finnhub API configuration
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const FINNHUB_KEY = process.env.REACT_APP_FINNHUB_KEY;

// Twelve Data API functions (via Cloudflare Worker)
export const twelveDataAPI = {
  // Get real-time quote
  getQuote: async (symbol) => {
    try {
      const response = await fetch(
        `${TWELVE_DATA_API_BASE}/quote?symbol=${encodeURIComponent(symbol)}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(`Quote fetch failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.code === 400 || data.status === 'error') {
        throw new Error(data.message || 'Quote data unavailable');
      }

      return {
        symbol: data.symbol,
        price: parseFloat(data.close) || 0,
        change: parseFloat(data.change) || 0,
        changePercent: parseFloat(data.percent_change) || 0,
        volume: parseInt(data.volume) || 0,
        previousClose: parseFloat(data.previous_close) || 0,
        open: parseFloat(data.open) || 0,
        high: parseFloat(data.high) || 0,
        low: parseFloat(data.low) || 0,
        lastUpdated: new Date(),
        isRealData: true,
        source: 'Twelve Data'
      };
    } catch (error) {
      console.error('Twelve Data quote error:', error);
      throw error;
    }
  },

  // Get time series data (for intraday/volume calculations)
  getTimeSeries: async (symbol, interval = '1min', outputsize = '1') => {
    try {
      const response = await fetch(
        `${TWELVE_DATA_API_BASE}/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${outputsize}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(`Time series fetch failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.code === 400 || data.status === 'error') {
        throw new Error(data.message || 'Time series data unavailable');
      }

      const values = data.values || [];
      return values.map(item => ({
        timestamp: new Date(item.datetime),
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
        volume: parseInt(item.volume)
      }));
    } catch (error) {
      console.error('Twelve Data time series error:', error);
      throw error;
    }
  }
};

// Backward compatibility - alias for existing code
export const alphaVantageAPI = twelveDataAPI;

// Finnhub API functions
export const finnhubAPI = {
  // Get peer/competitor companies
  getPeers: async (symbol) => {
    try {
      const response = await fetch(
        `${FINNHUB_BASE_URL}/stock/peers?symbol=${symbol}&token=${FINNHUB_KEY}`
      );
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Return up to 5 peers, excluding the original symbol
      return data.filter(peer => peer !== symbol).slice(0, 5);
    } catch (error) {
      console.error('Finnhub peers error:', error);
      throw error;
    }
  },

  // Get company profile
  getProfile: async (symbol) => {
    try {
      const response = await fetch(
        `${FINNHUB_BASE_URL}/stock/profile2?symbol=${symbol}&token=${FINNHUB_KEY}`
      );
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return {
        symbol: symbol,
        name: data.name,
        country: data.country,
        currency: data.currency,
        exchange: data.exchange,
        ipo: data.ipo,
        marketCapitalization: data.marketCapitalization,
        shareOutstanding: data.shareOutstanding,
        logo: data.logo,
        phone: data.phone,
        weburl: data.weburl,
        industry: data.finnhubIndustry
      };
    } catch (error) {
      console.error('Finnhub profile error:', error);
      throw error;
    }
  }
};

// Utility functions
export const formatMarketCap = (marketCap) => {
  if (marketCap >= 1e12) {
    return `$${(marketCap / 1e12).toFixed(1)}T`;
  } else if (marketCap >= 1e9) {
    return `$${(marketCap / 1e9).toFixed(1)}B`;
  } else if (marketCap >= 1e6) {
    return `$${(marketCap / 1e6).toFixed(1)}M`;
  } else {
    return `$${marketCap.toLocaleString()}`;
  }
};

export const formatVolume = (volume) => {
  if (volume >= 1e9) {
    return `${(volume / 1e9).toFixed(1)}B`;
  } else if (volume >= 1e6) {
    return `${(volume / 1e6).toFixed(1)}M`;
  } else if (volume >= 1e3) {
    return `${(volume / 1e3).toFixed(1)}K`;
  } else {
    return volume.toLocaleString();
  }
};

export const calculateVolumeRatio = (currentVolume, historicalData) => {
  if (!historicalData || historicalData.length === 0) return 1;
  
  // Calculate average volume from historical data
  const avgVolume = historicalData.reduce((sum, data) => sum + data.volume, 0) / historicalData.length;
  
  return avgVolume > 0 ? currentVolume / avgVolume : 1;
};

// Error handling wrapper for API calls
export const withErrorHandling = async (apiCall, fallbackValue = null) => {
  try {
    return await apiCall();
  } catch (error) {
    console.error('API call failed:', error);
    return fallbackValue;
  }
};