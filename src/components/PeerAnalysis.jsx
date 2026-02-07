import React, { useState, useMemo } from 'react';
import { usePeerSeries } from '../hooks/usePeerSeries';
import {
  computeReturns,
  computeCorrelationMatrix,
  computeRelativeStrength,
  computeLeadLag,
  detectDivergence
} from '../utils/correlationUtils';
import { Activity } from 'lucide-react';

// Period option constants
const PERF_PERIOD_OPTIONS = [
  { label: '1W', value: 5 },
  { label: '1M', value: 21 },
  { label: '3M', value: 63 },
  { label: '6M', value: 126 }
];

const CORR_PERIOD_OPTIONS = [
  { label: '30d', value: 30 },
  { label: '60d', value: 60 },
  { label: '90d', value: 90 }
];

// Helper: get correlation color
const getCorrColor = (val) => {
  if (val === null || val === undefined) return 'text-gray-500';
  if (val >= 0.7) return 'text-green-400';
  if (val >= 0.3) return 'text-green-600';
  if (val >= -0.3) return 'text-gray-400';
  if (val >= -0.7) return 'text-red-600';
  return 'text-red-400';
};

const getCorrBg = (val) => {
  if (val === null || val === undefined) return 'bg-bloomberg-secondary/20';
  if (val >= 0.7) return 'bg-green-900/40';
  if (val >= 0.3) return 'bg-green-900/20';
  if (val >= -0.3) return 'bg-bloomberg-secondary/20';
  if (val >= -0.7) return 'bg-red-900/20';
  return 'bg-red-900/40';
};

/**
 * PeerAnalysis - Peer stock correlation & analysis panel.
 * Bloomberg dark terminal aesthetic.
 * Sections: Correlation Heatmap, Relative Performance, Lead/Lag Signals, Divergence Alert.
 */
const PeerAnalysis = ({ symbol }) => {
  const [corrPeriod, setCorrPeriod] = useState(60);
  const [perfPeriod, setPerfPeriod] = useState(21);

  const { seriesMap, peers, loading, progress, error } = usePeerSeries(symbol, true);

  // Extract close prices from series data
  const closesMap = useMemo(() => {
    const map = {};
    for (const [sym, bars] of Object.entries(seriesMap)) {
      if (bars && bars.length > 0) {
        map[sym] = bars.map(b => b.close);
      }
    }
    return map;
  }, [seriesMap]);

  // Compute returns for all symbols
  const returnsMap = useMemo(() => {
    const map = {};
    for (const [sym, closes] of Object.entries(closesMap)) {
      map[sym] = computeReturns(closes);
    }
    return map;
  }, [closesMap]);

  // All symbols (main + peers) that have data
  const allSymbols = useMemo(() => {
    const syms = [];
    if (closesMap[symbol]) syms.push(symbol);
    for (const p of peers) {
      if (closesMap[p]) syms.push(p);
    }
    return syms;
  }, [closesMap, symbol, peers]);

  // Correlation matrix
  const corrMatrix = useMemo(() => {
    if (allSymbols.length < 2) return null;
    const filtered = {};
    for (const sym of allSymbols) {
      if (returnsMap[sym]) filtered[sym] = returnsMap[sym];
    }
    return computeCorrelationMatrix(filtered, corrPeriod);
  }, [returnsMap, allSymbols, corrPeriod]);

  // Relative strength
  const relStrength = useMemo(() => {
    if (allSymbols.length === 0) return null;
    const filtered = {};
    for (const sym of allSymbols) {
      if (closesMap[sym]) filtered[sym] = closesMap[sym];
    }
    return computeRelativeStrength(filtered, [perfPeriod]);
  }, [closesMap, allSymbols, perfPeriod]);

  // Lead/Lag analysis
  const leadLagData = useMemo(() => {
    if (!returnsMap[symbol] || peers.length === 0) return [];
    return peers
      .filter(p => returnsMap[p])
      .map(peer => ({
        peer,
        ...computeLeadLag(returnsMap[symbol], returnsMap[peer], 5)
      }));
  }, [returnsMap, symbol, peers]);

  // Divergence detection
  const divergence = useMemo(() => {
    if (!returnsMap[symbol] || peers.length === 0) return null;
    const peerReturns = peers
      .filter(p => returnsMap[p])
      .map(p => returnsMap[p]);
    return detectDivergence(returnsMap[symbol], peerReturns, 20);
  }, [returnsMap, symbol, peers]);

  // Compute peer group average return for the selected period
  const peerAvgReturn = useMemo(() => {
    if (!relStrength) return null;
    const peerReturns = peers
      .filter(p => relStrength[p] && relStrength[p][perfPeriod] !== null)
      .map(p => relStrength[p][perfPeriod]);
    if (peerReturns.length === 0) return null;
    return peerReturns.reduce((sum, r) => sum + r, 0) / peerReturns.length;
  }, [relStrength, peers, perfPeriod]);

  // Find max absolute return for bar scaling
  const maxAbsReturn = useMemo(() => {
    if (!relStrength) return 10;
    let max = 1;
    for (const sym of allSymbols) {
      const val = relStrength[sym]?.[perfPeriod];
      if (val !== null && val !== undefined) {
        max = Math.max(max, Math.abs(val));
      }
    }
    if (peerAvgReturn !== null) {
      max = Math.max(max, Math.abs(peerAvgReturn));
    }
    return max;
  }, [relStrength, allSymbols, perfPeriod, peerAvgReturn]);

  // --- ALL HOOKS ABOVE THIS LINE --- early returns below are safe ---

  // --- Loading State ---
  if (loading && allSymbols.length === 0) {
    return (
      <div className="bg-bloomberg-panel border border-bloomberg-border rounded p-4">
        <div className="flex items-center mb-4">
          <Activity className="h-4 w-4 text-bloomberg-orange mr-2" />
          <span className="text-bloomberg-orange font-bold text-sm">PEER ANALYSIS</span>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bloomberg-orange"></div>
          <span className="ml-3 text-gray-400 text-sm">Loading peer data...</span>
        </div>
        {progress > 0 && (
          <div className="flex items-center space-x-2 mt-2">
            <div className="flex-1 bg-bloomberg-secondary rounded-full h-1.5">
              <div
                className="bg-bloomberg-orange h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
          </div>
        )}
      </div>
    );
  }

  // --- Error State ---
  if (error && allSymbols.length === 0) {
    return (
      <div className="bg-bloomberg-panel border border-bloomberg-border rounded p-4">
        <div className="flex items-center mb-4">
          <Activity className="h-4 w-4 text-bloomberg-orange mr-2" />
          <span className="text-bloomberg-orange font-bold text-sm">PEER ANALYSIS</span>
        </div>
        <div className="text-center py-8 text-gray-400 text-sm">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-bloomberg-panel border border-bloomberg-border rounded p-3 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <Activity className="h-4 w-4 text-bloomberg-orange mr-1" />
          <span className="text-bloomberg-orange font-bold text-sm">PEER ANALYSIS</span>
          <span className="ml-2 text-gray-500">
            ({peers.filter(p => closesMap[p]).length} peers)
          </span>
        </div>
        {loading && (
          <div className="flex items-center space-x-2">
            <div className="w-20 bg-bloomberg-secondary rounded-full h-1.5">
              <div
                className="bg-bloomberg-orange h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
          </div>
        )}
      </div>

      {/* Section D: Divergence Alert (shown first if diverging) */}
      {divergence && divergence.isDiverging && (
        <div className={`mb-3 px-3 py-2 rounded border text-xs font-bold ${
          divergence.direction === 'OUTPERFORM'
            ? 'bg-green-900/40 border-green-600 text-green-400'
            : 'bg-red-900/40 border-red-600 text-red-400'
        }`}>
          <div className="flex items-center justify-between">
            <span>
              {divergence.direction === 'OUTPERFORM' ? '▲' : '▼'}{' '}
              DIVERGENCE: {symbol} {divergence.direction}ING vs Peer Group
            </span>
            <span className="font-mono">
              {divergence.zScore >= 0 ? '+' : ''}{divergence.zScore.toFixed(1)}σ
            </span>
          </div>
          <div className="mt-1 text-xs font-normal opacity-80">
            {symbol}: {divergence.stockReturn >= 0 ? '+' : ''}{divergence.stockReturn.toFixed(1)}% vs
            Peers Avg: {divergence.peerAvgReturn >= 0 ? '+' : ''}{divergence.peerAvgReturn.toFixed(1)}%
            (20d window)
          </div>
        </div>
      )}

      {/* Section A: Correlation Heatmap */}
      {corrMatrix && corrMatrix.symbols.length >= 2 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 font-bold">CORRELATION</span>
            <div className="flex space-x-1">
              {CORR_PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setCorrPeriod(opt.value)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    corrPeriod === opt.value
                      ? 'bg-bloomberg-orange text-black font-bold'
                      : 'bg-bloomberg-secondary/30 text-gray-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Heatmap Grid */}
          <div className="overflow-x-auto">
            <div
              className="grid gap-px"
              style={{
                gridTemplateColumns: `60px repeat(${corrMatrix.symbols.length}, minmax(48px, 1fr))`
              }}
            >
              {/* Header row */}
              <div className="bg-bloomberg-secondary/20 p-1"></div>
              {corrMatrix.symbols.map(sym => (
                <div
                  key={`h-${sym}`}
                  className="bg-bloomberg-secondary/20 p-1 text-center font-mono text-gray-300 truncate"
                  title={sym}
                >
                  {sym.length > 5 ? sym.slice(0, 5) : sym}
                </div>
              ))}

              {/* Data rows */}
              {corrMatrix.symbols.map((rowSym, ri) => (
                <React.Fragment key={`r-${rowSym}`}>
                  <div className="bg-bloomberg-secondary/20 p-1 font-mono text-bloomberg-orange truncate" title={rowSym}>
                    {rowSym.length > 6 ? rowSym.slice(0, 6) : rowSym}
                  </div>
                  {corrMatrix.symbols.map((colSym, ci) => {
                    const val = corrMatrix.matrix[ri][ci];
                    return (
                      <div
                        key={`c-${rowSym}-${colSym}`}
                        className={`p-1 text-center font-mono ${getCorrBg(val)} ${getCorrColor(val)} ${
                          ri === ci ? 'opacity-50' : ''
                        }`}
                      >
                        {val !== null ? val.toFixed(2) : '---'}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Section B: Relative Performance */}
      {relStrength && allSymbols.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 font-bold">RELATIVE PERFORMANCE</span>
            <div className="flex space-x-1">
              {PERF_PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPerfPeriod(opt.value)}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    perfPeriod === opt.value
                      ? 'bg-bloomberg-orange text-black font-bold'
                      : 'bg-bloomberg-secondary/30 text-gray-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            {allSymbols.map(sym => {
              const val = relStrength[sym]?.[perfPeriod];
              const isMainStock = sym === symbol;
              return (
                <PerformanceBar
                  key={sym}
                  symbol={sym}
                  value={val}
                  maxAbs={maxAbsReturn}
                  highlight={isMainStock}
                />
              );
            })}
            {/* Peer Group Average */}
            {peerAvgReturn !== null && (
              <PerformanceBar
                symbol="PEER AVG"
                value={peerAvgReturn}
                maxAbs={maxAbsReturn}
                highlight={false}
                isPeerAvg
              />
            )}
          </div>
        </div>
      )}

      {/* Section C: Lead/Lag Signals */}
      {leadLagData.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center mb-2">
            <span className="text-gray-400 font-bold">LEAD / LAG SIGNALS</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-bloomberg-border-subtle">
                  <th className="text-left py-1 pr-2 font-normal">PEER</th>
                  <th className="text-right py-1 px-2 font-normal">CORR</th>
                  <th className="text-right py-1 px-2 font-normal">LAG (d)</th>
                  <th className="text-right py-1 pl-2 font-normal">DIRECTION</th>
                </tr>
              </thead>
              <tbody>
                {leadLagData.map(({ peer, bestLag, bestCorr, direction }) => (
                  <tr key={peer} className="border-b border-bloomberg-border-subtle/50">
                    <td className="py-1 pr-2 font-mono text-bloomberg-orange">{peer}</td>
                    <td className="py-1 px-2 text-right font-mono text-white">
                      {bestCorr !== null ? bestCorr.toFixed(2) : '---'}
                    </td>
                    <td className="py-1 px-2 text-right font-mono text-white">
                      {bestLag !== 0 ? Math.abs(bestLag) : '0'}
                    </td>
                    <td className={`py-1 pl-2 text-right font-bold ${
                      direction === 'PEER_LEADS' ? 'text-bloomberg-orange' :
                      direction === 'STOCK_LEADS' ? 'text-green-400' :
                      'text-gray-500'
                    }`}>
                      {direction === 'PEER_LEADS' ? 'PEER LEADS' :
                       direction === 'STOCK_LEADS' ? 'STOCK LEADS' :
                       direction === 'INSUFFICIENT_DATA' ? '---' :
                       'SYNC'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="pt-2 border-t border-bloomberg-border-subtle flex items-center justify-between text-gray-500">
        <div className="flex items-center">
          <Activity className="h-3 w-3 mr-1" />
          <span>Twelve Data (200d daily)</span>
        </div>
        <span>{allSymbols.length} symbols loaded</span>
      </div>
    </div>
  );
};

/**
 * PerformanceBar - Horizontal bar centered at zero for relative performance
 */
const PerformanceBar = ({ symbol, value, maxAbs, highlight, isPeerAvg }) => {
  const isPositive = value !== null && value >= 0;
  const barWidth = value !== null ? (Math.abs(value) / maxAbs) * 50 : 0;

  return (
    <div className={`flex items-center py-1 ${highlight ? 'bg-bloomberg-secondary/30 rounded px-1' : ''} ${isPeerAvg ? 'border-t border-bloomberg-border-subtle pt-1' : ''}`}>
      <div className={`w-16 flex-shrink-0 font-mono truncate ${
        highlight ? 'text-bloomberg-orange font-bold' :
        isPeerAvg ? 'text-gray-300 font-bold' :
        'text-gray-400'
      }`}>
        {symbol}
      </div>

      <div className="flex-1 flex items-center h-4">
        <div className="w-1/2 flex justify-end">
          {!isPositive && value !== null && (
            <div
              className="h-3 bg-red-500/70 rounded-l"
              style={{ width: `${barWidth}%` }}
            ></div>
          )}
        </div>
        <div className="w-px h-4 bg-gray-600 flex-shrink-0"></div>
        <div className="w-1/2 flex justify-start">
          {isPositive && value !== null && (
            <div
              className="h-3 bg-green-500/70 rounded-r"
              style={{ width: `${barWidth}%` }}
            ></div>
          )}
        </div>
      </div>

      <div className={`w-16 text-right font-mono flex-shrink-0 ${
        value === null ? 'text-gray-500' :
        isPositive ? 'text-green-400' :
        'text-red-400'
      }`}>
        {value !== null ? `${value >= 0 ? '+' : ''}${value.toFixed(1)}%` : '---'}
      </div>
    </div>
  );
};

export default PeerAnalysis;
