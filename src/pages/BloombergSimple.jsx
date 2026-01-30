import React, { useState, useEffect } from 'react';
import { TrendingUp, Activity, Globe, Search, RefreshCw, TestTube, AlertTriangle, LogOut, Menu, X } from 'lucide-react';
import { useSmartPolling, formatters } from '../hooks/useSmartPolling';
import WatchlistSidebar from '../components/WatchlistSidebar';
import PeersPanel from '../components/PeersPanel';
import StatsTile from '../components/StatsTile';
import { useWatchlistStore } from '../store/useWatchlistStore';
import { useToast } from '../components/NotificationToast';
import { createVolumeSpikeMessage } from '../utils/eventDetector';
import { testExhaustion, resetExhaustion, isTDExhausted, getTimeUntilReset } from '../utils/rateLimitManager';
import { getAPICounterState } from '../utils/apiCallCounter';
import { useAuth } from '../App';

const BloombergSimple = () => {
  console.log('🏢 BloombergSimple component rendering...');

  const [selectedStock, setSelectedStock] = useState('AAPL');
  const [isWatchlistOpen, setIsWatchlistOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'analysis'
  const [apiCounterState, setApiCounterState] = useState(getAPICounterState());
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get watchlist symbols from store
  const { symbols: watchedSymbols } = useWatchlistStore();

  // Toast notifications
  const { toast } = useToast();

  // Auth context for logout
  const auth = useAuth();

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
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            {/* Left side - Logo and status */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-bloomberg-orange" />
                <h1 className="text-sm sm:text-lg font-bold text-bloomberg-orange">
                  <span className="hidden sm:inline">BLOOMBERG TERMINAL</span>
                  <span className="sm:hidden">TERMINAL</span>
                </h1>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2 text-gray-300 text-xs">
                <Activity className={`h-3 w-3 ${error ? 'text-bloomberg-status-error' : 'text-bloomberg-status-connected'}`} />
                <span className="hidden xs:inline">{error ? 'ERROR' : 'LIVE'}</span>
                {lastUpdated && (
                  <span className="text-gray-500 hidden md:inline">
                    {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>
              {/* API counter - visible on tablet+ */}
              <div className="hidden sm:flex items-center space-x-2 text-gray-300 text-xs">
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

            {/* Right side - Desktop buttons */}
            <div className="hidden md:flex items-center space-x-4 text-gray-300 text-xs">
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
              <button
                onClick={() => auth?.logout()}
                className="flex items-center space-x-1 hover:text-bloomberg-status-error transition-colors ml-4"
                title="Logout"
              >
                <LogOut className="h-3 w-3" />
                <span>LOGOUT</span>
              </button>
            </div>

            {/* Mobile menu button and quick actions */}
            <div className="flex md:hidden items-center space-x-2">
              <button
                onClick={() => setIsWatchlistOpen(!isWatchlistOpen)}
                className="p-2 text-gray-300 hover:text-white transition-colors"
                title="Watchlist"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={refreshAll}
                className="p-2 text-gray-300 hover:text-white transition-colors"
                disabled={isLoading}
                title="Refresh"
              >
                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-gray-300 hover:text-white transition-colors"
                title="Menu"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile dropdown menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden mt-2 pt-2 border-t border-bloomberg-border">
              <div className="flex flex-col space-y-2 text-gray-300 text-sm">
                {/* API Counter for mobile */}
                <div className="flex items-center justify-between py-2 px-2 bg-bloomberg-panel rounded">
                  <span className="text-gray-400">API Calls</span>
                  <span className={`font-mono ${
                    apiCounterState.isAtLimit ? 'text-bloomberg-status-error' :
                    apiCounterState.isNearLimit ? 'text-yellow-500' :
                    'text-gray-300'
                  }`}>
                    {apiCounterState.count}/{apiCounterState.limit}
                  </span>
                </div>
                <button
                  onClick={() => { testVolumeSpike(); setIsMobileMenuOpen(false); }}
                  className="flex items-center space-x-2 py-2 px-2 hover:bg-bloomberg-panel rounded transition-colors"
                >
                  <TestTube className="h-4 w-4" />
                  <span>Test Notification</span>
                </button>
                <button
                  onClick={() => { testRateLimit(); setIsMobileMenuOpen(false); }}
                  className={`flex items-center space-x-2 py-2 px-2 rounded transition-colors ${
                    isTDExhausted() ? 'text-yellow-500' : 'hover:bg-bloomberg-panel'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>{isTDExhausted() ? 'Disable Cache Mode' : 'Test Rate Limit'}</span>
                </button>
                <div className="flex items-center space-x-2 py-2 px-2">
                  <Globe className="h-4 w-4" />
                  <span>US MARKETS</span>
                  <span className="text-bloomberg-status-connected">●</span>
                </div>
                <button
                  onClick={() => { auth?.logout(); setIsMobileMenuOpen(false); }}
                  className="flex items-center space-x-2 py-2 px-2 hover:bg-bloomberg-panel rounded transition-colors text-bloomberg-status-error"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        {/* Search Bar */}
        <div className="mb-4 sm:mb-6 relative">
          <div className="flex items-center bg-bloomberg-panel border border-bloomberg-border rounded p-2 w-full sm:max-w-md">
            <Search className="h-4 w-4 text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search watchlist symbols..."
              className="bg-transparent text-white flex-1 outline-none"
              style={{ fontSize: '12px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery) {
                  // Find matching symbol in watchlist
                  const match = watchedSymbols.find(s =>
                    s.toUpperCase().startsWith(searchQuery.toUpperCase())
                  );
                  if (match) {
                    setSelectedStock(match);
                    setSearchQuery('');
                  }
                }
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-gray-400 hover:text-white ml-2"
                style={{ fontSize: '12px' }}
              >
                ✕
              </button>
            )}
          </div>
          {/* Search suggestions dropdown */}
          {searchQuery && (
            <div className="absolute top-full left-0 mt-1 bg-bloomberg-panel border border-bloomberg-border rounded max-w-md w-full z-10">
              {watchedSymbols
                .filter(s => s.toUpperCase().includes(searchQuery.toUpperCase()))
                .slice(0, 5)
                .map(symbol => (
                  <div
                    key={symbol}
                    className="px-3 py-2 hover:bg-bloomberg-secondary cursor-pointer text-white"
                    style={{ fontSize: '12px' }}
                    onClick={() => {
                      setSelectedStock(symbol);
                      setSearchQuery('');
                    }}
                  >
                    <span className="text-bloomberg-orange font-bold">{symbol}</span>
                    {stockData[symbol]?.name && (
                      <span className="text-gray-400 ml-2">{stockData[symbol].name}</span>
                    )}
                  </div>
                ))}
              {watchedSymbols.filter(s => s.toUpperCase().includes(searchQuery.toUpperCase())).length === 0 && (
                <div className="px-3 py-2 text-gray-400" style={{ fontSize: '12px' }}>
                  No matching symbols in watchlist
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stock Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                } border-l-4 border-l-bloomberg-orange rounded-sm p-3 sm:p-4 min-h-[140px] sm:min-h-[160px]`}
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
                          <span className="text-white font-mono">{formatters.marketCap(data.marketCap)}</span>
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
        {selectedStock && getStockData(selectedStock).price && (
          <div className="mt-6 sm:mt-8 bg-bloomberg-panel border border-bloomberg-border rounded p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
              <h2 className="text-bloomberg-orange font-bold text-base sm:text-lg">
                {selectedStock} {getStockData(selectedStock).exchange || 'US'} Equity
              </h2>
              <div className="flex space-x-3 sm:space-x-4 text-xs overflow-x-auto pb-1">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                      <span className="text-white font-mono">{formatters.marketCap(getStockData(selectedStock).marketCap)}</span>
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
              <div className="mt-4 sm:mt-6 pt-4 border-t border-bloomberg-border-subtle">
                <h3 className="text-gray-300 font-bold mb-2 text-sm">
                  Company Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
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
            <div className="mt-4 sm:mt-6 pt-4 border-t border-bloomberg-border-subtle">
              <PeersPanel symbol={selectedStock} />
            </div>

            {/* Data Source Indicator */}
            <div className="mt-4 pt-2 border-t border-bloomberg-border-subtle">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs gap-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    getStockData(selectedStock).usingCachedData ? 'bg-yellow-500' :
                    getStockData(selectedStock).isYahooFinance ? 'bg-blue-500' :
                    getStockData(selectedStock).isRealData ? 'bg-bloomberg-status-connected' :
                    getStockData(selectedStock).hasError ? 'bg-red-500' : 'bg-yellow-500'
                  }`}></div>
                  <span className="text-gray-400">
                    {getStockData(selectedStock).usingCachedData ? 'Cached Data (Rate Limit)' :
                     getStockData(selectedStock).isYahooFinance ? 'Market Closed (Yahoo Finance)' :
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
                  {getStockData(selectedStock).rateLimitMessage}
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
      <div className="fixed bottom-2 right-2 sm:bottom-4 sm:right-4 bg-bloomberg-status-connected text-black px-2 py-1 sm:px-3 sm:py-2 rounded text-xs font-bold">
        <span className="hidden sm:inline">Bloomberg Terminal ✓ Online</span>
        <span className="sm:hidden">✓ Online</span>
      </div>
      </div>
    </div>
  );
};

export default BloombergSimple;