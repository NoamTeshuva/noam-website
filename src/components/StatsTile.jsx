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
    <div className="bg-bloomberg-panel border border-bloomberg-border rounded p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <BarChart3 className="h-5 w-5 text-bloomberg-orange mr-2" />
          <h3 className="text-bloomberg-orange font-bold" style={{ fontSize: '16px' }}>
            TECHNICAL ANALYSIS
          </h3>
        </div>
        {stats.lowConfidence && <span className="text-xs text-yellow-500">⚠ Limited data</span>}
      </div>

      {/* Rate Limit Warning Banner */}
      {usingCachedData && (
        <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-600 rounded">
          <div className="flex items-center space-x-2">
            <span className="text-yellow-500 text-sm font-bold">⚠ CACHED DATA</span>
            <span className="text-yellow-300 text-xs">
              Rate limit reached. Showing cached data. {resetTime}
            </span>
          </div>
        </div>
      )}

      {/* Signal Summary */}
      {stats.signalSummary && (
        <div className={`mb-6 p-4 rounded border ${getBiasBgColor(stats.signalSummary.bias)}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <span className="text-gray-400 text-xs font-bold">SIGNAL</span>
              <span className={`text-2xl font-bold ${getBiasColor(stats.signalSummary.bias)}`}>
                {stats.signalSummary.bias}
              </span>
            </div>
            <div className="text-right">
              <div className="text-gray-400 text-xs">Strength</div>
              <div className={`text-lg font-mono ${getBiasColor(stats.signalSummary.bias)}`}>
                {stats.signalSummary.strength}%
              </div>
            </div>
          </div>
          {/* Signal breakdown */}
          <div className="flex flex-wrap gap-2">
            {stats.signalSummary.signals.map((sig, idx) => (
              <div
                key={idx}
                className={`px-2 py-1 rounded text-xs ${
                  sig.signal === 'BULLISH'
                    ? 'bg-green-900/50 text-green-400'
                    : sig.signal === 'BEARISH'
                      ? 'bg-red-900/50 text-red-400'
                      : 'bg-gray-700/50 text-gray-400'
                }`}
              >
                <span className="font-bold">{sig.name}:</span> {sig.reason}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Price Metrics */}
        <div className="space-y-4">
          {/* Price & % Change */}
          <div>
            <div className="text-gray-400 text-xs mb-1">PRICE & CHANGE</div>
            <div className="flex items-center space-x-3">
              <span className="text-white font-mono text-2xl">${formatNumber(stats.price, 2)}</span>
              <div
                className={`flex items-center space-x-1 ${
                  stats.percentChange >= 0
                    ? 'text-bloomberg-data-positive'
                    : 'text-bloomberg-data-negative'
                }`}
              >
                {stats.percentChange >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="font-mono text-lg">
                  {stats.percentChange >= 0 ? '+' : ''}
                  {formatNumber(stats.percentChange, 2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Dollar Volume */}
          <div>
            <div className="text-gray-400 text-xs mb-1">DOLLAR VOLUME</div>
            <div className="text-white font-mono text-xl">{formatVolume(stats.dollarVolume)}</div>
            <div className="text-gray-500 text-xs mt-1">Volume: {formatVolume(stats.volume)}</div>
          </div>
        </div>

        {/* Right Column: Volume & Range */}
        <div className="space-y-4">
          {/* Relative Volume */}
          <div>
            <div className="text-gray-400 text-xs mb-1">RELATIVE VOLUME (RVOL)</div>
            {stats.rvol !== null ? (
              <>
                <div
                  className={`font-mono text-xl ${
                    stats.rvol > 1.5
                      ? 'text-bloomberg-data-positive'
                      : stats.rvol < 0.5
                        ? 'text-bloomberg-data-negative'
                        : 'text-white'
                  }`}
                >
                  {formatNumber(stats.rvol, 2)}x
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  Avg Vol: {formatVolume(stats.averageVolume)}
                </div>
              </>
            ) : (
              <div className="text-gray-500">---</div>
            )}
          </div>

          {/* 52-Week Range */}
          <div>
            <div className="text-gray-400 text-xs mb-1">52-WEEK RANGE</div>
            {stats.fiftyTwoWeek && stats.fiftyTwoWeek.low && stats.fiftyTwoWeek.high ? (
              <>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>${formatNumber(stats.fiftyTwoWeek.low, 2)}</span>
                  <span className="text-white font-mono">${formatNumber(stats.price, 2)}</span>
                  <span>${formatNumber(stats.fiftyTwoWeek.high, 2)}</span>
                </div>
                {/* Visual Range Bar */}
                <div className="relative h-2 bg-bloomberg-secondary rounded-full">
                  <div
                    className="absolute h-2 bg-gradient-to-r from-bloomberg-data-negative via-bloomberg-data-neutral to-bloomberg-data-positive rounded-full"
                    style={{ width: '100%' }}
                  ></div>
                  {stats.percentile52w !== null && (
                    <div
                      className="absolute top-0 w-1 h-2 bg-bloomberg-orange shadow-lg"
                      style={{
                        left: `${stats.percentile52w * 100}%`,
                        transform: 'translateX(-50%)',
                      }}
                      title={`${(stats.percentile52w * 100).toFixed(1)}% of range`}
                    ></div>
                  )}
                </div>
                {stats.percentile52w !== null && (
                  <div className="text-xs text-gray-500 mt-1 text-center">
                    {(stats.percentile52w * 100).toFixed(1)}% of 52w range
                  </div>
                )}
              </>
            ) : (
              <div className="text-gray-500">---</div>
            )}
          </div>
        </div>
      </div>

      {/* Historical Performance Returns */}
      <div className="mt-6 pt-4 border-t border-bloomberg-border-subtle">
        <div className="text-gray-400 text-xs font-bold mb-3">PERFORMANCE</div>
        <div className="grid grid-cols-7 gap-2">
          {[
            { label: '1D', value: stats.return1D },
            { label: '5D', value: stats.return5D },
            { label: '1M', value: stats.return1M },
            { label: '3M', value: stats.return3M },
            { label: '6M', value: stats.return6M },
            { label: 'YTD', value: stats.returnYTD },
            { label: '1Y', value: stats.return1Y },
          ].map(({ label, value }) => (
            <div key={label} className="bg-bloomberg-secondary/30 rounded p-2 text-center">
              <div className="text-gray-500 text-xs mb-1">{label}</div>
              <div className={`font-mono text-sm ${getReturnColor(value)}`}>
                {formatReturn(value)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Moving Averages Section */}
      <div className="mt-6 pt-4 border-t border-bloomberg-border-subtle">
        <div className="flex items-center justify-between mb-4">
          <div className="text-gray-400 text-xs font-bold">MOVING AVERAGES</div>
          {stats.maTrend && (
            <div className={`flex items-center space-x-2 ${getTrendColor(stats.maTrend)}`}>
              {stats.maTrend.includes('BULLISH') ? (
                <ArrowUpCircle className="h-4 w-4" />
              ) : stats.maTrend.includes('BEARISH') ? (
                <ArrowDownCircle className="h-4 w-4" />
              ) : null}
              <span className="text-xs font-bold">{getTrendLabel(stats.maTrend)}</span>
            </div>
          )}
        </div>

        {/* Crossover Signal Alert */}
        {stats.crossoverSignal && (
          <div
            className={`mb-4 p-2 rounded text-xs font-bold flex items-center space-x-2 ${
              stats.crossoverSignal === 'GOLDEN_CROSS'
                ? 'bg-green-900/40 border border-green-600 text-green-400'
                : 'bg-red-900/40 border border-red-600 text-red-400'
            }`}
          >
            {stats.crossoverSignal === 'GOLDEN_CROSS' ? (
              <>
                <ArrowUpCircle className="h-4 w-4" />
                <span>GOLDEN CROSS DETECTED - SMA50 crossed above SMA200</span>
              </>
            ) : (
              <>
                <ArrowDownCircle className="h-4 w-4" />
                <span>DEATH CROSS DETECTED - SMA50 crossed below SMA200</span>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          {/* SMA 20 */}
          <div className="bg-bloomberg-secondary/30 rounded p-3">
            <div className="text-gray-400 text-xs mb-1">SMA(20)</div>
            <div className="text-white font-mono text-lg">${formatNumber(stats.sma20, 2)}</div>
            {stats.priceVsSma20 !== null && (
              <div className={`text-xs mt-1 ${getPriceVsMAColor(stats.priceVsSma20)}`}>
                {stats.priceVsSma20 >= 0 ? '▲' : '▼'} {Math.abs(stats.priceVsSma20).toFixed(2)}%
                <span className="text-gray-500 ml-1">
                  {stats.priceVsSma20 >= 0 ? 'above' : 'below'}
                </span>
              </div>
            )}
          </div>

          {/* SMA 50 */}
          <div className="bg-bloomberg-secondary/30 rounded p-3">
            <div className="text-gray-400 text-xs mb-1">SMA(50)</div>
            <div className="text-white font-mono text-lg">${formatNumber(stats.sma50, 2)}</div>
            {stats.priceVsSma50 !== null && (
              <div className={`text-xs mt-1 ${getPriceVsMAColor(stats.priceVsSma50)}`}>
                {stats.priceVsSma50 >= 0 ? '▲' : '▼'} {Math.abs(stats.priceVsSma50).toFixed(2)}%
                <span className="text-gray-500 ml-1">
                  {stats.priceVsSma50 >= 0 ? 'above' : 'below'}
                </span>
              </div>
            )}
          </div>

          {/* SMA 200 */}
          <div className="bg-bloomberg-secondary/30 rounded p-3">
            <div className="text-gray-400 text-xs mb-1">SMA(200)</div>
            <div className="text-white font-mono text-lg">
              {stats.sma200 ? `$${formatNumber(stats.sma200, 2)}` : '---'}
            </div>
            {stats.priceVsSma200 !== null && (
              <div className={`text-xs mt-1 ${getPriceVsMAColor(stats.priceVsSma200)}`}>
                {stats.priceVsSma200 >= 0 ? '▲' : '▼'} {Math.abs(stats.priceVsSma200).toFixed(2)}%
                <span className="text-gray-500 ml-1">
                  {stats.priceVsSma200 >= 0 ? 'above' : 'below'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer: Technical Indicators */}
      <div className="mt-6 pt-4 border-t border-bloomberg-border-subtle">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* RSI(14) */}
          <div>
            <div className="text-gray-400 text-xs mb-1">RSI(14)</div>
            <div className={`font-mono text-lg ${getRSIColor(stats.rsi14)}`}>
              {formatNumber(stats.rsi14, 2)}
              {stats.rsi14 !== null && (
                <span className="text-xs ml-2">{getRSILabel(stats.rsi14)}</span>
              )}
            </div>
          </div>

          {/* MACD */}
          <div>
            <div className="text-gray-400 text-xs mb-1">MACD(12,26,9)</div>
            {stats.macd !== null && stats.macdSignal !== null ? (
              <div className="space-y-1">
                <div
                  className={`font-mono text-sm ${
                    stats.macdHistogram > 0
                      ? 'text-bloomberg-data-positive'
                      : 'text-bloomberg-data-negative'
                  }`}
                >
                  MACD: {formatNumber(stats.macd, 4)}
                </div>
                <div className="font-mono text-xs text-gray-400">
                  Signal: {formatNumber(stats.macdSignal, 4)}
                </div>
                <div
                  className={`font-mono text-xs ${
                    stats.macdHistogram > 0
                      ? 'text-bloomberg-data-positive'
                      : 'text-bloomberg-data-negative'
                  }`}
                >
                  Hist: {formatNumber(stats.macdHistogram, 4)}
                </div>
              </div>
            ) : (
              <div className="text-gray-500">---</div>
            )}
          </div>

          {/* ATR(14) */}
          <div>
            <div className="text-gray-400 text-xs mb-1">ATR(14)</div>
            <div className="font-mono text-lg text-white">{formatNumber(stats.atr14, 2)}</div>
            {stats.atr14 !== null && (
              <div className="text-xs text-gray-500 mt-1">
                Volatility: {formatNumber((stats.atr14 / stats.price) * 100, 2)}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Source Attribution */}
      <div className="mt-4 pt-2 border-t border-bloomberg-border-subtle text-xs text-gray-500 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="h-3 w-3" />
          <span>Powered by Twelve Data</span>
        </div>
        <span>Updated: {new Date(stats.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

export default StatsTile;
