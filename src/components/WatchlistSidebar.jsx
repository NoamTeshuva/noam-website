import React, { useState, useCallback, useMemo } from 'react';
import { useWatchlistStore } from '../store/useWatchlistStore';
import { useSymbolSearch } from '../hooks/useSymbolSearch';
import { useWatchlistPeers } from '../hooks/usePeers';
import useLivePrice from '../hooks/useLivePrice';
import { sidebarStyles, itemStyles, pillStyles, searchResultStyles } from './WatchlistSidebar.styles';

const WatchlistSidebar = ({ isOpen, onToggle }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [addingSymbols, setAddingSymbols] = useState(new Set());

  const {
    symbols,
    addToWatchlist,
    removeFromWatchlist,
    getWatchlistStats
  } = useWatchlistStore();

  const stats = getWatchlistStats();
  const { results: searchResults, isSearching, error: searchError } = useSymbolSearch(searchQuery);
  const { getPeerState, retryPeerFetch } = useWatchlistPeers(symbols);

  const handleAddSymbol = useCallback(async (symbol) => {
    if (addingSymbols.has(symbol)) return { success: false, message: 'Already adding symbol' };
    
    setAddingSymbols(prev => new Set(prev).add(symbol));
    
    try {
      const result = addToWatchlist(symbol);
      if (result.success) {
        setSearchQuery('');
      }
      return result;
    } finally {
      setAddingSymbols(prev => {
        const newSet = new Set(prev);
        newSet.delete(symbol);
        return newSet;
      });
    }
  }, [addToWatchlist, addingSymbols]);

  const handleRemoveSymbol = useCallback((symbol) => {
    return removeFromWatchlist(symbol);
  }, [removeFromWatchlist]);

  const memoizedSymbols = useMemo(() => symbols, [symbols]);

  if (!isOpen) {
    return (
      <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-40">
        <button
          onClick={onToggle}
          className={sidebarStyles.toggleButton}
          aria-label="Open watchlist"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={sidebarStyles.overlay} onClick={onToggle} />
      
      <div className={sidebarStyles.container}>
        <div className={sidebarStyles.header}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={sidebarStyles.headerTitle}>📊 WATCHLIST</h2>
            <button
              onClick={onToggle}
              className="text-bloomberg-text-secondary hover:text-bloomberg-text-primary transition-colors"
              aria-label="Close watchlist"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="flex justify-between text-xs text-bloomberg-text-secondary mb-4">
            <span>{stats.count}/10 symbols</span>
            <span className={stats.maxReached ? 'text-bloomberg-status-error' : 'text-bloomberg-data-positive'}>
              {stats.remaining} remaining
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stocks (e.g., AAPL, MSFT)"
              disabled={stats.maxReached}
              className={sidebarStyles.searchInput}
            />
            
            {isSearching && (
              <div className="absolute right-3 top-2">
                <div className={sidebarStyles.spinner}></div>
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className={sidebarStyles.searchResults}>
                {searchResults.map((result) => (
                  <SearchResultItem
                    key={result['1. symbol']}
                    result={result}
                    onAdd={handleAddSymbol}
                    isInWatchlist={symbols.includes(result['1. symbol'])}
                    isAdding={addingSymbols.has(result['1. symbol'])}
                  />
                ))}
              </div>
            )}

            {searchError && (
              <div className={sidebarStyles.errorMessage}>
                {searchError}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {memoizedSymbols.length === 0 ? (
            <div className={sidebarStyles.emptyState}>
              <div className="text-4xl mb-2">📈</div>
              <p className="text-sm">Your watchlist is empty</p>
              <p className="text-xs mt-1">Search for stocks to add</p>
            </div>
          ) : (
            <div className="space-y-2">
              {memoizedSymbols.map(symbol => (
                <WatchlistItem
                  key={symbol}
                  symbol={symbol}
                  onRemove={handleRemoveSymbol}
                  peerState={getPeerState(symbol)}
                  onRetryPeers={retryPeerFetch}
                />
              ))}
            </div>
          )}
        </div>

        <div className={sidebarStyles.footer}>
          <div className="text-xs text-bloomberg-text-muted text-center">
            Real-time monitoring active
            <br />
            <span className="text-bloomberg-data-positive">●</span> Volume spike alerts enabled
          </div>
        </div>
      </div>
    </>
  );
};

// Search Result Item Component
const SearchResultItem = React.memo(({ result, onAdd, isInWatchlist, isAdding }) => {
  const symbol = result['1. symbol'];
  const name = result['2. name'];
  const region = result['4. region'];

  const handleAdd = useCallback(async () => {
    const result = await onAdd(symbol);
    console.log(result.message);
  }, [onAdd, symbol]);

  const getButtonClassName = () => {
    if (isInWatchlist) return searchResultStyles.addButtonDisabled;
    if (isAdding) return searchResultStyles.addButtonLoading;
    return searchResultStyles.addButton;
  };

  const getButtonText = () => {
    if (isAdding) return 'Adding...';
    if (isInWatchlist) return 'Added';
    return 'Add';
  };

  return (
    <div className={searchResultStyles.container}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className={searchResultStyles.symbol}>{symbol}</div>
          <div className={searchResultStyles.name}>{name}</div>
          <div className={searchResultStyles.region}>{region}</div>
        </div>
        <button
          onClick={handleAdd}
          disabled={isInWatchlist || isAdding}
          className={getButtonClassName()}
        >
          {getButtonText()}
        </button>
      </div>
    </div>
  );
});

// Watchlist Item Component
const WatchlistItem = React.memo(({ symbol, onRemove, peerState, onRetryPeers }) => {
  const priceData = useLivePrice(symbol);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showPeers, setShowPeers] = useState(false);
  const [selectedPeer, setSelectedPeer] = useState(null);

  const { peers, isLoading: peersLoading, error: peersError, isFallbackData } = peerState;

  const handleRemove = useCallback(() => {
    const result = onRemove(symbol);
    console.log(result.message);
    setShowConfirmDelete(false);
  }, [onRemove, symbol]);

  const handleRetryPeers = useCallback(() => {
    onRetryPeers(symbol);
  }, [onRetryPeers, symbol]);

  const isPositive = priceData?.change >= 0;
  const isNeutral = priceData?.change === 0;

  const getPeerButtonStyle = () => {
    if (isFallbackData) return itemStyles.peerButtonFallback;
    return itemStyles.peerButton;
  };

  const getPriceChangeStyle = () => {
    if (isNeutral) return itemStyles.neutralChange;
    return isPositive ? itemStyles.positiveChange : itemStyles.negativeChange;
  };

  return (
    <div className={itemStyles.container}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className={itemStyles.symbolHeader}>
              <span className={itemStyles.symbolText}>{symbol}</span>
              
              {/* Peer Status Indicator */}
              {peersLoading ? (
                <div className={itemStyles.peerLoading}>Loading peers...</div>
              ) : peersError ? (
                <button
                  onClick={handleRetryPeers}
                  className={itemStyles.retryButton}
                  title="Click to retry loading peers"
                >
                  Failed to load peers - Retry
                </button>
              ) : peers.length > 0 ? (
                <button
                  onClick={() => setShowPeers(!showPeers)}
                  className={getPeerButtonStyle()}
                  title={`${showPeers ? 'Hide' : 'Show'} peer stocks${isFallbackData ? ' (fallback data)' : ''}`}
                >
                  [{peers.length}]{isFallbackData ? '*' : ''}
                </button>
              ) : null}
            </div>
            
            {!showConfirmDelete ? (
              <button
                onClick={() => setShowConfirmDelete(true)}
                className={itemStyles.removeButton}
                title="Remove from watchlist"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            ) : (
              <div className="flex space-x-1">
                <button
                  onClick={handleRemove}
                  className={itemStyles.confirmButton}
                  title="Confirm remove"
                >
                  ✓
                </button>
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className={itemStyles.cancelButton}
                  title="Cancel"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
          
          {priceData ? (
            <>
              <div className={itemStyles.priceText}>
                ${priceData.price?.toFixed(2) || '—'}
              </div>
              <div className={getPriceChangeStyle()}>
                {isPositive ? '+' : ''}{priceData.change?.toFixed(2) || '—'} 
                ({isPositive ? '+' : ''}{priceData.changePercent?.toFixed(2) || '—'}%)
              </div>
            </>
          ) : (
            <div className={itemStyles.loadingText}>Loading...</div>
          )}

          {/* Peers Section */}
          {showPeers && peers.length > 0 && (
            <div className={itemStyles.peersSection}>
              <div className={itemStyles.peersLabel}>
                Peers{isFallbackData ? ' (fallback data):' : ':'}
              </div>
              <div className={itemStyles.peersContainer}>
                {peers.map((peer) => (
                  <PeerPill
                    key={peer.symbol}
                    peer={peer}
                    isSelected={selectedPeer === peer.symbol}
                    isFallbackData={isFallbackData}
                    onClick={() => setSelectedPeer(selectedPeer === peer.symbol ? null : peer.symbol)}
                  />
                ))}
              </div>
              {selectedPeer && (
                <div className={itemStyles.peerDetail}>
                  <div className={itemStyles.peerSymbol}>{selectedPeer}</div>
                  <div className={itemStyles.peerName}>
                    {peers.find(p => p.symbol === selectedPeer)?.name}
                  </div>
                  <div className={itemStyles.peerSector}>
                    {peers.find(p => p.symbol === selectedPeer)?.sector}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// Peer Pill Component
const PeerPill = React.memo(({ peer, isSelected, isFallbackData, onClick }) => {
  const handleClick = useCallback(() => {
    onClick();
  }, [onClick]);

  const getPillClassName = () => {
    const baseClasses = pillStyles.base;
    
    if (isFallbackData) {
      return `${baseClasses} ${isSelected ? pillStyles.selected : pillStyles.fallback}`;
    }
    
    return `${baseClasses} ${isSelected ? pillStyles.selected : pillStyles.normal}`;
  };

  const getTitle = () => {
    const baseTitle = `${peer.name} (${peer.sector})`;
    return isFallbackData ? `${baseTitle} - Fallback data` : baseTitle;
  };

  return (
    <button
      onClick={handleClick}
      className={getPillClassName()}
      title={getTitle()}
    >
      {peer.symbol}{isFallbackData ? '*' : ''}
    </button>
  );
});

export default WatchlistSidebar;