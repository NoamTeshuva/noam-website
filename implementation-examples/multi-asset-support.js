// Multi-asset support: Stocks, Crypto, Indices, Forex
import React, { useState, useMemo } from 'react';
import { useMarketStore, useWatchlistStore } from '../stores';

// Asset type definitions
export const ASSET_TYPES = {
  STOCK: 'stock',
  CRYPTO: 'crypto', 
  INDEX: 'index',
  FOREX: 'forex',
  COMMODITY: 'commodity'
};

// Asset configuration
const ASSET_CONFIG = {
  [ASSET_TYPES.STOCK]: {
    name: 'Stocks',
    icon: '📈',
    color: '#00FF00',
    exchanges: ['NASDAQ', 'NYSE', 'AMEX'],
    dataProviders: ['finnhub', 'alphavantage'],
    symbolFormat: 'AAPL',
    searchPlaceholder: 'Search stocks (e.g., AAPL, MSFT)'
  },
  [ASSET_TYPES.CRYPTO]: {
    name: 'Cryptocurrency',
    icon: '₿',
    color: '#F7931A',
    exchanges: ['Binance', 'Coinbase', 'Kraken'],
    dataProviders: ['finnhub', 'coingecko'],
    symbolFormat: 'BTCUSD',
    searchPlaceholder: 'Search crypto (e.g., BTCUSD, ETHUSD)'
  },
  [ASSET_TYPES.INDEX]: {
    name: 'Indices',
    icon: '📊',
    color: '#4169E1',
    exchanges: ['S&P', 'NASDAQ', 'DOW'],
    dataProviders: ['finnhub', 'alphavantage'],
    symbolFormat: '^GSPC',
    searchPlaceholder: 'Search indices (e.g., ^GSPC, ^IXIC)'
  },
  [ASSET_TYPES.FOREX]: {
    name: 'Forex',
    icon: '💱',
    color: '#FFD700',
    exchanges: ['FOREX'],
    dataProviders: ['finnhub', 'fxapi'],
    symbolFormat: 'EUR/USD',
    searchPlaceholder: 'Search forex (e.g., EURUSD, GBPUSD)'
  },
  [ASSET_TYPES.COMMODITY]: {
    name: 'Commodities',
    icon: '🛢️',
    color: '#DAA520',
    exchanges: ['COMEX', 'NYMEX'],
    dataProviders: ['finnhub', 'quandl'],
    symbolFormat: 'GC=F',
    searchPlaceholder: 'Search commodities (e.g., GC=F, CL=F)'
  }
};

// Enhanced Watchlist Component with Multi-Asset Support
export const EnhancedWatchlist = () => {
  const [selectedAssetType, setSelectedAssetType] = useState(ASSET_TYPES.STOCK);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  
  const { watchlists, activeWatchlistId, addSymbolToWatchlist, createWatchlist } = useWatchlistStore();
  const { quotes, subscribeToSymbol } = useMarketStore();
  
  const activeWatchlist = watchlists[activeWatchlistId];
  const config = ASSET_CONFIG[selectedAssetType];

  // Group symbols by asset type
  const groupedSymbols = useMemo(() => {
    if (!activeWatchlist) return {};
    
    return activeWatchlist.symbols.reduce((acc, symbol) => {
      const assetType = detectAssetType(symbol);
      if (!acc[assetType]) acc[assetType] = [];
      acc[assetType].push(symbol);
      return acc;
    }, {});
  }, [activeWatchlist?.symbols]);

  // Search for assets based on type
  const handleSearch = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const results = await searchAssets(selectedAssetType, query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  };

  // Add symbol to watchlist
  const handleAddSymbol = (symbol, assetType) => {
    addSymbolToWatchlist(activeWatchlistId, symbol);
    subscribeToSymbol(symbol);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="bg-bloomberg-panel rounded-terminal border border-bloomberg-border">
      {/* Header */}
      <div className="p-4 border-b border-bloomberg-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-bloomberg-orange font-bold text-lg">
            {activeWatchlist?.name || 'Watchlist'}
          </h2>
          <WatchlistManager />
        </div>
        
        {/* Asset Type Selector */}
        <div className="flex space-x-2 mb-4">
          {Object.entries(ASSET_CONFIG).map(([type, config]) => (
            <button
              key={type}
              onClick={() => setSelectedAssetType(type)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-terminal text-xs ${
                selectedAssetType === type
                  ? 'bg-bloomberg-orange text-black'
                  : 'bg-bloomberg-button text-white hover:bg-bloomberg-button-hover'
              }`}
            >
              <span>{config.icon}</span>
              <span>{config.name}</span>
            </button>
          ))}
        </div>
        
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            placeholder={config.searchPlaceholder}
            className="w-full bg-bloomberg-input-bg border border-bloomberg-input-border 
                     text-bloomberg-text-primary placeholder-bloomberg-input-placeholder
                     px-3 py-2 rounded-terminal focus:outline-none focus:border-bloomberg-orange"
          />
          
          {/* Search Results */}
          {searchResults.length > 0 && (
            <SearchResultsDropdown
              results={searchResults}
              onSelect={handleAddSymbol}
              assetType={selectedAssetType}
            />
          )}
        </div>
      </div>

      {/* Watchlist Content */}
      <div className="p-4">
        {Object.entries(groupedSymbols).map(([assetType, symbols]) => (
          <AssetTypeSection
            key={assetType}
            assetType={assetType}
            symbols={symbols}
            quotes={quotes}
          />
        ))}
      </div>
    </div>
  );
};

// Asset Type Section Component
const AssetTypeSection = ({ assetType, symbols, quotes }) => {
  const config = ASSET_CONFIG[assetType];
  
  return (
    <div className="mb-6">
      <div className="flex items-center space-x-2 mb-3">
        <span className="text-lg">{config.icon}</span>
        <h3 className="text-bloomberg-text-secondary font-bold text-sm">
          {config.name} ({symbols.length})
        </h3>
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        {symbols.map(symbol => (
          <MultiAssetQuoteCard
            key={symbol}
            symbol={symbol}
            assetType={assetType}
            quote={quotes[symbol]}
          />
        ))}
      </div>
    </div>
  );
};

// Multi-Asset Quote Card
const MultiAssetQuoteCard = ({ symbol, assetType, quote }) => {
  const config = ASSET_CONFIG[assetType];
  const isPositive = quote?.change >= 0;
  
  return (
    <div className="flex items-center justify-between p-3 bg-bloomberg-secondary 
                    rounded-terminal border-l-4 hover:bg-bloomberg-button transition-colors"
         style={{ borderLeftColor: config.color }}>
      
      <div className="flex items-center space-x-3">
        <span className="text-sm">{config.icon}</span>
        <div>
          <div className="font-bloomberg-mono font-bold text-sm text-white">
            {formatSymbolDisplay(symbol, assetType)}
          </div>
          <div className="text-xs text-bloomberg-text-muted">
            {getAssetName(symbol, assetType)}
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <div className="font-bloomberg-mono font-bold text-sm text-white">
          {formatPrice(quote?.price, assetType)}
        </div>
        {quote?.change !== undefined && (
          <div className={`text-xs ${
            isPositive ? 'text-bloomberg-data-positive' : 'text-bloomberg-data-negative'
          }`}>
            {isPositive ? '+' : ''}{quote.change.toFixed(getDecimalPlaces(assetType))} 
            ({isPositive ? '+' : ''}{quote.changePercent?.toFixed(2)}%)
          </div>
        )}
      </div>
    </div>
  );
};

// Utility functions
const detectAssetType = (symbol) => {
  if (symbol.includes('/') || symbol.includes('USD') || symbol.includes('EUR')) {
    return ASSET_TYPES.FOREX;
  }
  if (symbol.startsWith('^')) {
    return ASSET_TYPES.INDEX;
  }
  if (symbol.includes('BTC') || symbol.includes('ETH') || symbol.includes('CRYPTO')) {
    return ASSET_TYPES.CRYPTO;
  }
  if (symbol.includes('=F') || symbol.includes('GC') || symbol.includes('CL')) {
    return ASSET_TYPES.COMMODITY;
  }
  return ASSET_TYPES.STOCK;
};

const searchAssets = async (assetType, query) => {
  // Implement asset-specific search logic
  switch (assetType) {
    case ASSET_TYPES.STOCK:
      return searchStocks(query);
    case ASSET_TYPES.CRYPTO:
      return searchCrypto(query);
    case ASSET_TYPES.INDEX:
      return searchIndices(query);
    case ASSET_TYPES.FOREX:
      return searchForex(query);
    case ASSET_TYPES.COMMODITY:
      return searchCommodities(query);
    default:
      return [];
  }
};

const formatPrice = (price, assetType) => {
  if (!price) return '—';
  
  const decimals = getDecimalPlaces(assetType);
  const prefix = getCurrencyPrefix(assetType);
  
  return `${prefix}${price.toFixed(decimals)}`;
};

const getDecimalPlaces = (assetType) => {
  switch (assetType) {
    case ASSET_TYPES.CRYPTO:
      return 4;
    case ASSET_TYPES.FOREX:
      return 5;
    case ASSET_TYPES.COMMODITY:
      return 3;
    default:
      return 2;
  }
};

const getCurrencyPrefix = (assetType) => {
  switch (assetType) {
    case ASSET_TYPES.FOREX:
      return '';
    default:
      return '$';
  }
};

const formatSymbolDisplay = (symbol, assetType) => {
  switch (assetType) {
    case ASSET_TYPES.FOREX:
      return symbol.replace('/', ' / ');
    default:
      return symbol;
  }
};

const getAssetName = (symbol, assetType) => {
  // Return human-readable asset names
  const assetNames = {
    'BTCUSD': 'Bitcoin',
    'ETHUSD': 'Ethereum',
    'EURUSD': 'Euro / US Dollar',
    '^GSPC': 'S&P 500',
    '^IXIC': 'NASDAQ Composite',
    'GC=F': 'Gold Futures'
  };
  
  return assetNames[symbol] || symbol;
};