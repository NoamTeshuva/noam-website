import React, { useState, useEffect } from 'react';
import { TrendingUp, Activity, Globe, Search, RefreshCw, TestTube, AlertTriangle } from 'lucide-react';
import { useSmartPolling, formatters } from '../hooks/useSmartPolling';
import WatchlistSidebar from '../components/WatchlistSidebar';
import PeersPanel from '../components/PeersPanel';
import StatsTile from '../components/StatsTile';
import { useWatchlistStore } from '../store/useWatchlistStore';
import { useToast } from '../components/NotificationToast';
import { createVolumeSpikeMessage } from '../utils/eventDetector';
import { testExhaustion, resetExhaustion, isTDExhausted, getTimeUntilReset } from '../utils/rateLimitManager';
import { getAPICounterState } from '../utils/apiCallCounter';

const BloombergSimple = () => {
  console.log('🏢 BloombergSimple component rendering...');

  const [selectedStock, setSelectedStock] = useState('AAPL');
  const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'analysis'
  const [apiCounterState, setApiCounterState] = useState(getAPICounterState());

  // Get watchlist symbols from store
  const { symbols: watchedSymbols } = useWatchlistStore();

  // Toast notifications
  const { toast } = useToast();

  // Update API counter state every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setApiCounterState(getAPICounterState());
    }, 5000);

    return () => clearInterval(interval);
  }, []);
  
  // Use smart polling for real data
  const { stockData, isLoading, lastUpdated, error, refreshAll } = useSmartPolling(watchedSymbols);

  // Test volume spike notification
  const testVolumeSpike = () => {
    const testEvent = {
      symbol: 'AAPL',
      type: 'volume_spike',
      todayVolume: 75000000,
      averageVolume14d: 25000000,
      ratio: 3.0,
      timestamp: new Date().toISOString()
    };

    const message = createVolumeSpikeMessage(testEvent);
    toast.volumeSpike(message, { duration: 8000 });
    console.log('🧪 Test volume spike notification triggered:', testEvent);
  };

  // Test rate limit exhaustion
  const testRateLimit = () => {
    if (isTDExhausted()) {
      resetExhaustion();
      refreshAll();
      toast.info('✅ Rate limit test mode disabled - resuming normal API calls', { duration: 4000 });
      console.log('✅ Rate limit test mode disabled');
    } else {
      testExhaustion(5); // 5 minutes
      const timeRemaining = getTimeUntilReset();
      toast.warning(`⚠ Rate limit test mode enabled for 5 minutes - will use cached data only`, { duration: 6000 });
      console.log('🧪 Rate limit test mode enabled - all API calls will use cached data');
    }
  };

  // Get real data only - no fallbacks
  const getStockData = (symbol) => {
    const realData = stockData[symbol];

    // Only return data if we have real price data
    if (realData && realData.price) {
      return realData;
    }

    // Return minimal structure for loading/error states
    return {
      symbol,
      name: null,
      price: null,
      change: null,
      changePercent: null,
      volume: null,
      averageVolume: null,
      isLoading: isLoading,
      hasError: realData?.hasError || false,
      error: realData?.error || null
    };
  };
  
  return (
    <div className="min-h-screen bg-bloomberg-primary" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      {/* Watchlist Sidebar */}
      <WatchlistSidebar 
        isOpen={isWatchlistOpen} 
        onToggle={() => setIsWatchlistOpen(!isWatchlistOpen)} 
      />

      {/* Bloomberg Terminal Header */}
      <div className="bg-bloomberg-header border-b border-bloomberg-border">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-6 w-6 text-bloomberg-orange" />
                <h1 className="text-lg font-bold text-bloomberg-orange" style={{ fontSize: '18px' }}>
                  BLOOMBERG TERMINAL
                </h1>
              </div>
              <div className="flex items-center space-x-2 text-gray-300" style={{ fontSize: '12px' }}>
                <Activity className={`h-3 w-3 ${error ? 'text-bloomberg-status-error' : 'text-bloomberg-status-connected'}`} />
                <span>{error ? 'ERROR' : 'LIVE'}</span>
                {lastUpdated && (
                  <span className="text-gray-500">
                    {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-gray-300" style={{ fontSize: '12px' }}>
                <span className={`font-mono ${
                  apiCounterState.isAtLimit ? 'text-bloomberg-status-error' :
                  apiCounterState.isNearLimit ? 'text-yellow-500' :
                  'text-gray-300'
                }`}>
                  API: {apiCounterState.count}/{apiCounterState.limit}
                </span>
                {apiCounterState.isNearLimit && (
                  <span className="text-yellow-500">⚠</span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4 text-gray-300" style={{ fontSize: '12px' }}>
              <button 
                onClick={() => setIsWatchlistOpen(!isWatchlistOpen)}
                className="flex items-center space-x-1 hover:text-white transition-colors"
                title="Open Watchlist"
              >
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                <span>WATCHLIST ({watchedSymbols.length})</span>
              </button>
              <button 
                onClick={refreshAll}
                className="flex items-center space-x-1 hover:text-white transition-colors"
                disabled={isLoading}
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>REFRESH</span>
              </button>
              <button
                onClick={testVolumeSpike}
                className="flex items-center space-x-1 hover:text-bloomberg-orange transition-colors"
                title="Test Volume Spike Notification"
              >
                <TestTube className="h-3 w-3" />
                <span>TEST</span>
              </button>
              <button
                onClick={testRateLimit}
                className={`flex items-center space-x-1 transition-colors ${
                  isTDExhausted() ? 'text-yellow-500 hover:text-yellow-400' : 'hover:text-yellow-500'
                }`}
                title={isTDExhausted() ? 'Rate Limit Test Active - Click to Disable' : 'Test Rate Limit Mode'}
              >
                <AlertTriangle className="h-3 w-3" />
                <span>{isTDExhausted() ? 'CACHED' : 'LIMIT'}</span>
              </button>
              <div className="flex items-center space-x-2">
                <Globe className="h-3 w-3" />
                <span>US MARKETS</span>
                <span className="text-bloomberg-status-connected">●</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="flex items-center bg-bloomberg-panel border border-bloomberg-border rounded p-2 max-w-md">
            <Search className="h-4 w-4 text-gray-400 mr-2" />
            <input 
              type="text" 
              placeholder="Enter stock symbol..."
              className="bg-transparent text-white flex-1 outline-none" 
              style={{ fontSize: '12px' }}
            />
          </div>
        </div>

        {/* Stock Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {watchedSymbols.map((symbol) => {
            const data = getStockData(symbol);
            const isLoading = data.isLoading;
            const isPositive = data?.change >= 0;
            const isNeutral = data?.change === 0;
            const isSelected = symbol === selectedStock;
            
            return (
              <div 
                key={symbol} 
                onClick={() => setSelectedStock(symbol)}
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? 'bg-bloomberg-selected border-bloomberg-selected' 
                    : 'bg-bloomberg-panel hover:bg-bloomberg-secondary border-bloomberg-border'
                } border-l-4 border-l-bloomberg-orange rounded-sm p-4`}
                style={{ minHeight: '160px' }}
              >
                {isLoading ? (
                  /* Loading State */
                  <div className="animate-pulse">
                    <div className="h-4 bg-bloomberg-secondary rounded w-16 mb-2"></div>
                    <div className="h-6 bg-bloomberg-secondary rounded w-24 mb-3"></div>
                    <div className="h-4 bg-bloomberg-secondary rounded w-20 mb-2"></div>
                    <div className="space-y-1">
                      <div className="h-3 bg-bloomberg-secondary rounded w-full"></div>
                      <div className="h-3 bg-bloomberg-secondary rounded w-3/4"></div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-bloomberg-orange" style={{ fontSize: '14px' }}>
                          {symbol}
                        </h3>
                        <p className="text-gray-300 text-xs truncate" style={{ fontSize: '10px' }}>
                          {data.name || '---'}
                        </p>
                        {data.exchange && (
                          <p className="text-gray-500 text-xs" style={{ fontSize: '8px' }}>
                            {data.exchange}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="w-2 h-2 rounded-full bg-bloomberg-metrics-sales mb-1"></div>
                        {data.lastUpdated && (
                          <span className="text-gray-500 text-xs" style={{ fontSize: '8px' }}>
                            {data.lastUpdated.toLocaleTimeString().slice(0, 5)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-3">
                      <div className="text-white font-bold font-mono" style={{ fontSize: '16px' }}>
                        {formatters.price(data.price)}
                      </div>
                      {data.change !== undefined && (
                        <div 
                          className={`text-sm px-2 py-1 rounded-sm inline-block ${
                            isNeutral 
                              ? 'text-bloomberg-data-neutral bg-bloomberg-data-neutral/20' 
                              : isPositive 
                                ? 'text-white bg-bloomberg-data-positive' 
                                : 'text-white bg-bloomberg-data-negative'
                          }`}
                          style={{ fontSize: '11px' }}
                        >
                          {formatters.change(data.change, data.changePercent)}
                        </div>
                      )}
                    </div>

                    {/* Metrics */}
                    <div className="space-y-1" style={{ fontSize: '9px' }}>
                      <div className="flex justify-between text-gray-300">
                        <span>High:</span>
                        <span className="text-white font-mono">{formatters.price(data.high)}</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Low:</span>
                        <span className="text-white font-mono">{formatters.price(data.low)}</span>
                      </div>
                      <div className="flex justify-between text-gray-300">
                        <span>Volume:</span>
                        <span className="text-white font-mono">{formatters.volume(data.volume)}</span>
                      </div>
                      {data.marketCap && (
                        <div className="flex justify-between text-gray-300">
                          <span>Market Cap:</span>
                          <span className="text-white font-mono">{formatters.marketCap(data.marketCap * 1000000)}</span>
                        </div>
                      )}
                      {data.pe && (
                        <div className="flex justify-between text-gray-300">
                          <span>P/E:</span>
                          <span className="text-white font-mono">{typeof data.pe === 'number' ? data.pe.toFixed(1) : '---'}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Stock Details */}
        {selectedStock && getStockData(selectedStock) && (
          <div className="mt-8 bg-bloomberg-panel border border-bloomberg-border rounded p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-bloomberg-orange font-bold" style={{ fontSize: '18px' }}>
                {selectedStock} {getStockData(selectedStock).exchange || 'US'} Equity
              </h2>
              <div className="flex space-x-4" style={{ fontSize: '11px' }}>
                <span
                  onClick={() => setActiveTab('overview')}
                  className={`pb-1 font-bold cursor-pointer transition-colors ${
                    activeTab === 'overview'
                      ? 'text-bloomberg-activeTab border-b-2 border-bloomberg-activeTab'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Overview
                </span>
                <span className="text-gray-400 hover:text-white cursor-pointer">News</span>
                <span className="text-gray-400 hover:text-white cursor-pointer">Chart</span>
                <span
                  onClick={() => setActiveTab('analysis')}
                  className={`pb-1 font-bold cursor-pointer transition-colors ${
                    activeTab === 'analysis'
                      ? 'text-bloomberg-activeTab border-b-2 border-bloomberg-activeTab'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Analysis
                </span>
              </div>
            </div>

            {/* Overview Tab Content */}
            {activeTab === 'overview' && (
            <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-gray-300 font-bold mb-2" style={{ fontSize: '13px' }}>
                  Price & Volume
                </h3>
                <div className="space-y-1" style={{ fontSize: '12px' }}>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Last Price:</span>
                    <span className="text-white font-mono">{formatters.price(getStockData(selectedStock).price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Open:</span>
                    <span className="text-white font-mono">{formatters.price(getStockData(selectedStock).open)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">High:</span>
                    <span className="text-white font-mono">{formatters.price(getStockData(selectedStock).high)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Low:</span>
                    <span className="text-white font-mono">{formatters.price(getStockData(selectedStock).low)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Prev Close:</span>
                    <span className="text-white font-mono">{formatters.price(getStockData(selectedStock).previousClose)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Volume:</span>
                    <span className="text-white font-mono">{formatters.volume(getStockData(selectedStock).volume)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Volume:</span>
                    <span className="text-white font-mono">{formatters.volume(getStockData(selectedStock).averageVolume)}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-gray-300 font-bold mb-2" style={{ fontSize: '13px' }}>
                  Valuation
                </h3>
                <div className="space-y-1" style={{ fontSize: '12px' }}>
                  {getStockData(selectedStock).marketCap && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Market Cap:</span>
                      <span className="text-white font-mono">{formatters.marketCap(getStockData(selectedStock).marketCap * 1000000)}</span>
                    </div>
                  )}
                  {getStockData(selectedStock).pe && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">P/E Ratio:</span>
                      <span className="text-white font-mono">{typeof getStockData(selectedStock).pe === 'number' ? getStockData(selectedStock).pe.toFixed(2) : '---'}</span>
                    </div>
                  )}
                  {getStockData(selectedStock).eps && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">EPS:</span>
                      <span className="text-white font-mono">{typeof getStockData(selectedStock).eps === 'number' ? `$${getStockData(selectedStock).eps.toFixed(2)}` : '---'}</span>
                    </div>
                  )}
                  {getStockData(selectedStock).beta && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Beta:</span>
                      <span className="text-white font-mono">{typeof getStockData(selectedStock).beta === 'number' ? getStockData(selectedStock).beta.toFixed(2) : '---'}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-gray-300 font-bold mb-2" style={{ fontSize: '13px' }}>
                  Performance
                </h3>
                <div className="space-y-1" style={{ fontSize: '12px' }}>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Day Change:</span>
                    <span className={`font-mono ${
                      getStockData(selectedStock).change >= 0 ? 'text-bloomberg-data-positive' : 'text-bloomberg-data-negative'
                    }`}>
                      {formatters.change(getStockData(selectedStock).change, getStockData(selectedStock).changePercent)}
                    </span>
                  </div>
                  {getStockData(selectedStock).week52High && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">52W High:</span>
                      <span className="text-white font-mono">{formatters.price(getStockData(selectedStock).week52High)}</span>
                    </div>
                  )}
                  {getStockData(selectedStock).week52Low && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">52W Low:</span>
                      <span className="text-white font-mono">{formatters.price(getStockData(selectedStock).week52Low)}</span>
                    </div>
                  )}
                  {getStockData(selectedStock).dividendYield && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Dividend Yield:</span>
                      <span className="text-white font-mono">{typeof getStockData(selectedStock).dividendYield === 'number' ? `${(getStockData(selectedStock).dividendYield * 100).toFixed(2)}%` : '---'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Company Info */}
            {(getStockData(selectedStock).industry || getStockData(selectedStock).sector) && (
              <div className="mt-6 pt-4 border-t border-bloomberg-border-subtle">
                <h3 className="text-gray-300 font-bold mb-2" style={{ fontSize: '13px' }}>
                  Company Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ fontSize: '12px' }}>
                  {getStockData(selectedStock).industry && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Industry:</span>
                      <span className="text-white">{getStockData(selectedStock).industry}</span>
                    </div>
                  )}
                  {getStockData(selectedStock).sector && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Sector:</span>
                      <span className="text-white">{getStockData(selectedStock).sector}</span>
                    </div>
                  )}
                  {getStockData(selectedStock).country && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Country:</span>
                      <span className="text-white">{getStockData(selectedStock).country}</span>
                    </div>
                  )}
                  {getStockData(selectedStock).currency && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Currency:</span>
                      <span className="text-white">{getStockData(selectedStock).currency}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Peers Panel */}
            <div className="mt-6 pt-4 border-t border-bloomberg-border-subtle">
              <PeersPanel symbol={selectedStock} />
            </div>

            {/* Data Source Indicator */}
            <div className="mt-4 pt-2 border-t border-bloomberg-border-subtle">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    getStockData(selectedStock).usingCachedData ? 'bg-yellow-500' :
                    getStockData(selectedStock).isRealData ? 'bg-bloomberg-status-connected' :
                    getStockData(selectedStock).hasError ? 'bg-red-500' : 'bg-yellow-500'
                  }`}></div>
                  <span className="text-gray-400">
                    {getStockData(selectedStock).usingCachedData ? 'Cached Data (Rate Limit)' :
                     getStockData(selectedStock).isRealData ? 'Live Data (Twelve Data)' :
                     getStockData(selectedStock).hasError ? 'Error - No Data' : 'Loading...'}
                  </span>
                </div>
                <span className="text-gray-500">
                  {getStockData(selectedStock).lastUpdated ?
                    `Updated: ${getStockData(selectedStock).lastUpdated.toLocaleTimeString()}` :
                    '---'}
                </span>
              </div>
              {getStockData(selectedStock).usingCachedData && getStockData(selectedStock).rateLimitMessage && (
                <div className="mt-2 text-xs text-yellow-500">
                  ⚠ {getStockData(selectedStock).rateLimitMessage}
                </div>
              )}
            </div>
          </>
        )}

        {/* Analysis Tab Content */}
        {activeTab === 'analysis' && (
          <div>
            <StatsTile symbol={selectedStock} />
          </div>
        )}
      </div>
        )}

      {/* Status Indicator */}
      <div className="fixed bottom-4 right-4 bg-bloomberg-status-connected text-black px-3 py-2 rounded text-xs font-bold">
        Bloomberg Terminal ✓ Online
      </div>
      </div>
    </div>
  );
};

export default BloombergSimple;