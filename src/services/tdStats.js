/**
 * Twelve Data Stats Service
 * Fetches and computes technical indicators using only TD API
 *
 * Rate Limit: 8 req/min (Basic plan after email confirmation)
 * Caching: 60s for quotes, 15min for time series
 */

import { calculateEMA, calculateWilderSmoothing } from '../utils/ema';
import { isTDExhausted, handleTDResponse, getTimeUntilReset } from '../utils/rateLimitManager';

const WORKER_URL = process.env.REACT_APP_WORKER_URL || '/api';

// Cache configuration
const QUOTE_CACHE_TTL = 60000; // 60 seconds
const SERIES_CACHE_TTL = 900000; // 15 minutes
const PERSISTENT_CACHE_TTL = 86400000; // 24 hours for localStorage fallback

// In-memory cache
const quoteCache = new Map();
const seriesCache = new Map();

// Load persistent cache from localStorage on startup
const loadPersistentCache = () => {
  try {
    const stored = localStorage.getItem('tdStatsCache');
    if (stored) {
      const { quotes, series, timestamp } = JSON.parse(stored);
      const age = Date.now() - timestamp;

      // Only load if less than 24 hours old
      if (age < PERSISTENT_CACHE_TTL) {
        Object.entries(quotes || {}).forEach(([key, value]) => {
          quoteCache.set(key, value);
        });
        Object.entries(series || {}).forEach(([key, value]) => {
          seriesCache.set(key, value);
        });
        console.log(`📦 [TDStats] Loaded ${Object.keys(quotes || {}).length} quotes and ${Object.keys(series || {}).length} series from persistent cache`);
      } else {
        localStorage.removeItem('tdStatsCache');
      }
    }
  } catch (error) {
    console.warn('[TDStats] Failed to load persistent cache:', error);
  }
};

// Save cache to localStorage
const savePersistentCache = () => {
  try {
    const quotes = {};
    const series = {};

    quoteCache.forEach((value, key) => {
      quotes[key] = value;
    });

    seriesCache.forEach((value, key) => {
      series[key] = value;
    });

    localStorage.setItem('tdStatsCache', JSON.stringify({
      quotes,
      series,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.warn('[TDStats] Failed to save persistent cache:', error);
  }
};

// Load cache on module initialization
loadPersistentCache();

/**
 * Fetch quote data from Twelve Data
 * Returns: close, open, high, low, volume, previous_close, percent_change, average_volume, fifty_two_week
 */
export const fetchTDQuote = async (symbol) => {
  const cacheKey = symbol.toUpperCase();
  const cached = quoteCache.get(cacheKey);

  // If exhausted, return cached data if available
  if (isTDExhausted()) {
    if (cached) {
      const timeRemaining = getTimeUntilReset();
      console.warn(`⏸️ [TDStats] Using cached quote for ${symbol} - TD exhausted (resets in ${timeRemaining})`);
      return cached.data;
    }
    const timeRemaining = getTimeUntilReset();
    throw new Error(`TD_EXHAUSTED:No cached data available. Rate limit resets in ${timeRemaining}`);
  }

  if (cached && (Date.now() - cached.timestamp) < QUOTE_CACHE_TTL) {
    console.log(`📋 [TDStats] Quote cache hit for ${symbol}`);
    return cached.data;
  }

  try {
    console.log(`📊 [TDStats] Fetching quote for ${symbol}...`);
    const response = await fetch(`${WORKER_URL}/quote?symbol=${encodeURIComponent(symbol)}`);

    if (!response.ok) {
      throw new Error(`Quote fetch failed: ${response.status}`);
    }

    const data = await response.json();

    // Check for rate limit error
    if (handleTDResponse(response, data)) {
      // Return cached data if available
      if (cached) {
        const timeRemaining = getTimeUntilReset();
        console.warn(`⏸️ [TDStats] Rate limit hit, using cached quote for ${symbol} (resets in ${timeRemaining})`);
        return cached.data;
      }
      const timeRemaining = getTimeUntilReset();
      throw new Error(`TD_EXHAUSTED:No cached data available. Rate limit resets in ${timeRemaining}`);
    }

    if (data.code === 400 || data.status === 'error') {
      throw new Error(data.message || 'Quote data unavailable');
    }

    // Parse TD quote payload
    const quote = {
      symbol: data.symbol,
      close: parseFloat(data.close) || 0,
      open: parseFloat(data.open) || 0,
      high: parseFloat(data.high) || 0,
      low: parseFloat(data.low) || 0,
      volume: parseInt(data.volume) || 0,
      previousClose: parseFloat(data.previous_close) || null,
      percentChange: parseFloat(data.percent_change) || null,
      averageVolume: parseInt(data.average_volume) || null,
      fiftyTwoWeek: data.fifty_two_week ? {
        low: parseFloat(data.fifty_two_week.low) || null,
        high: parseFloat(data.fifty_two_week.high) || null,
        range: data.fifty_two_week.range || null
      } : null,
      timestamp: Date.now()
    };

    // Cache the result
    quoteCache.set(cacheKey, { data: quote, timestamp: Date.now() });
    savePersistentCache(); // Save to localStorage

    console.log(`✅ [TDStats] Got quote for ${symbol}: $${quote.close}`);
    return quote;

  } catch (error) {
    console.error(`❌ [TDStats] Error fetching quote for ${symbol}:`, error);
    throw error;
  }
};

/**
 * Fetch time series data from Twelve Data
 * Returns array of OHLCV bars chronologically
 */
export const fetchTDSeries = async (symbol, interval = '1day', outputsize = 200) => {
  const cacheKey = `${symbol.toUpperCase()}_${interval}_${outputsize}`;
  const cached = seriesCache.get(cacheKey);

  // If exhausted, return cached data if available
  if (isTDExhausted()) {
    if (cached) {
      const timeRemaining = getTimeUntilReset();
      console.warn(`⏸️ [TDStats] Using cached series for ${symbol} - TD exhausted (resets in ${timeRemaining})`);
      return cached.data;
    }
    const timeRemaining = getTimeUntilReset();
    throw new Error(`TD_EXHAUSTED:No cached data available. Rate limit resets in ${timeRemaining}`);
  }

  if (cached && (Date.now() - cached.timestamp) < SERIES_CACHE_TTL) {
    console.log(`📋 [TDStats] Series cache hit for ${symbol}`);
    return cached.data;
  }

  try {
    console.log(`📈 [TDStats] Fetching time series for ${symbol} (${interval}, ${outputsize} bars)...`);
    const response = await fetch(
      `${WORKER_URL}/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${outputsize}`
    );

    if (!response.ok) {
      throw new Error(`Time series fetch failed: ${response.status}`);
    }

    const data = await response.json();

    // Check for rate limit error
    if (handleTDResponse(response, data)) {
      // Return cached data if available
      if (cached) {
        const timeRemaining = getTimeUntilReset();
        console.warn(`⏸️ [TDStats] Rate limit hit, using cached series for ${symbol} (resets in ${timeRemaining})`);
        return cached.data;
      }
      const timeRemaining = getTimeUntilReset();
      throw new Error(`TD_EXHAUSTED:No cached data available. Rate limit resets in ${timeRemaining}`);
    }

    if (data.code === 400 || data.status === 'error') {
      throw new Error(data.message || 'Time series data unavailable');
    }

    if (!data.values || data.values.length === 0) {
      throw new Error('No time series data available');
    }

    // Parse bars (TD returns newest first, we want oldest first for calculations)
    const bars = data.values.reverse().map(item => ({
      datetime: item.datetime,
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
      volume: parseInt(item.volume) || 0
    }));

    // Cache the result
    seriesCache.set(cacheKey, { data: bars, timestamp: Date.now() });
    savePersistentCache(); // Save to localStorage

    console.log(`✅ [TDStats] Got ${bars.length} bars for ${symbol}`);
    return bars;

  } catch (error) {
    console.error(`❌ [TDStats] Error fetching series for ${symbol}:`, error);
    throw error;
  }
};

/**
 * Calculate RSI (Relative Strength Index) - 14 period using Wilder's smoothing
 */
export const calculateRSI = (bars, period = 14) => {
  if (bars.length < period + 1) {
    return { rsi: null, lowConfidence: true };
  }

  // Calculate price changes
  const changes = [];
  for (let i = 1; i < bars.length; i++) {
    changes.push(bars[i].close - bars[i - 1].close);
  }

  // Separate gains and losses
  const gains = changes.map(c => c > 0 ? c : 0);
  const losses = changes.map(c => c < 0 ? -c : 0);

  // Apply Wilder's smoothing
  const avgGains = calculateWilderSmoothing(gains, period);
  const avgLosses = calculateWilderSmoothing(losses, period);

  // Calculate RSI
  if (avgLosses.length === 0 || avgGains.length === 0) {
    return { rsi: null, lowConfidence: true };
  }

  const lastAvgGain = avgGains[avgGains.length - 1];
  const lastAvgLoss = avgLosses[avgLosses.length - 1];

  if (lastAvgLoss === 0) {
    return { rsi: 100, lowConfidence: false };
  }

  const rs = lastAvgGain / lastAvgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return {
    rsi: rsi,
    lowConfidence: bars.length < 30
  };
};

/**
 * Calculate MACD (Moving Average Convergence Divergence) - 12, 26, 9 periods
 */
export const calculateMACD = (bars, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
  if (bars.length < slowPeriod + signalPeriod) {
    return { macd: null, signal: null, histogram: null, lowConfidence: true };
  }

  const closes = bars.map(b => b.close);

  // Calculate fast and slow EMAs
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  // Calculate MACD line
  const macdLine = [];
  for (let i = slowPeriod - 1; i < closes.length; i++) {
    if (fastEMA[i] && slowEMA[i]) {
      macdLine.push(fastEMA[i] - slowEMA[i]);
    }
  }

  if (macdLine.length === 0) {
    return { macd: null, signal: null, histogram: null, lowConfidence: true };
  }

  // Calculate signal line (EMA of MACD)
  const signalLine = calculateEMA(macdLine, signalPeriod);

  // Get latest values
  const latestMACD = macdLine[macdLine.length - 1];
  const latestSignal = signalLine[signalLine.length - 1];
  const histogram = latestSignal ? latestMACD - latestSignal : null;

  return {
    macd: latestMACD,
    signal: latestSignal,
    histogram: histogram,
    lowConfidence: bars.length < 50
  };
};

/**
 * Calculate ATR (Average True Range) - 14 period using Wilder's smoothing
 */
export const calculateATR = (bars, period = 14) => {
  if (bars.length < period + 1) {
    return { atr: null, lowConfidence: true };
  }

  // Calculate True Range for each bar
  const trueRanges = [];
  for (let i = 1; i < bars.length; i++) {
    const high = bars[i].high;
    const low = bars[i].low;
    const prevClose = bars[i - 1].close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );

    trueRanges.push(tr);
  }

  // Apply Wilder's smoothing
  const atrValues = calculateWilderSmoothing(trueRanges, period);

  if (atrValues.length === 0) {
    return { atr: null, lowConfidence: true };
  }

  return {
    atr: atrValues[atrValues.length - 1],
    lowConfidence: bars.length < 30
  };
};

/**
 * Calculate 52-week percentile (where current price sits in 52w range)
 * Returns value between 0 (at low) and 1 (at high)
 */
export const calc52wPercentile = (quote) => {
  if (!quote.fiftyTwoWeek || !quote.fiftyTwoWeek.low || !quote.fiftyTwoWeek.high) {
    return null;
  }

  const { low, high } = quote.fiftyTwoWeek;
  const current = quote.close;

  if (high === low) return 0.5; // Avoid division by zero

  const percentile = (current - low) / (high - low);
  return Math.max(0, Math.min(1, percentile)); // Clamp to [0, 1]
};

/**
 * Compute all indicators from time series bars
 */
export const computeIndicators = (bars) => {
  const rsiResult = calculateRSI(bars, 14);
  const macdResult = calculateMACD(bars, 12, 26, 9);
  const atrResult = calculateATR(bars, 14);

  return {
    rsi14: rsiResult.rsi,
    macd: macdResult.macd,
    macdSignal: macdResult.signal,
    macdHistogram: macdResult.histogram,
    atr14: atrResult.atr,
    lowConfidence: rsiResult.lowConfidence || macdResult.lowConfidence || atrResult.lowConfidence
  };
};

/**
 * Build complete stats object for a symbol
 * Fetches quote + series and computes all metrics
 */
export const buildStats = async (symbol) => {
  try {
    console.log(`🔢 [TDStats] Building stats for ${symbol}...`);

    // Fetch quote and series in parallel (2 TD API calls)
    const [quote, bars] = await Promise.all([
      fetchTDQuote(symbol),
      fetchTDSeries(symbol, '1day', 200)
    ]);

    // Calculate % change
    let percentChange = quote.percentChange;
    if (percentChange === null && quote.previousClose) {
      percentChange = ((quote.close - quote.previousClose) / quote.previousClose) * 100;
    }

    // Calculate RVOL (Relative Volume)
    const rvol = quote.averageVolume ? quote.volume / quote.averageVolume : null;

    // Calculate Dollar Volume
    const dollarVolume = quote.close * quote.volume;

    // Calculate 52-week percentile
    const percentile52w = calc52wPercentile(quote);

    // Compute technical indicators
    const indicators = computeIndicators(bars);

    const stats = {
      symbol: symbol.toUpperCase(),
      price: quote.close,
      percentChange: percentChange,
      volume: quote.volume,
      averageVolume: quote.averageVolume,
      rvol: rvol,
      dollarVolume: dollarVolume,
      fiftyTwoWeek: quote.fiftyTwoWeek,
      percentile52w: percentile52w,
      rsi14: indicators.rsi14,
      macd: indicators.macd,
      macdSignal: indicators.macdSignal,
      macdHistogram: indicators.macdHistogram,
      atr14: indicators.atr14,
      lowConfidence: indicators.lowConfidence,
      timestamp: Date.now()
    };

    console.log(`✅ [TDStats] Stats for ${symbol}:`, {
      rvol: rvol?.toFixed(2),
      rsi14: indicators.rsi14?.toFixed(2),
      macd: indicators.macd?.toFixed(4),
      atr14: indicators.atr14?.toFixed(2),
      pct: percentChange?.toFixed(2),
      pct52w: (percentile52w * 100)?.toFixed(1)
    });

    return stats;

  } catch (error) {
    console.error(`❌ [TDStats] Error building stats for ${symbol}:`, error);
    throw error;
  }
};

/**
 * Clear cache for a symbol or all symbols
 */
export const clearStatsCache = (symbol = null) => {
  if (symbol) {
    const upperSymbol = symbol.toUpperCase();
    quoteCache.delete(upperSymbol);
    // Clear all series cache entries for this symbol
    for (const key of seriesCache.keys()) {
      if (key.startsWith(upperSymbol + '_')) {
        seriesCache.delete(key);
      }
    }
    console.log(`🗑️ [TDStats] Cleared cache for ${symbol}`);
  } else {
    quoteCache.clear();
    seriesCache.clear();
    console.log(`🗑️ [TDStats] Cleared all stats cache`);
  }
};
