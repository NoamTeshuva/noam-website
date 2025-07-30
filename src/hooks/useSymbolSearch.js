import { useState, useEffect, useCallback, useRef } from 'react';
import { alphaVantageAPI } from '../utils/api';

/**
 * Custom hook for symbol search with debouncing and abort functionality
 * @param {string} query - Search query
 * @param {number} debounceMs - Debounce delay in milliseconds
 * @returns {object} - Search results, loading state, and error state
 */
export const useSymbolSearch = (query, debounceMs = 500) => {
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  
  const abortControllerRef = useRef(null);

  // Debounce the query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [query, debounceMs]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setError('');
      return;
    }

    performSearch(debouncedQuery);
  }, [debouncedQuery]);

  const performSearch = useCallback(async (searchQuery) => {
    // Abort previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    setIsSearching(true);
    setError('');
    
    try {
      const searchResults = await alphaVantageAPI.searchSymbol(searchQuery);
      
      // Check if request was aborted
      if (abortControllerRef.current.signal.aborted) {
        return;
      }
      
      setResults(searchResults.slice(0, 5)); // Limit to 5 results
    } catch (err) {
      // Don't set error if request was aborted
      if (!abortControllerRef.current.signal.aborted) {
        if (err.name === 'AbortError') {
          console.log('Search request was aborted');
        } else {
          setError('Search failed. Please try again.');
          setResults([]);
        }
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setIsSearching(false);
      }
    }
  }, []);

  // Cleanup function to abort ongoing requests
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    results,
    isSearching,
    error,
    cleanup
  };
};