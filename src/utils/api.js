import { isTDExhausted, handleTDResponse, getTimeUntilReset } from './rateLimitManager';
import { incrementAPICallCount } from './apiCallCounter';

// Twelve Data API configuration (via Cloudflare Worker proxy)
const TWELVE_DATA_API_BASE = process.env.REACT_APP_WORKER_URL || '/api';

// Twelve Data API functions (via Cloudflare Worker)
export const twelveDataAPI = {
  // Get real-time quote
  getQuote: async (symbol) => {
    // Check if TD API is exhausted
    if (isTDExhausted()) {
      const timeRemaining = getTimeUntilReset();
      console.warn(`⏸️ [TD API] Skipping ${symbol} quote - exhausted (resets in ${timeRemaining})`);
      throw new Error(`TD_EXHAUSTED:Rate limit exhausted. Resets in ${timeRemaining}`);
    }

    try {
      const response = await fetch(
        `${TWELVE_DATA_API_BASE}/quote?symbol=${encodeURIComponent(symbol)}`,
        { cache: "no-store" }
      );

      // Check for rate limit before parsing (429 may not have valid JSON)
      if (response.status === 429) {
        handleTDResponse(response, null);
        const timeRemaining = getTimeUntilReset();
        throw new Error(`TD_EXHAUSTED:Rate limit exhausted. Resets in ${timeRemaining}`);
      }

      // Increment API call counter (only for successful requests)
      if (response.ok) {
        incrementAPICallCount(`quote:${symbol}`);
      }

      if (!response.ok) {
        throw new Error(`Quote fetch failed: ${response.status}`);
      }

      const data = await response.json();

      // Check for rate limit error in response body
      if (handleTDResponse(response, data)) {
        const timeRemaining = getTimeUntilReset();
        throw new Error(`TD_EXHAUSTED:Rate limit exhausted. Resets in ${timeRemaining}`);
      }

      if (data.code === 400 || data.status === 'error') {
        throw new Error(data.message || 'Quote data unavailable');
      }

      const parsedData = {
        symbol: data.symbol,
        price: parseFloat(data.close) || 0,
        change: parseFloat(data.change) || 0,
        changePercent: parseFloat(data.percent_change) || 0,
        volume: parseInt(data.volume) || 0,
        averageVolume: parseInt(data.average_volume) || 0,
        previousClose: parseFloat(data.previous_close) || 0,
        open: parseFloat(data.open) || 0,
        high: parseFloat(data.high) || 0,
        low: parseFloat(data.low) || 0,
        lastUpdated: new Date(),
        isRealData: true,
        source: 'Twelve Data'
      };

      console.log(`📊 ${data.symbol} volume data:`, {
        raw_volume: data.volume,
        parsed_volume: parsedData.volume,
        raw_avg_volume: data.average_volume,
        parsed_avg_volume: parsedData.averageVolume
      });

      return parsedData;
    } catch (error) {
      console.error('Twelve Data quote error:', error);
      throw error;
    }
  },

  // Get statistics/fundamentals data (P/E, EPS, Beta, Market Cap)
  getStatistics: async (symbol) => {
    // Check if TD API is exhausted
    if (isTDExhausted()) {
      const timeRemaining = getTimeUntilReset();
      console.warn(`⏸️ [TD API] Skipping ${symbol} statistics - exhausted (resets in ${timeRemaining})`);
      throw new Error(`TD_EXHAUSTED:Rate limit exhausted. Resets in ${timeRemaining}`);
    }

    try {
      const response = await fetch(
        `${TWELVE_DATA_API_BASE}/statistics?symbol=${encodeURIComponent(symbol)}`,
        { cache: "no-store" }
      );

      // Check for rate limit before parsing (429 may not have valid JSON)
      if (response.status === 429) {
        handleTDResponse(response, null);
        const timeRemaining = getTimeUntilReset();
        throw new Error(`TD_EXHAUSTED:Rate limit exhausted. Resets in ${timeRemaining}`);
      }

      // Increment API call counter (only for successful requests)
      if (response.ok) {
        incrementAPICallCount(`statistics:${symbol}`);
      }

      if (!response.ok) {
        throw new Error(`Statistics fetch failed: ${response.status}`);
      }

      const data = await response.json();

      // Check for rate limit error in response body
      if (handleTDResponse(response, data)) {
        const timeRemaining = getTimeUntilReset();
        throw new Error(`TD_EXHAUSTED:Rate limit exhausted. Resets in ${timeRemaining}`);
      }

      if (data.code === 400 || data.status === 'error') {
        throw new Error(data.message || 'Statistics data unavailable');
      }

      // Parse statistics data
      const stats = data.statistics || {};
      const valuations = stats.valuations_metrics || {};
      const stock = stats.stock_statistics || {};

      return {
        symbol: data.symbol,
        marketCap: parseFloat(valuations.market_capitalization) || null,
        pe: parseFloat(valuations.trailing_pe) || null,
        forwardPe: parseFloat(valuations.forward_pe) || null,
        eps: parseFloat(stock.diluted_eps_ttm) || null,
        beta: parseFloat(stock.beta) || null,
        week52High: parseFloat(stock['52_week_high']) || null,
        week52Low: parseFloat(stock['52_week_low']) || null,
        dividendYield: parseFloat(stock.dividend_yield) || null,
        isRealData: true,
        source: 'Twelve Data Statistics'
      };
    } catch (error) {
      console.error('Twelve Data statistics error:', error);
      throw error;
    }
  },

  // Get time series data (for intraday/volume calculations)
  getTimeSeries: async (symbol, interval = '1min', outputsize = '1') => {
    // Check if TD API is exhausted
    if (isTDExhausted()) {
      const timeRemaining = getTimeUntilReset();
      console.warn(`⏸️ [TD API] Skipping ${symbol} time series - exhausted (resets in ${timeRemaining})`);
      throw new Error(`TD_EXHAUSTED:Rate limit exhausted. Resets in ${timeRemaining}`);
    }

    try {
      const response = await fetch(
        `${TWELVE_DATA_API_BASE}/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${outputsize}`,
        { cache: "no-store" }
      );

      // Check for rate limit before parsing (429 may not have valid JSON)
      if (response.status === 429) {
        handleTDResponse(response, null);
        const timeRemaining = getTimeUntilReset();
        throw new Error(`TD_EXHAUSTED:Rate limit exhausted. Resets in ${timeRemaining}`);
      }

      // Increment API call counter (only for successful requests)
      if (response.ok) {
        incrementAPICallCount(`time_series:${symbol}`);
      }

      if (!response.ok) {
        throw new Error(`Time series fetch failed: ${response.status}`);
      }

      const data = await response.json();

      // Check for rate limit error in response body
      if (handleTDResponse(response, data)) {
        const timeRemaining = getTimeUntilReset();
        throw new Error(`TD_EXHAUSTED:Rate limit exhausted. Resets in ${timeRemaining}`);
      }

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