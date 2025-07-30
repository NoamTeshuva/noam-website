import React, { useState, useEffect } from 'react';
import useLivePrice from '../hooks/useLivePrice';
// import { alphaVantageAPI, formatMarketCap, formatVolume, withErrorHandling } from '../utils/api';
import { TrendingUp, TrendingDown, Minus, Volume2, Building2, Target } from 'lucide-react';

export default function QuoteCard({ symbol, isPrimary = false }) {
  console.log('📊 QuoteCard rendering for:', symbol, 'isPrimary:', isPrimary);
  
  try {
    const livePrice = useLivePrice(symbol);
    const [stockData, setStockData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(new Date());

  // Mock data for demonstration
  const mockData = {
    'AAPL': { name: 'Apple Inc.', price: 185.25, change: 2.45, changePercent: 1.34, volume: 45200000, marketCap: 2800000000000, pe: 28.5, sector: 'Technology', exchange: 'NASDAQ' },
    'MSFT': { name: 'Microsoft Corporation', price: 378.85, change: -1.25, changePercent: -0.33, volume: 22100000, marketCap: 2810000000000, pe: 32.1, sector: 'Technology', exchange: 'NASDAQ' },
    'GOOGL': { name: 'Alphabet Inc.', price: 142.75, change: 0.85, changePercent: 0.60, volume: 18500000, marketCap: 1750000000000, pe: 25.8, sector: 'Technology', exchange: 'NASDAQ' },
    'TSLA': { name: 'Tesla Inc.', price: 208.45, change: 5.25, changePercent: 2.58, volume: 95200000, marketCap: 665000000000, pe: 45.2, sector: 'Consumer Cyclical', exchange: 'NASDAQ' },
    'NVDA': { name: 'NVIDIA Corporation', price: 118.75, change: 3.15, changePercent: 2.73, volume: 78500000, marketCap: 2920000000000, pe: 58.3, sector: 'Technology', exchange: 'NASDAQ' }
  };

  const formatMarketCap = (marketCap) => {
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(1)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(1)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(1)}M`;
    return `$${marketCap.toLocaleString()}`;
  };

  const formatVolume = (volume) => {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
    return volume.toLocaleString();
  };

  useEffect(() => {
    const fetchStockData = async () => {
      setIsLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const data = mockData[symbol] || {
        name: `${symbol} Inc.`,
        price: Math.random() * 200 + 50,
        change: (Math.random() - 0.5) * 10,
        changePercent: (Math.random() - 0.5) * 5,
        volume: Math.floor(Math.random() * 50000000) + 1000000,
        marketCap: Math.floor(Math.random() * 1000000000000) + 100000000000,
        pe: Math.random() * 50 + 10,
        sector: 'Technology',
        exchange: 'NASDAQ'
      };

      setStockData({
        symbol: symbol,
        ...data,
        price: livePrice || data.price
      });
      
      setIsLoading(false);
      setLastUpdated(new Date());
    };

    fetchStockData();
  }, [symbol, livePrice]);

  // Update price from live WebSocket data
  useEffect(() => {
    if (livePrice && stockData) {
      setStockData(prev => ({
        ...prev,
        price: livePrice
      }));
      setLastUpdated(new Date());
    }
  }, [livePrice, stockData]);

  if (isLoading) {
    return (
      <div className={`bg-bloomberg-panel border-l-4 ${
        isPrimary ? 'border-bloomberg-orange animate-pulse' : 'border-bloomberg-border-subtle'
      } rounded-terminal p-4 min-h-80`}>
        <div className="animate-pulse">
          <div className="h-4 bg-bloomberg-secondary rounded w-16 mb-2"></div>
          <div className="h-8 bg-bloomberg-secondary rounded w-24 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-bloomberg-secondary rounded w-full"></div>
            <div className="h-3 bg-bloomberg-secondary rounded w-3/4"></div>
            <div className="h-3 bg-bloomberg-secondary rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stockData) {
    return (
      <div className="bg-bloomberg-panel border-l-4 border-bloomberg-status-error rounded-terminal p-4 min-h-80">
        <div className="text-center">
          <h3 className="text-bloomberg-status-error font-bold text-terminal-lg mb-2">{symbol}</h3>
          <p className="text-bloomberg-text-muted text-terminal-sm">
            Failed to load data
          </p>
        </div>
      </div>
    );
  }

  const { price, change, changePercent, volume, marketCap, pe, name, sector, exchange } = stockData;
  const isPositive = change >= 0;
  const isNeutral = change === 0;

  const getPriceIcon = () => {
    if (isNeutral) return <Minus className="h-4 w-4" />;
    return isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  const getPriceColor = () => {
    if (isNeutral) return 'text-bloomberg-data-neutral';
    return isPositive ? 'text-bloomberg-data-positive' : 'text-bloomberg-data-negative';
  };

  return (
    <div className={`bg-bloomberg-panel border-l-4 ${
      isPrimary 
        ? 'border-bloomberg-orange shadow-lg shadow-bloomberg-orange/20' 
        : 'border-bloomberg-border-subtle hover:border-bloomberg-border'
    } rounded-terminal p-4 transition-all duration-200 hover:bg-bloomberg-secondary min-h-80`}>
      
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-bloomberg-orange font-bold text-terminal-lg font-bloomberg-mono">
              {symbol}
            </h3>
            {isPrimary && (
              <span className="text-bloomberg-orange text-terminal-xs bg-bloomberg-orange/20 px-2 py-1 rounded-terminal">
                PRIMARY
              </span>
            )}
          </div>
          <p className="text-bloomberg-text-secondary text-terminal-xs truncate max-w-full">
            {name}
          </p>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-bloomberg-text-muted text-terminal-xs">{exchange}</span>
            <span className="text-bloomberg-text-muted">•</span>
            <span className="text-bloomberg-text-muted text-terminal-xs">{sector}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-bloomberg-text-muted text-terminal-xs">
            {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Price Section */}
      <div className="mb-4">
        <div className="flex items-baseline space-x-2 mb-2">
          <span className="text-bloomberg-text-primary font-bloomberg-mono text-terminal-2xl font-bold">
            ${price.toFixed(2)}
          </span>
          <div className={`flex items-center space-x-1 ${getPriceColor()}`}>
            {getPriceIcon()}
          </div>
        </div>
        <div className={`flex items-center space-x-2 ${getPriceColor()}`}>
          <span className="font-bloomberg-mono text-terminal-sm">
            {isPositive ? '+' : ''}{change.toFixed(2)}
          </span>
          <span className="font-bloomberg-mono text-terminal-sm">
            ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="space-y-3">
        {/* Volume */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Volume2 className="h-3 w-3 text-bloomberg-data-volume" />
            <span className="text-bloomberg-text-muted text-terminal-xs">Volume</span>
          </div>
          <span className="text-bloomberg-text-primary font-bloomberg-mono text-terminal-sm">
            {formatVolume(volume)}
          </span>
        </div>

        {/* Market Cap */}
        {marketCap > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Building2 className="h-3 w-3 text-bloomberg-text-muted" />
              <span className="text-bloomberg-text-muted text-terminal-xs">Market Cap</span>
            </div>
            <span className="text-bloomberg-text-primary font-bloomberg-mono text-terminal-sm">
              {formatMarketCap(marketCap)}
            </span>
          </div>
        )}

        {/* P/E Ratio */}
        {pe && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="h-3 w-3 text-bloomberg-text-muted" />
              <span className="text-bloomberg-text-muted text-terminal-xs">P/E Ratio</span>
            </div>
            <span className="text-bloomberg-text-primary font-bloomberg-mono text-terminal-sm">
              {pe.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Live Data Indicator */}
      <div className="mt-4 pt-3 border-t border-bloomberg-border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-bloomberg-status-connected rounded-full animate-pulse"></div>
            <span className="text-bloomberg-text-muted text-terminal-xs">LIVE</span>
          </div>
          <span className="text-bloomberg-text-muted text-terminal-xs font-bloomberg-mono">
            {symbol}
          </span>
        </div>
      </div>
    </div>
  );
  } catch (error) {
    console.error('📊 QuoteCard error for', symbol, ':', error);
    return (
      <div className="bg-bloomberg-panel border-l-4 border-bloomberg-status-error rounded-terminal p-4 min-h-80">
        <div className="text-center">
          <h3 className="text-bloomberg-status-error font-bold text-terminal-lg mb-2">{symbol}</h3>
          <p className="text-bloomberg-text-muted text-terminal-sm">
            Card Error: {error.message}
          </p>
        </div>
      </div>
    );
  }
} 