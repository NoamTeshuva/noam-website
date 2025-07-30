import React, { useState, useEffect } from 'react';
import QuoteCard from '../components/QuoteCard';
import StockSearchWidget from '../components/StockSearchWidget';
// import { finnhubAPI, withErrorHandling } from '../utils/api';
import { TrendingUp, Activity, Globe } from 'lucide-react';

const BloombergWannabe = () => {
  console.log('🏢 BloombergWannabe component rendering...');
  
  const [selectedStock, setSelectedStock] = useState(null);
  const [peerStocks, setPeerStocks] = useState([]);
  const [allStocks, setAllStocks] = useState(['AAPL', 'MSFT']); // Default stocks
  const [isLoadingPeers, setIsLoadingPeers] = useState(false);

  console.log('🏢 BloombergWannabe state:', { selectedStock, peerStocks, allStocks, isLoadingPeers });

  const handleStockSelect = async (stock) => {
    setSelectedStock(stock);
    setIsLoadingPeers(true);
    
    // Mock peer companies for now
    const mockPeers = {
      'AAPL': ['MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA'],
      'MSFT': ['AAPL', 'GOOGL', 'AMZN', 'META', 'NVDA'],
      'TSLA': ['F', 'GM', 'RIVN', 'LCID', 'NIO'],
      'NVDA': ['AMD', 'INTC', 'QCOM', 'AVGO', 'MU'],
      'META': ['GOOGL', 'SNAP', 'TWTR', 'PINS', 'SPOT']
    };
    
    const peers = mockPeers[stock.symbol] || ['AAPL', 'MSFT', 'GOOGL', 'AMZN'];
    setPeerStocks(peers);
    
    // Combine selected stock with peers (limit to 6 total for clean grid)
    const combinedStocks = [stock.symbol, ...peers.slice(0, 5)];
    setAllStocks(combinedStocks);
    
    setTimeout(() => setIsLoadingPeers(false), 500); // Simulate API delay
  };

  try {
    console.log('🏢 About to render Bloomberg component...');
    
    return (
      <div className="min-h-screen bg-bloomberg-primary">
        {/* Debug indicator */}
        <div className="fixed top-0 right-0 bg-green-500 text-black px-2 py-1 text-xs z-50">
          Bloomberg Loaded ✓
        </div>
        
        {/* Bloomberg Terminal Header */}
        <div className="bg-bloomberg-header border-b border-bloomberg-border">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-8 w-8 text-bloomberg-orange" />
                  <h1 className="text-2xl font-bold text-bloomberg-orange font-bloomberg-sans">
                    BLOOMBERG WANNABE
                  </h1>
                </div>
                <div className="flex items-center space-x-2 text-bloomberg-text-muted text-terminal-sm">
                  <Activity className="h-4 w-4 text-bloomberg-status-connected" />
                  <span>LIVE DATA</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-bloomberg-text-muted text-terminal-sm">
                <Globe className="h-4 w-4" />
                <span>US MARKETS</span>
                <span className="text-bloomberg-status-connected">●</span>
              </div>
            </div>
          </div>
        </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search Section */}
        <div className="mb-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="text-center">
              <h2 className="text-bloomberg-text-primary text-terminal-xl font-bloomberg-sans mb-2">
                Stock Discovery & Live Monitoring
              </h2>
              <p className="text-bloomberg-text-muted text-terminal-sm">
                Search for any stock to discover competitors and monitor real-time data
              </p>
            </div>
            <StockSearchWidget onStockSelect={handleStockSelect} />
          </div>
        </div>

        {/* Selected Stock Info */}
        {selectedStock && (
          <div className="mb-6 bg-bloomberg-panel border-l-4 border-bloomberg-orange rounded-terminal p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-bloomberg-orange font-bold text-terminal-lg">
                  Monitoring: {selectedStock.symbol}
                </h3>
                <p className="text-bloomberg-text-secondary text-terminal-sm">
                  {selectedStock.name}
                </p>
              </div>
              {isLoadingPeers && (
                <div className="text-bloomberg-text-muted text-terminal-sm">
                  Loading peer companies...
                </div>
              )}
            </div>
            {peerStocks.length > 0 && (
              <div className="mt-3">
                <p className="text-bloomberg-text-muted text-terminal-xs mb-2">
                  PEER COMPANIES:
                </p>
                <div className="flex flex-wrap gap-2">
                  {peerStocks.map(peer => (
                    <span 
                      key={peer}
                      className="bg-bloomberg-secondary text-bloomberg-text-primary 
                               px-2 py-1 rounded-terminal text-terminal-xs font-bloomberg-mono"
                    >
                      {peer}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quote Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allStocks.map(symbol => (
            <QuoteCard 
              key={symbol} 
              symbol={symbol}
              isPrimary={symbol === selectedStock?.symbol}
            />
          ))}
        </div>

        {/* Instructions for new users */}
        {!selectedStock && (
          <div className="mt-12 text-center">
            <div className="bg-bloomberg-panel border border-bloomberg-border rounded-terminal-lg p-8 max-w-2xl mx-auto">
              <h3 className="text-bloomberg-orange text-terminal-lg font-bold mb-4">
                Get Started
              </h3>
              <div className="space-y-3 text-bloomberg-text-secondary text-terminal-sm">
                <p>
                  <span className="text-bloomberg-orange">1.</span> Search for any stock symbol or company name above
                </p>
                <p>
                  <span className="text-bloomberg-orange">2.</span> We'll automatically find 5 competitor companies
                </p>
                <p>
                  <span className="text-bloomberg-orange">3.</span> Monitor real-time prices, volume, and key metrics
                </p>
                <p>
                  <span className="text-bloomberg-orange">4.</span> Get alerted when trading volume spikes above 2x average
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  } catch (error) {
    console.error('🚨 Bloomberg component error:', error);
    return (
      <div className="min-h-screen bg-bloomberg-primary flex items-center justify-center">
        <div className="bg-bloomberg-panel border border-bloomberg-status-error rounded-terminal p-8">
          <h1 className="text-bloomberg-status-error text-xl font-bold mb-4">
            Bloomberg Terminal Error
          </h1>
          <p className="text-bloomberg-text-primary mb-4">
            Component failed to render: {error.message}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-bloomberg-orange text-bloomberg-primary px-4 py-2 rounded-terminal"
          >
            Reload Terminal
          </button>
        </div>
      </div>
    );
  }
};

export default BloombergWannabe; 