/**
 * Twelve Data Stats Service
 * Fetches and computes technical indicators using only TD API
 *
 * Rate Limit: 8 req/min (Basic plan after email confirmation)
 * Caching: 60s for quotes, 15min for time series
 */

import { calculateEMA, calculateWilderSmoothing, calculateSMA } from '../utils/ema';
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
        console.log(
          `📦 [TDStats] Loaded ${Object.keys(quotes || {}).length} quotes and ${Object.keys(series || {}).length} series from persistent cache`
        );
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

    localStorage.setItem(
      'tdStatsCache',
      JSON.stringify({
        quotes,
        series,
        timestamp: Date.now(),
      })
    );
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
      console.warn(
        `⏸️ [TDStats] Using cached quote for ${symbol} - TD exhausted (resets in ${timeRemaining})`
      );
      return cached.data;
    }
    const timeRemaining = getTimeUntilReset();
    throw new Error(`TD_EXHAUSTED:No cached data available. Rate limit resets in ${timeRemaining}`);
  }

  if (cached && Date.now() - cached.timestamp < QUOTE_CACHE_TTL) {
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
        console.warn(
          `⏸️ [TDStats] Rate limit hit, using cached quote for ${symbol} (resets in ${timeRemaining})`
        );
        return cached.data;
      }
      const timeRemaining = getTimeUntilReset();
      throw new Error(
        `TD_EXHAUSTED:No cached data available. Rate limit resets in ${timeRemaining}`
      );
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
      fiftyTwoWeek: data.fifty_two_week
        ? {
            low: parseFloat(data.fifty_two_week.low) || null,
            high: parseFloat(data.fifty_two_week.high) || null,
            range: data.fifty_two_week.range || null,
          }
        : null,
      timestamp: Date.now(),
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
      console.warn(
        `⏸️ [TDStats] Using cached series for ${symbol} - TD exhausted (resets in ${timeRemaining})`
      );
      return cached.data;
    }
    const timeRemaining = getTimeUntilReset();
    throw new Error(`TD_EXHAUSTED:No cached data available. Rate limit resets in ${timeRemaining}`);
  }

  if (cached && Date.now() - cached.timestamp < SERIES_CACHE_TTL) {
    console.log(`📋 [TDStats] Series cache hit for ${symbol}`);
    return cached.data;
  }

  try {
    console.log(
      `📈 [TDStats] Fetching time series for ${symbol} (${interval}, ${outputsize} bars)...`
    );
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
        console.warn(
          `⏸️ [TDStats] Rate limit hit, using cached series for ${symbol} (resets in ${timeRemaining})`
        );
        return cached.data;
      }
      const timeRemaining = getTimeUntilReset();
      throw new Error(
        `TD_EXHAUSTED:No cached data available. Rate limit resets in ${timeRemaining}`
      );
    }

    if (data.code === 400 || data.status === 'error') {
      throw new Error(data.message || 'Time series data unavailable');
    }

    if (!data.values || data.values.length === 0) {
      throw new Error('No time series data available');
    }

    // Parse bars (TD returns newest first, we want oldest first for calculations)
    const bars = data.values.reverse().map((item) => ({
      datetime: item.datetime,
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: parseFloat(item.close),
      volume: parseInt(item.volume) || 0,
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
  const gains = changes.map((c) => (c > 0 ? c : 0));
  const losses = changes.map((c) => (c < 0 ? -c : 0));

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
  const rsi = 100 - 100 / (1 + rs);

  return {
    rsi: rsi,
    lowConfidence: bars.length < 30,
  };
};

/**
 * Calculate MACD (Moving Average Convergence Divergence) - 12, 26, 9 periods
 */
export const calculateMACD = (bars, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
  if (bars.length < slowPeriod + signalPeriod) {
    return { macd: null, signal: null, histogram: null, lowConfidence: true };
  }

  const closes = bars.map((b) => b.close);

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
    lowConfidence: bars.length < 50,
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

    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));

    trueRanges.push(tr);
  }

  // Apply Wilder's smoothing
  const atrValues = calculateWilderSmoothing(trueRanges, period);

  if (atrValues.length === 0) {
    return { atr: null, lowConfidence: true };
  }

  return {
    atr: atrValues[atrValues.length - 1],
    lowConfidence: bars.length < 30,
  };
};

/**
 * Calculate Stochastic Oscillator (%K and %D)
 * @param {Array} bars - OHLCV bars
 * @param {number} kPeriod - %K period (default 14)
 * @param {number} dPeriod - %D smoothing period (default 3)
 * @returns {Object} - Stochastic values
 */
export const calculateStochastic = (bars, kPeriod = 14, dPeriod = 3) => {
  if (!bars || bars.length < kPeriod) {
    return { stochK: null, stochD: null, lowConfidence: true };
  }

  const kValues = [];

  // Calculate %K for each bar starting from kPeriod
  for (let i = kPeriod - 1; i < bars.length; i++) {
    // Find highest high and lowest low in the period
    let highestHigh = -Infinity;
    let lowestLow = Infinity;

    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (bars[j].high > highestHigh) highestHigh = bars[j].high;
      if (bars[j].low < lowestLow) lowestLow = bars[j].low;
    }

    // Calculate %K
    const range = highestHigh - lowestLow;
    const k = range !== 0 ? ((bars[i].close - lowestLow) / range) * 100 : 50;
    kValues.push(k);
  }

  if (kValues.length === 0) {
    return { stochK: null, stochD: null, lowConfidence: true };
  }

  // Calculate %D (SMA of %K)
  const dValues = calculateSMA(kValues, dPeriod);

  const stochK = kValues[kValues.length - 1];
  const stochD = dValues.length > 0 ? dValues[dValues.length - 1] : null;

  return {
    stochK,
    stochD,
    lowConfidence: bars.length < kPeriod + dPeriod + 10,
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
 * Calculate Historical Performance Returns
 * @param {Array} bars - OHLCV bars (oldest first)
 * @param {number} currentPrice - Current price
 * @returns {Object} - Returns for various periods
 */
export const calculateReturns = (bars, currentPrice) => {
  if (!bars || bars.length === 0) {
    return {
      return1D: null,
      return5D: null,
      return1M: null,
      return3M: null,
      return6M: null,
      returnYTD: null,
      return1Y: null,
    };
  }

  // Helper to calculate return percentage
  const calcReturn = (oldPrice) => {
    if (!oldPrice || oldPrice === 0) return null;
    return ((currentPrice - oldPrice) / oldPrice) * 100;
  };

  // Helper to get price N bars ago (from end)
  const getPriceNBarsAgo = (n) => {
    const idx = bars.length - 1 - n;
    return idx >= 0 ? bars[idx].close : null;
  };

  // Trading days approximations
  const return1D = calcReturn(getPriceNBarsAgo(1));
  const return5D = calcReturn(getPriceNBarsAgo(5));
  const return1M = calcReturn(getPriceNBarsAgo(21)); // ~1 month
  const return3M = calcReturn(getPriceNBarsAgo(63)); // ~3 months
  const return6M = calcReturn(getPriceNBarsAgo(126)); // ~6 months
  const return1Y = calcReturn(getPriceNBarsAgo(252)); // ~1 year (may be null if < 252 bars)

  // YTD - find first bar of current year
  const currentYear = new Date().getFullYear();
  let returnYTD = null;
  for (let i = 0; i < bars.length; i++) {
    const barDate = new Date(bars[i].datetime);
    if (barDate.getFullYear() === currentYear) {
      returnYTD = calcReturn(bars[i].close);
      break;
    }
  }

  return {
    return1D,
    return5D,
    return1M,
    return3M,
    return6M,
    returnYTD,
    return1Y,
  };
};

/**
 * Calculate Pivot Points and Support/Resistance levels
 * @param {Array} bars - OHLCV bars (oldest first)
 * @param {number} currentPrice - Current price
 * @returns {Object} - Pivot points and S/R levels
 */
export const calculatePivotPoints = (bars, currentPrice) => {
  if (!bars || bars.length < 2) {
    return {
      pivot: null,
      r1: null,
      r2: null,
      s1: null,
      s2: null,
      recentHigh: null,
      recentLow: null,
    };
  }

  // Use previous day's data for classic pivot calculation
  const prevBar = bars[bars.length - 2];
  const high = prevBar.high;
  const low = prevBar.low;
  const close = prevBar.close;

  // Classic Pivot Point formula
  const pivot = (high + low + close) / 3;
  const r1 = 2 * pivot - low;
  const r2 = pivot + (high - low);
  const s1 = 2 * pivot - high;
  const s2 = pivot - (high - low);

  // Find recent swing high/low (last 20 bars)
  const recentBars = bars.slice(-20);
  let recentHigh = -Infinity;
  let recentLow = Infinity;

  for (const bar of recentBars) {
    if (bar.high > recentHigh) recentHigh = bar.high;
    if (bar.low < recentLow) recentLow = bar.low;
  }

  // Determine nearest support/resistance
  const levels = [
    { type: 'R2', value: r2 },
    { type: 'R1', value: r1 },
    { type: 'P', value: pivot },
    { type: 'S1', value: s1 },
    { type: 'S2', value: s2 },
  ];

  // Find nearest resistance (above price) and support (below price)
  let nearestResistance = null;
  let nearestSupport = null;

  for (const level of levels) {
    if (
      level.value > currentPrice &&
      (!nearestResistance || level.value < nearestResistance.value)
    ) {
      nearestResistance = level;
    }
    if (level.value < currentPrice && (!nearestSupport || level.value > nearestSupport.value)) {
      nearestSupport = level;
    }
  }

  return {
    pivot,
    r1,
    r2,
    s1,
    s2,
    recentHigh: recentHigh !== -Infinity ? recentHigh : null,
    recentLow: recentLow !== Infinity ? recentLow : null,
    nearestResistance,
    nearestSupport,
  };
};

/**
 * Calculate Moving Averages (SMA 20, 50, 200) with trend signals
 * @param {Array} bars - OHLCV bars
 * @param {number} currentPrice - Current price for comparison
 * @returns {Object} - Moving average values and signals
 */
export const calculateMovingAverages = (bars, currentPrice) => {
  if (!bars || bars.length === 0) {
    return {
      sma20: null,
      sma50: null,
      sma200: null,
      priceVsSma20: null,
      priceVsSma50: null,
      priceVsSma200: null,
      crossoverSignal: null,
      trend: 'NEUTRAL',
      lowConfidence: true,
    };
  }

  const closes = bars.map((b) => b.close);

  // Calculate SMAs
  const sma20Array = calculateSMA(closes, 20);
  const sma50Array = calculateSMA(closes, 50);
  const sma200Array = calculateSMA(closes, 200);

  // Get latest values
  const sma20 = sma20Array.length > 0 ? sma20Array[sma20Array.length - 1] : null;
  const sma50 = sma50Array.length > 0 ? sma50Array[sma50Array.length - 1] : null;
  const sma200 = sma200Array.length > 0 ? sma200Array[sma200Array.length - 1] : null;

  // Calculate price position relative to MAs (as percentage)
  const priceVsSma20 = sma20 ? ((currentPrice - sma20) / sma20) * 100 : null;
  const priceVsSma50 = sma50 ? ((currentPrice - sma50) / sma50) * 100 : null;
  const priceVsSma200 = sma200 ? ((currentPrice - sma200) / sma200) * 100 : null;

  // Detect Golden Cross / Death Cross
  // Golden Cross: SMA50 crosses above SMA200
  // Death Cross: SMA50 crosses below SMA200
  let crossoverSignal = null;
  if (sma50Array.length >= 2 && sma200Array.length >= 2) {
    const prevSma50 = sma50Array[sma50Array.length - 2];
    const prevSma200 = sma200Array[sma200Array.length - 2];

    // Check for recent crossover (within last bar)
    if (prevSma50 <= prevSma200 && sma50 > sma200) {
      crossoverSignal = 'GOLDEN_CROSS';
    } else if (prevSma50 >= prevSma200 && sma50 < sma200) {
      crossoverSignal = 'DEATH_CROSS';
    }
  }

  // Determine trend based on MA alignment
  let trend = 'NEUTRAL';
  if (sma20 && sma50 && sma200) {
    if (currentPrice > sma20 && sma20 > sma50 && sma50 > sma200) {
      trend = 'STRONG_BULLISH';
    } else if (currentPrice > sma50 && sma50 > sma200) {
      trend = 'BULLISH';
    } else if (currentPrice < sma20 && sma20 < sma50 && sma50 < sma200) {
      trend = 'STRONG_BEARISH';
    } else if (currentPrice < sma50 && sma50 < sma200) {
      trend = 'BEARISH';
    }
  }

  return {
    sma20,
    sma50,
    sma200,
    priceVsSma20,
    priceVsSma50,
    priceVsSma200,
    crossoverSignal,
    trend,
    lowConfidence: bars.length < 200,
  };
};

/**
 * Calculate overall signal/bias based on indicator confluence
 * @param {Object} indicators - All computed indicators
 * @returns {Object} - Signal summary with bias and strength
 */
export const calculateSignalSummary = (indicators) => {
  let bullishSignals = 0;
  let bearishSignals = 0;
  const signals = [];

  // RSI Signal
  if (indicators.rsi14 !== null) {
    if (indicators.rsi14 <= 30) {
      bullishSignals += 1; // Oversold = bullish
      signals.push({ name: 'RSI', signal: 'BULLISH', reason: 'Oversold' });
    } else if (indicators.rsi14 >= 70) {
      bearishSignals += 1; // Overbought = bearish
      signals.push({ name: 'RSI', signal: 'BEARISH', reason: 'Overbought' });
    } else if (indicators.rsi14 > 50) {
      bullishSignals += 0.5;
      signals.push({ name: 'RSI', signal: 'NEUTRAL', reason: 'Above 50' });
    } else {
      bearishSignals += 0.5;
      signals.push({ name: 'RSI', signal: 'NEUTRAL', reason: 'Below 50' });
    }
  }

  // MACD Signal
  if (indicators.macdHistogram !== null) {
    if (indicators.macdHistogram > 0) {
      bullishSignals += 1;
      signals.push({ name: 'MACD', signal: 'BULLISH', reason: 'Positive histogram' });
    } else {
      bearishSignals += 1;
      signals.push({ name: 'MACD', signal: 'BEARISH', reason: 'Negative histogram' });
    }
  }

  // MA Trend Signal
  if (indicators.maTrend) {
    if (indicators.maTrend === 'STRONG_BULLISH') {
      bullishSignals += 2;
      signals.push({ name: 'MA Trend', signal: 'BULLISH', reason: 'Price > all MAs aligned' });
    } else if (indicators.maTrend === 'BULLISH') {
      bullishSignals += 1;
      signals.push({ name: 'MA Trend', signal: 'BULLISH', reason: 'Above key MAs' });
    } else if (indicators.maTrend === 'STRONG_BEARISH') {
      bearishSignals += 2;
      signals.push({ name: 'MA Trend', signal: 'BEARISH', reason: 'Price < all MAs aligned' });
    } else if (indicators.maTrend === 'BEARISH') {
      bearishSignals += 1;
      signals.push({ name: 'MA Trend', signal: 'BEARISH', reason: 'Below key MAs' });
    }
  }

  // Price vs SMA200 (long-term trend)
  if (indicators.priceVsSma200 !== null) {
    if (indicators.priceVsSma200 > 0) {
      bullishSignals += 1;
      signals.push({ name: 'SMA200', signal: 'BULLISH', reason: 'Above 200-day MA' });
    } else {
      bearishSignals += 1;
      signals.push({ name: 'SMA200', signal: 'BEARISH', reason: 'Below 200-day MA' });
    }
  }

  // Determine overall bias
  const totalSignals = bullishSignals + bearishSignals;
  let bias = 'NEUTRAL';
  let strength = 0;

  if (totalSignals > 0) {
    const bullishRatio = bullishSignals / totalSignals;
    if (bullishRatio >= 0.7) {
      bias = 'BULLISH';
      strength = Math.min(100, Math.round(bullishRatio * 100));
    } else if (bullishRatio <= 0.3) {
      bias = 'BEARISH';
      strength = Math.min(100, Math.round((1 - bullishRatio) * 100));
    } else {
      bias = 'NEUTRAL';
      strength = 50;
    }
  }

  return {
    bias,
    strength,
    bullishCount: bullishSignals,
    bearishCount: bearishSignals,
    signals,
  };
};

/**
 * Compute all indicators from time series bars
 */
export const computeIndicators = (bars, currentPrice) => {
  const rsiResult = calculateRSI(bars, 14);
  const macdResult = calculateMACD(bars, 12, 26, 9);
  const atrResult = calculateATR(bars, 14);
  const stochResult = calculateStochastic(bars, 14, 3);
  const maResult = calculateMovingAverages(bars, currentPrice);
  const returns = calculateReturns(bars, currentPrice);
  const pivots = calculatePivotPoints(bars, currentPrice);

  // Build base indicators object
  const indicators = {
    rsi14: rsiResult.rsi,
    macd: macdResult.macd,
    macdSignal: macdResult.signal,
    macdHistogram: macdResult.histogram,
    atr14: atrResult.atr,
    // Stochastic
    stochK: stochResult.stochK,
    stochD: stochResult.stochD,
    // Moving Averages
    sma20: maResult.sma20,
    sma50: maResult.sma50,
    sma200: maResult.sma200,
    priceVsSma20: maResult.priceVsSma20,
    priceVsSma50: maResult.priceVsSma50,
    priceVsSma200: maResult.priceVsSma200,
    crossoverSignal: maResult.crossoverSignal,
    maTrend: maResult.trend,
    // Historical Returns
    return1D: returns.return1D,
    return5D: returns.return5D,
    return1M: returns.return1M,
    return3M: returns.return3M,
    return6M: returns.return6M,
    returnYTD: returns.returnYTD,
    return1Y: returns.return1Y,
    // Pivot Points & S/R
    pivotPoints: pivots,
    lowConfidence:
      rsiResult.lowConfidence ||
      macdResult.lowConfidence ||
      atrResult.lowConfidence ||
      stochResult.lowConfidence ||
      maResult.lowConfidence,
  };

  // Calculate signal summary based on all indicators
  const signalSummary = calculateSignalSummary(indicators);

  return {
    ...indicators,
    signalSummary,
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
      fetchTDSeries(symbol, '1day', 200),
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

    // Compute technical indicators (pass current price for MA calculations)
    const indicators = computeIndicators(bars, quote.close);

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
      // Stochastic
      stochK: indicators.stochK,
      stochD: indicators.stochD,
      // Moving Averages
      sma20: indicators.sma20,
      sma50: indicators.sma50,
      sma200: indicators.sma200,
      priceVsSma20: indicators.priceVsSma20,
      priceVsSma50: indicators.priceVsSma50,
      priceVsSma200: indicators.priceVsSma200,
      crossoverSignal: indicators.crossoverSignal,
      maTrend: indicators.maTrend,
      // Historical Returns
      return1D: indicators.return1D,
      return5D: indicators.return5D,
      return1M: indicators.return1M,
      return3M: indicators.return3M,
      return6M: indicators.return6M,
      returnYTD: indicators.returnYTD,
      return1Y: indicators.return1Y,
      // Signal Summary
      signalSummary: indicators.signalSummary,
      // Pivot Points & S/R
      pivotPoints: indicators.pivotPoints,
      lowConfidence: indicators.lowConfidence,
      timestamp: Date.now(),
    };

    console.log(`✅ [TDStats] Stats for ${symbol}:`, {
      rvol: rvol?.toFixed(2),
      rsi14: indicators.rsi14?.toFixed(2),
      macd: indicators.macd?.toFixed(4),
      atr14: indicators.atr14?.toFixed(2),
      pct: percentChange?.toFixed(2),
      pct52w: (percentile52w * 100)?.toFixed(1),
      sma20: indicators.sma20?.toFixed(2),
      sma50: indicators.sma50?.toFixed(2),
      sma200: indicators.sma200?.toFixed(2),
      maTrend: indicators.maTrend,
      crossover: indicators.crossoverSignal,
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
