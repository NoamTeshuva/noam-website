import React, { useState, useEffect } from 'react';
import { buildStats } from '../services/tdStats';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';

/**
 * StatsTile - Display technical indicators and stats for a symbol
 * Uses only Twelve Data API (2 calls: quote + time_series)
 */
const StatsTile = ({ symbol }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [resetTime, setResetTime] = useState(null);

  useEffect(() => {
    if (!symbol) return;

    const loadStats = async () => {
      setLoading(true);
      setError(null);
      setUsingCachedData(false);
      setResetTime(null);

      try {
        const data = await buildStats(symbol);
        setStats(data);
      } catch (err) {
        console.error(`Error loading stats for ${symbol}:`, err);

        // Check if this is a rate limit exhaustion error
        const errMsg = err.message || '';
        if (errMsg.startsWith('TD_EXHAUSTED:')) {
          const message = errMsg.replace('TD_EXHAUSTED:', '');
          setUsingCachedData(true);
          setResetTime(message);

          // If we have stats from before, keep showing them
          if (stats) {
            setError(null);
          } else {
            setError(message);
          }
        } else {
          setError(errMsg || 'Failed to load stats');
        }
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [symbol]);

  if (loading) {
    return (
      <div className="bg-bloomberg-panel border border-bloomberg-border rounded p-6">
        <div className="flex items-center mb-4">
          <BarChart3 className="h-5 w-5 text-bloomberg-orange mr-2" />
          <h3 className="text-bloomberg-orange font-bold" style={{ fontSize: '16px' }}>
            TECHNICAL ANALYSIS
          </h3>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="h-4 bg-bloomberg-secondary rounded w-3/4"></div>
              <div className="h-4 bg-bloomberg-secondary rounded w-1/2"></div>
              <div className="h-4 bg-bloomberg-secondary rounded w-2/3"></div>
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-bloomberg-secondary rounded w-3/4"></div>
              <div className="h-4 bg-bloomberg-secondary rounded w-1/2"></div>
              <div className="h-6 bg-bloomberg-secondary rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-bloomberg-panel border border-bloomberg-border rounded p-6">
        <div className="flex items-center mb-4">
          <BarChart3 className="h-5 w-5 text-bloomberg-orange mr-2" />
          <h3 className="text-bloomberg-orange font-bold" style={{ fontSize: '16px' }}>
            TECHNICAL ANALYSIS
          </h3>
        </div>
        <div className="text-center py-8 text-bloomberg-status-error">{error}</div>
      </div>
    );
  }

  if (!stats) return null;

  // Helper functions
  const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined) return '---';
    return num.toFixed(decimals);
  };

  const formatVolume = (vol) => {
    if (!vol) return '---';
    if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
    if (vol >= 1e3) return `$${(vol / 1e3).toFixed(2)}K`;
    return `$${vol.toFixed(0)}`;
  };

  const getRSIColor = (rsi) => {
    if (rsi === null) return 'text-gray-400';
    if (rsi >= 70) return 'text-bloomberg-status-error'; // Overbought
    if (rsi <= 30) return 'text-bloomberg-data-positive'; // Oversold
    return 'text-white';
  };

  const getRSILabel = (rsi) => {
    if (rsi === null) return '';
    if (rsi >= 70) return '(Overbought)';
    if (rsi <= 30) return '(Oversold)';
    return '';
  };

  const getStochColor = (k) => {
    if (k === null) return 'text-gray-400';
    if (k >= 80) return 'text-bloomberg-status-error'; // Overbought
    if (k <= 20) return 'text-bloomberg-data-positive'; // Oversold
    return 'text-white';
  };

  const getStochLabel = (k) => {
    if (k === null) return '';
    if (k >= 80) return '(Overbought)';
    if (k <= 20) return '(Oversold)';
    return '';
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'STRONG_BULLISH':
        return 'text-bloomberg-data-positive';
      case 'BULLISH':
        return 'text-green-400';
      case 'STRONG_BEARISH':
        return 'text-bloomberg-data-negative';
      case 'BEARISH':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getTrendLabel = (trend) => {
    switch (trend) {
      case 'STRONG_BULLISH':
        return 'STRONG BULL';
      case 'BULLISH':
        return 'BULLISH';
      case 'STRONG_BEARISH':
        return 'STRONG BEAR';
      case 'BEARISH':
        return 'BEARISH';
      default:
        return 'NEUTRAL';
    }
  };

  const getPriceVsMAColor = (pct) => {
    if (pct === null) return 'text-gray-400';
    if (pct > 0) return 'text-bloomberg-data-positive';
    if (pct < 0) return 'text-bloomberg-data-negative';
    return 'text-gray-400';
  };

  const getReturnColor = (ret) => {
    if (ret === null || ret === undefined) return 'text-gray-500';
    if (ret > 0) return 'text-bloomberg-data-positive';
    if (ret < 0) return 'text-bloomberg-data-negative';
    return 'text-gray-400';
  };

  const formatReturn = (ret) => {
    if (ret === null || ret === undefined) return '---';
    const sign = ret >= 0 ? '+' : '';
    return `${sign}${ret.toFixed(2)}%`;
  };

  const getBiasColor = (bias) => {
    switch (bias) {
      case 'BULLISH':
        return 'text-bloomberg-data-positive';
      case 'BEARISH':
        return 'text-bloomberg-data-negative';
      default:
        return 'text-gray-400';
    }
  };

  const getBiasBgColor = (bias) => {
    switch (bias) {
      case 'BULLISH':
        return 'bg-green-900/40 border-green-600';
      case 'BEARISH':
        return 'bg-red-900/40 border-red-600';
      default:
        return 'bg-gray-800/40 border-gray-600';
    }
  };

  return (
    <div className="bg-bloomberg-panel border border-bloomberg-border rounded p-3 text-xs">
      {/* Header Row - Compact */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <BarChart3 className="h-4 w-4 text-bloomberg-orange mr-1" />
          <span className="text-bloomberg-orange font-bold text-sm">TECHNICAL ANALYSIS</span>
        </div>
        <div className="flex items-center space-x-2">
          {stats.lowConfidence && <span className="text-yellow-500">⚠</span>}
          {usingCachedData && <span className="text-yellow-500 text-xs">CACHED</span>}
          <span className="text-gray-500">{new Date(stats.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Signal + Price Row - Combined */}
      <div className="flex items-stretch gap-2 mb-2">
        {/* Signal Summary - Compact */}
        {stats.signalSummary && (
          <div className={`flex-1 p-2 rounded border ${getBiasBgColor(stats.signalSummary.bias)}`}>
            <div className="flex items-center justify-between">
              <span className={`text-lg font-bold ${getBiasColor(stats.signalSummary.bias)}`}>
                {stats.signalSummary.bias}
              </span>
              <span className={`font-mono ${getBiasColor(stats.signalSummary.bias)}`}>
                {stats.signalSummary.strength}%
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {stats.signalSummary.signals.slice(0, 4).map((sig, idx) => (
                <span
                  key={idx}
                  className={`px-1 rounded text-xs ${
                    sig.signal === 'BULLISH'
                      ? 'bg-green-900/50 text-green-400'
                      : sig.signal === 'BEARISH'
                        ? 'bg-red-900/50 text-red-400'
                        : 'bg-gray-700/50 text-gray-400'
                  }`}
                >
                  {sig.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Price Box */}
        <div className="bg-bloomberg-secondary/30 rounded p-2 min-w-[120px]">
          <div className="text-gray-400 text-xs">PRICE</div>
          <div className="text-white font-mono text-lg">${formatNumber(stats.price, 2)}</div>
          <div
            className={`font-mono ${
              stats.percentChange >= 0
                ? 'text-bloomberg-data-positive'
                : 'text-bloomberg-data-negative'
            }`}
          >
            {stats.percentChange >= 0 ? '+' : ''}
            {formatNumber(stats.percentChange, 2)}%
          </div>
        </div>

        {/* Volume Box */}
        <div className="bg-bloomberg-secondary/30 rounded p-2 min-w-[100px]">
          <div className="text-gray-400 text-xs">RVOL</div>
          <div
            className={`font-mono text-lg ${
              stats.rvol > 1.5
                ? 'text-bloomberg-data-positive'
                : stats.rvol < 0.5
                  ? 'text-bloomberg-data-negative'
                  : 'text-white'
            }`}
          >
            {stats.rvol ? `${formatNumber(stats.rvol, 2)}x` : '---'}
          </div>
          <div className="text-gray-500">{formatVolume(stats.dollarVolume)}</div>
        </div>
      </div>

      {/* Performance Returns - Single Row */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {[
          { label: '1D', value: stats.return1D },
          { label: '5D', value: stats.return5D },
          { label: '1M', value: stats.return1M },
          { label: '3M', value: stats.return3M },
          { label: '6M', value: stats.return6M },
          { label: 'YTD', value: stats.returnYTD },
          { label: '1Y', value: stats.return1Y },
        ].map(({ label, value }) => (
          <div key={label} className="bg-bloomberg-secondary/20 rounded p-1 text-center">
            <div className="text-gray-500">{label}</div>
            <div className={`font-mono ${getReturnColor(value)}`}>{formatReturn(value)}</div>
          </div>
        ))}
      </div>

      {/* Moving Averages + 52W Range Row */}
      <div className="grid grid-cols-4 gap-1 mb-2">
        {/* SMAs */}
        {[
          { label: 'SMA20', value: stats.sma20, pct: stats.priceVsSma20 },
          { label: 'SMA50', value: stats.sma50, pct: stats.priceVsSma50 },
          { label: 'SMA200', value: stats.sma200, pct: stats.priceVsSma200 },
        ].map(({ label, value, pct }) => (
          <div key={label} className="bg-bloomberg-secondary/20 rounded p-1">
            <div className="flex justify-between">
              <span className="text-gray-400">{label}</span>
              <span className="text-white font-mono">${formatNumber(value, 2)}</span>
            </div>
            {pct !== null && (
              <div className={`text-right ${getPriceVsMAColor(pct)}`}>
                {pct >= 0 ? '▲' : '▼'}
                {Math.abs(pct).toFixed(1)}%
              </div>
            )}
          </div>
        ))}
        {/* MA Trend */}
        <div className="bg-bloomberg-secondary/20 rounded p-1">
          <div className="text-gray-400">TREND</div>
          <div className={`font-bold ${getTrendColor(stats.maTrend)}`}>
            {getTrendLabel(stats.maTrend)}
          </div>
        </div>
      </div>

      {/* Crossover Alert */}
      {stats.crossoverSignal && (
        <div
          className={`mb-2 px-2 py-1 rounded text-xs font-bold ${
            stats.crossoverSignal === 'GOLDEN_CROSS'
              ? 'bg-green-900/40 border border-green-600 text-green-400'
              : 'bg-red-900/40 border border-red-600 text-red-400'
          }`}
        >
          {stats.crossoverSignal === 'GOLDEN_CROSS' ? '▲ GOLDEN CROSS' : '▼ DEATH CROSS'}
        </div>
      )}

      {/* Technical Indicators Grid - Compact 2x4 */}
      <div className="grid grid-cols-4 gap-1 mb-2">
        {/* RSI */}
        <div className="bg-bloomberg-secondary/20 rounded p-1">
          <div className="text-gray-400">RSI(14)</div>
          <div className={`font-mono ${getRSIColor(stats.rsi14)}`}>
            {formatNumber(stats.rsi14, 1)}
            {stats.rsi14 >= 70 && <span className="text-xs ml-1">OB</span>}
            {stats.rsi14 <= 30 && <span className="text-xs ml-1">OS</span>}
          </div>
        </div>
        {/* Stochastic */}
        <div className="bg-bloomberg-secondary/20 rounded p-1">
          <div className="text-gray-400">STOCH</div>
          <div className={`font-mono ${getStochColor(stats.stochK)}`}>
            {formatNumber(stats.stochK, 1)}/{formatNumber(stats.stochD, 1)}
          </div>
        </div>
        {/* MACD */}
        <div className="bg-bloomberg-secondary/20 rounded p-1">
          <div className="text-gray-400">MACD</div>
          <div
            className={`font-mono ${
              stats.macdHistogram > 0
                ? 'text-bloomberg-data-positive'
                : 'text-bloomberg-data-negative'
            }`}
          >
            {formatNumber(stats.macdHistogram, 3)}
          </div>
        </div>
        {/* ATR */}
        <div className="bg-bloomberg-secondary/20 rounded p-1">
          <div className="text-gray-400">ATR(14)</div>
          <div className="font-mono text-white">
            {formatNumber(stats.atr14, 2)}
            <span className="text-gray-500 ml-1">
              ({formatNumber((stats.atr14 / stats.price) * 100, 1)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Pivot Points + 52W Range - Compact */}
      <div className="grid grid-cols-2 gap-2">
        {/* Pivots */}
        {stats.pivotPoints && stats.pivotPoints.pivot && (
          <div className="bg-bloomberg-secondary/20 rounded p-1">
            <div className="text-gray-400 mb-1">PIVOTS</div>
            <div className="grid grid-cols-5 gap-1 text-center">
              <div>
                <div className="text-red-400">R2</div>
                <div className="font-mono text-white">{formatNumber(stats.pivotPoints.r2, 0)}</div>
              </div>
              <div>
                <div className="text-red-300">R1</div>
                <div className="font-mono text-white">{formatNumber(stats.pivotPoints.r1, 0)}</div>
              </div>
              <div className="bg-bloomberg-orange/20 rounded">
                <div className="text-bloomberg-orange">P</div>
                <div className="font-mono text-bloomberg-orange">
                  {formatNumber(stats.pivotPoints.pivot, 0)}
                </div>
              </div>
              <div>
                <div className="text-green-300">S1</div>
                <div className="font-mono text-white">{formatNumber(stats.pivotPoints.s1, 0)}</div>
              </div>
              <div>
                <div className="text-green-400">S2</div>
                <div className="font-mono text-white">{formatNumber(stats.pivotPoints.s2, 0)}</div>
              </div>
            </div>
          </div>
        )}

        {/* 52-Week Range */}
        <div className="bg-bloomberg-secondary/20 rounded p-1">
          <div className="text-gray-400 mb-1">52-WEEK RANGE</div>
          {stats.fiftyTwoWeek && stats.fiftyTwoWeek.low && stats.fiftyTwoWeek.high ? (
            <>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-400">${formatNumber(stats.fiftyTwoWeek.low, 0)}</span>
                <span className="text-white font-mono">
                  {(stats.percentile52w * 100).toFixed(0)}%
                </span>
                <span className="text-gray-400">${formatNumber(stats.fiftyTwoWeek.high, 0)}</span>
              </div>
              <div className="relative h-1.5 bg-bloomberg-secondary rounded-full">
                <div className="absolute h-1.5 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full w-full"></div>
                {stats.percentile52w !== null && (
                  <div
                    className="absolute top-0 w-1 h-1.5 bg-white rounded"
                    style={{ left: `${stats.percentile52w * 100}%`, transform: 'translateX(-50%)' }}
                  ></div>
                )}
              </div>
            </>
          ) : (
            <div className="text-gray-500">---</div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 pt-1 border-t border-bloomberg-border-subtle flex items-center justify-between text-gray-500">
        <div className="flex items-center">
          <Activity className="h-3 w-3 mr-1" />
          <span>Twelve Data</span>
        </div>
        {stats.pivotPoints?.nearestSupport && stats.pivotPoints?.nearestResistance && (
          <span>
            S: ${formatNumber(stats.pivotPoints.nearestSupport.value, 0)} | R: $
            {formatNumber(stats.pivotPoints.nearestResistance.value, 0)}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatsTile;
