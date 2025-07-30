import { useState, useEffect, useCallback } from 'react';
import { useWatchlistStore } from '../store/useWatchlistStore';

/**
 * Custom hook for managing peer data with loading and error states
 * @param {string} symbol - Stock symbol
 * @returns {object} - Peer data, loading state, error state, and actions
 */
export const usePeers = (symbol) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const {
    getPeersInfoFor,
    isPeerDataFallback,
    fetchPeersFor
  } = useWatchlistStore();

  const peers = getPeersInfoFor(symbol);
  const isFallbackData = isPeerDataFallback(symbol);

  // Fetch peers when symbol changes
  useEffect(() => {
    if (!symbol || peers.length > 0) return;

    fetchPeers();
  }, [symbol]);

  const fetchPeers = useCallback(async () => {
    if (!symbol) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchPeersFor(symbol);
      
      if (!result.success) {
        setError(result.error || 'Failed to fetch peers');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch peers');
    } finally {
      setIsLoading(false);
    }
  }, [symbol, fetchPeersFor]);

  const retry = useCallback(() => {
    fetchPeers();
  }, [fetchPeers]);

  return {
    peers,
    isLoading,
    error,
    isFallbackData,
    retry,
    hasPeers: peers.length > 0
  };
};

/**
 * Hook for managing peers across all watchlist symbols
 * @param {string[]} symbols - Array of stock symbols
 * @returns {object} - Peer states for all symbols
 */
export const useWatchlistPeers = (symbols) => {
  const [loadingStates, setLoadingStates] = useState({});
  const [errorStates, setErrorStates] = useState({});
  
  const { fetchPeersFor, getPeersInfoFor, isPeerDataFallback } = useWatchlistStore();

  // Initialize peers for new symbols
  useEffect(() => {
    const initializePeers = async () => {
      for (const symbol of symbols) {
        const existingPeers = getPeersInfoFor(symbol);
        
        // Only fetch if we don't have peers yet
        if (existingPeers.length === 0) {
          setLoadingStates(prev => ({ ...prev, [symbol]: true }));
          setErrorStates(prev => ({ ...prev, [symbol]: null }));
          
          try {
            const result = await fetchPeersFor(symbol);
            
            if (!result.success) {
              setErrorStates(prev => ({ 
                ...prev, 
                [symbol]: result.error || 'Failed to fetch peers' 
              }));
            }
          } catch (err) {
            setErrorStates(prev => ({ 
              ...prev, 
              [symbol]: err.message || 'Failed to fetch peers' 
            }));
          } finally {
            setLoadingStates(prev => ({ ...prev, [symbol]: false }));
          }
          
          // Add delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    };

    if (symbols.length > 0) {
      initializePeers();
    }
  }, [symbols, fetchPeersFor, getPeersInfoFor]);

  // Clean up states for removed symbols
  useEffect(() => {
    setLoadingStates(prev => {
      const newStates = {};
      symbols.forEach(symbol => {
        if (prev[symbol] !== undefined) {
          newStates[symbol] = prev[symbol];
        }
      });
      return newStates;
    });

    setErrorStates(prev => {
      const newStates = {};
      symbols.forEach(symbol => {
        if (prev[symbol] !== undefined) {
          newStates[symbol] = prev[symbol];
        }
      });
      return newStates;
    });
  }, [symbols]);

  const getPeerState = useCallback((symbol) => ({
    peers: getPeersInfoFor(symbol),
    isLoading: loadingStates[symbol] || false,
    error: errorStates[symbol] || null,
    isFallbackData: isPeerDataFallback(symbol),
    hasPeers: getPeersInfoFor(symbol).length > 0
  }), [loadingStates, errorStates, getPeersInfoFor, isPeerDataFallback]);

  const retryPeerFetch = useCallback(async (symbol) => {
    setLoadingStates(prev => ({ ...prev, [symbol]: true }));
    setErrorStates(prev => ({ ...prev, [symbol]: null }));
    
    try {
      const result = await fetchPeersFor(symbol);
      
      if (!result.success) {
        setErrorStates(prev => ({ 
          ...prev, 
          [symbol]: result.error || 'Failed to fetch peers' 
        }));
      }
    } catch (err) {
      setErrorStates(prev => ({ 
        ...prev, 
        [symbol]: err.message || 'Failed to fetch peers' 
      }));
    } finally {
      setLoadingStates(prev => ({ ...prev, [symbol]: false }));
    }
  }, [fetchPeersFor]);

  return {
    getPeerState,
    retryPeerFetch
  };
};