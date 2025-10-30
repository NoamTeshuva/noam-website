/**
 * Exponential Moving Average (EMA) Utilities
 * Used for technical indicators like MACD
 */

/**
 * Calculate EMA using alpha smoothing
 * @param {number[]} data - Array of values (typically closing prices)
 * @param {number} period - EMA period (e.g., 12, 26)
 * @returns {number[]} - Array of EMA values
 */
export const calculateEMA = (data, period) => {
  if (!data || data.length === 0) return [];
  if (period <= 0) return [];
  if (period > data.length) return [];

  const ema = [];
  const multiplier = 2 / (period + 1);

  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  const sma = sum / period;
  ema[period - 1] = sma;

  // Calculate subsequent EMAs
  for (let i = period; i < data.length; i++) {
    const currentEMA = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
    ema[i] = currentEMA;
  }

  return ema;
};

/**
 * Calculate EMA for a single new value (streaming)
 * @param {number} currentValue - New value to add
 * @param {number} previousEMA - Previous EMA value
 * @param {number} period - EMA period
 * @returns {number} - New EMA value
 */
export const updateEMA = (currentValue, previousEMA, period) => {
  const multiplier = 2 / (period + 1);
  return (currentValue - previousEMA) * multiplier + previousEMA;
};

/**
 * Calculate Simple Moving Average (SMA)
 * @param {number[]} data - Array of values
 * @param {number} period - SMA period
 * @returns {number[]} - Array of SMA values
 */
export const calculateSMA = (data, period) => {
  if (!data || data.length < period) return [];

  const sma = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    sma.push(sum / period);
  }

  return sma;
};

/**
 * Calculate Wilder's Smoothing (used for RSI, ATR)
 * Similar to EMA but uses different smoothing factor
 * @param {number[]} data - Array of values
 * @param {number} period - Smoothing period
 * @returns {number[]} - Array of smoothed values
 */
export const calculateWilderSmoothing = (data, period) => {
  if (!data || data.length < period) return [];

  const smoothed = [];

  // First value is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  smoothed[period - 1] = sum / period;

  // Subsequent values use Wilder's smoothing
  for (let i = period; i < data.length; i++) {
    smoothed[i] = (smoothed[i - 1] * (period - 1) + data[i]) / period;
  }

  return smoothed;
};
