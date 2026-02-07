/**
 * Correlation & Peer Analysis Utilities
 * Pure math functions for computing peer stock relationships.
 * All functions are stateless and operate on arrays of close prices or returns.
 */

/**
 * Compute daily returns from an array of close prices.
 * @param {number[]} closes - Array of closing prices (oldest first)
 * @returns {number[]} - Array of daily returns (length = closes.length - 1)
 */
export const computeReturns = (closes) => {
  if (!closes || closes.length < 2) return [];
  const returns = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] === 0) {
      returns.push(0);
    } else {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
  }
  return returns;
};

/**
 * Compute Pearson correlation coefficient between two return series.
 * @param {number[]} returnsA - First return series
 * @param {number[]} returnsB - Second return series
 * @returns {number|null} - Correlation coefficient (-1 to 1) or null if insufficient data
 */
export const computeCorrelation = (returnsA, returnsB) => {
  const n = Math.min(returnsA.length, returnsB.length);
  if (n < 5) return null;

  // Use the last n values from each series (align from the end)
  const a = returnsA.slice(-n);
  const b = returnsB.slice(-n);

  let sumA = 0, sumB = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
  }
  const meanA = sumA / n;
  const meanB = sumB / n;

  let covAB = 0, varA = 0, varB = 0;
  for (let i = 0; i < n; i++) {
    const dA = a[i] - meanA;
    const dB = b[i] - meanB;
    covAB += dA * dB;
    varA += dA * dA;
    varB += dB * dB;
  }

  const denominator = Math.sqrt(varA * varB);
  if (denominator === 0) return 0;

  return covAB / denominator;
};

/**
 * Compute NxN correlation matrix from a map of symbol returns.
 * @param {Object} symbolReturnsMap - { SYMBOL: number[] } map of returns
 * @param {number} period - Number of trailing days to use (default: all)
 * @returns {{ symbols: string[], matrix: number[][] }} - Correlation matrix
 */
export const computeCorrelationMatrix = (symbolReturnsMap, period = null) => {
  const symbols = Object.keys(symbolReturnsMap);
  if (symbols.length === 0) return { symbols: [], matrix: [] };

  // Trim returns to requested period
  const trimmed = {};
  for (const sym of symbols) {
    const r = symbolReturnsMap[sym];
    trimmed[sym] = period && r.length > period ? r.slice(-period) : r;
  }

  const n = symbols.length;
  const matrix = Array.from({ length: n }, () => Array(n).fill(null));

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1.0; // Self-correlation is always 1
    for (let j = i + 1; j < n; j++) {
      const corr = computeCorrelation(trimmed[symbols[i]], trimmed[symbols[j]]);
      matrix[i][j] = corr;
      matrix[j][i] = corr;
    }
  }

  return { symbols, matrix };
};

/**
 * Compute relative strength (cumulative returns) for multiple symbols over various periods.
 * @param {Object} symbolClosesMap - { SYMBOL: number[] } map of close prices (oldest first)
 * @param {number[]} periods - Array of lookback periods in trading days (e.g., [5, 21, 63, 126])
 * @returns {Object} - { SYMBOL: { 5: 2.3, 21: -1.5, ... } } cumulative return percentages
 */
export const computeRelativeStrength = (symbolClosesMap, periods = [5, 21, 63, 126]) => {
  const result = {};

  for (const [symbol, closes] of Object.entries(symbolClosesMap)) {
    result[symbol] = {};
    if (!closes || closes.length < 2) {
      periods.forEach(p => { result[symbol][p] = null; });
      continue;
    }

    const currentPrice = closes[closes.length - 1];
    for (const p of periods) {
      const idx = closes.length - 1 - p;
      if (idx >= 0 && closes[idx] !== 0) {
        result[symbol][p] = ((currentPrice - closes[idx]) / closes[idx]) * 100;
      } else {
        result[symbol][p] = null;
      }
    }
  }

  return result;
};

/**
 * Compute cross-correlation at various lag offsets to identify lead/lag relationships.
 * Positive lag means A leads B (A's returns predict B's future returns).
 * @param {number[]} returnsA - Returns for stock A
 * @param {number[]} returnsB - Returns for stock B
 * @param {number} maxLag - Maximum lag offset to test (default: 5)
 * @returns {{ bestLag: number, bestCorr: number, direction: string, correlations: Object }}
 */
export const computeLeadLag = (returnsA, returnsB, maxLag = 5) => {
  const n = Math.min(returnsA.length, returnsB.length);
  if (n < maxLag + 10) {
    return { bestLag: 0, bestCorr: null, direction: 'INSUFFICIENT_DATA', correlations: {} };
  }

  const correlations = {};
  let bestLag = 0;
  let bestCorr = -Infinity;

  for (let lag = -maxLag; lag <= maxLag; lag++) {
    let a, b;
    if (lag >= 0) {
      // A leads: compare A[0..n-lag-1] with B[lag..n-1]
      a = returnsA.slice(0, n - lag);
      b = returnsB.slice(lag, n);
    } else {
      // B leads: compare A[-lag..n-1] with B[0..n+lag-1]
      a = returnsA.slice(-lag, n);
      b = returnsB.slice(0, n + lag);
    }

    const corr = computeCorrelation(a, b);
    if (corr !== null) {
      correlations[lag] = corr;
      const absCorr = Math.abs(corr);
      if (absCorr > Math.abs(bestCorr)) {
        bestCorr = corr;
        bestLag = lag;
      }
    }
  }

  // Determine direction
  let direction = 'SYNC';
  const zeroCorr = correlations[0] !== undefined ? Math.abs(correlations[0]) : 0;
  const bestAbsCorr = Math.abs(bestCorr);

  // Only report lead/lag if it's meaningfully stronger than zero-lag
  if (bestLag !== 0 && bestAbsCorr > zeroCorr + 0.05) {
    if (bestLag > 0) {
      direction = 'STOCK_LEADS'; // A (main stock) leads B (peer)
    } else {
      direction = 'PEER_LEADS'; // B (peer) leads A (main stock)
    }
  }

  return {
    bestLag,
    bestCorr: bestCorr === -Infinity ? null : bestCorr,
    direction,
    correlations
  };
};

/**
 * Detect when a stock diverges from its peer group.
 * Computes z-score of the stock's cumulative returns vs. peer group average.
 * @param {number[]} stockReturns - Daily returns for the main stock
 * @param {number[][]} peerReturnsArray - Array of daily return arrays for each peer
 * @param {number} window - Lookback window in trading days (default: 20)
 * @returns {{ isDiverging: boolean, zScore: number, direction: string, magnitude: number }|null}
 */
export const detectDivergence = (stockReturns, peerReturnsArray, window = 20) => {
  if (!stockReturns || stockReturns.length < window || peerReturnsArray.length === 0) {
    return null;
  }

  // Filter out peers with insufficient data
  const validPeers = peerReturnsArray.filter(r => r && r.length >= window);
  if (validPeers.length === 0) return null;

  // Compute cumulative returns over the window for the stock
  const stockWindow = stockReturns.slice(-window);
  const stockCumReturn = stockWindow.reduce((acc, r) => acc * (1 + r), 1) - 1;

  // Compute cumulative returns for each peer over the same window
  const peerCumReturns = validPeers.map(peerReturns => {
    const peerWindow = peerReturns.slice(-window);
    return peerWindow.reduce((acc, r) => acc * (1 + r), 1) - 1;
  });

  // Compute peer group mean and standard deviation
  const peerMean = peerCumReturns.reduce((sum, r) => sum + r, 0) / peerCumReturns.length;

  if (peerCumReturns.length < 2) {
    return { isDiverging: false, zScore: 0, direction: 'NEUTRAL', magnitude: 0 };
  }

  const peerVariance = peerCumReturns.reduce((sum, r) => sum + Math.pow(r - peerMean, 2), 0) / (peerCumReturns.length - 1);
  const peerStd = Math.sqrt(peerVariance);

  if (peerStd === 0) {
    return { isDiverging: false, zScore: 0, direction: 'NEUTRAL', magnitude: 0 };
  }

  const zScore = (stockCumReturn - peerMean) / peerStd;
  const isDiverging = Math.abs(zScore) > 2;
  const direction = zScore > 0 ? 'OUTPERFORM' : 'UNDERPERFORM';
  const magnitude = Math.abs(stockCumReturn - peerMean) * 100; // in percentage points

  return {
    isDiverging,
    zScore,
    direction,
    magnitude,
    stockReturn: stockCumReturn * 100,
    peerAvgReturn: peerMean * 100
  };
};
