import React, { useState, useEffect } from 'react';
import { buildStats } from '../services/tdStats';
import { TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react';

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
        <div className="text-center py-8 text-bloomberg-status-error">
          {error}
        </div>
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
        {stats.lowConfidence && (
          <span className="text-xs text-yellow-500">
            ⚠ Limited data
          </span>
        )}
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

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Price Metrics */}
        <div className="space-y-4">
          {/* Price & % Change */}
          <div>
            <div className="text-gray-400 text-xs mb-1">PRICE & CHANGE</div>
            <div className="flex items-center space-x-3">
              <span className="text-white font-mono text-2xl">
                ${formatNumber(stats.price, 2)}
              </span>
              <div className={`flex items-center space-x-1 ${
                stats.percentChange >= 0 ? 'text-bloomberg-data-positive' : 'text-bloomberg-data-negative'
              }`}>
                {stats.percentChange >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span className="font-mono text-lg">
                  {stats.percentChange >= 0 ? '+' : ''}{formatNumber(stats.percentChange, 2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Dollar Volume */}
          <div>
            <div className="text-gray-400 text-xs mb-1">DOLLAR VOLUME</div>
            <div className="text-white font-mono text-xl">
              {formatVolume(stats.dollarVolume)}
            </div>
            <div className="text-gray-500 text-xs mt-1">
              Volume: {formatVolume(stats.volume)}
            </div>
          </div>
        </div>

        {/* Right Column: Volume & Range */}
        <div className="space-y-4">
          {/* Relative Volume */}
          <div>
            <div className="text-gray-400 text-xs mb-1">RELATIVE VOLUME (RVOL)</div>
            {stats.rvol !== null ? (
              <>
                <div className={`font-mono text-xl ${
                  stats.rvol > 1.5 ? 'text-bloomberg-data-positive' :
                  stats.rvol < 0.5 ? 'text-bloomberg-data-negative' :
                  'text-white'
                }`}>
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
                        transform: 'translateX(-50%)'
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
                <div className={`font-mono text-sm ${
                  stats.macdHistogram > 0 ? 'text-bloomberg-data-positive' : 'text-bloomberg-data-negative'
                }`}>
                  MACD: {formatNumber(stats.macd, 4)}
                </div>
                <div className="font-mono text-xs text-gray-400">
                  Signal: {formatNumber(stats.macdSignal, 4)}
                </div>
                <div className={`font-mono text-xs ${
                  stats.macdHistogram > 0 ? 'text-bloomberg-data-positive' : 'text-bloomberg-data-negative'
                }`}>
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
            <div className="font-mono text-lg text-white">
              {formatNumber(stats.atr14, 2)}
            </div>
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
        <span>
          Updated: {new Date(stats.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

export default StatsTile;
