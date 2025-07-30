import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

const StockSearchWidget = ({ onStockSelect }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Mock search function - replace with actual API call
  const searchStocks = async (searchTerm) => {
    if (searchTerm.length < 2) return [];
    
    setIsLoading(true);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Mock data - replace with Alpha Vantage SYMBOL_SEARCH
      const mockResults = [
        { symbol: 'AAPL', name: 'Apple Inc.', type: 'Equity', region: 'United States' },
        { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'Equity', region: 'United States' },
        { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', type: 'Equity', region: 'United States' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'Equity', region: 'United States' },
        { symbol: 'TSLA', name: 'Tesla Inc.', type: 'Equity', region: 'United States' },
        { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'Equity', region: 'United States' },
        { symbol: 'META', name: 'Meta Platforms Inc.', type: 'Equity', region: 'United States' },
      ].filter(stock => 
        stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stock.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      setSearchResults(mockResults);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        searchStocks(query);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStockSelect = (stock) => {
    setQuery(stock.symbol);
    setShowResults(false);
    onStockSelect(stock);
  };

  const clearSearch = () => {
    setQuery('');
    setSearchResults([]);
    setShowResults(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full max-w-md">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-bloomberg-text-muted" />
        </div>
        <input
          ref={inputRef}
          type="text"
          className="w-full bg-bloomberg-input-bg border border-bloomberg-input-border 
                     text-bloomberg-text-primary placeholder-bloomberg-input-placeholder
                     font-bloomberg-mono text-terminal-base
                     pl-10 pr-10 py-3 rounded-terminal
                     focus:outline-none focus:border-bloomberg-input-focus focus:ring-1 focus:ring-bloomberg-input-focus
                     transition-colors duration-200"
          placeholder="Enter stock symbol or company name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setShowResults(true)}
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-bloomberg-text-muted hover:text-bloomberg-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div 
          ref={resultsRef}
          className="absolute z-50 w-full mt-1 bg-bloomberg-panel border border-bloomberg-border 
                     rounded-terminal-lg shadow-2xl max-h-80 overflow-auto"
        >
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="text-bloomberg-text-muted font-bloomberg-mono text-terminal-sm">
                Searching...
              </div>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="py-2">
              {searchResults.map((stock, index) => (
                <button
                  key={stock.symbol}
                  onClick={() => handleStockSelect(stock)}
                  className="w-full px-4 py-3 text-left hover:bg-bloomberg-secondary 
                           transition-colors duration-150 border-l-4 border-transparent
                           hover:border-bloomberg-orange focus:outline-none focus:bg-bloomberg-secondary
                           focus:border-bloomberg-orange"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="text-bloomberg-orange font-bloomberg-mono font-bold text-terminal-lg">
                          {stock.symbol}
                        </span>
                        <span className="text-bloomberg-text-secondary text-terminal-sm">
                          {stock.type}
                        </span>
                      </div>
                      <div className="text-bloomberg-text-primary text-terminal-sm mt-1 truncate max-w-xs">
                        {stock.name}
                      </div>
                    </div>
                    <div className="text-bloomberg-text-muted text-terminal-xs">
                      {stock.region}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center">
              <div className="text-bloomberg-text-muted font-bloomberg-mono text-terminal-sm">
                No results found for "{query}"
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default StockSearchWidget;