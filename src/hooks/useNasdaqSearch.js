import { useState, useEffect, useMemo } from 'react';
import { parseNasdaqList, filterTickers, applyFilter, FILTER_OPTIONS } from '../utils/nasdaqParser';

/**
 * Hook to load and search NASDAQ tickers
 */
export const useNasdaqSearch = (searchQuery, filterType = FILTER_OPTIONS.ALL) => {
  const [tickers, setTickers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load NASDAQ list on mount
  useEffect(() => {
    const loadNasdaqList = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await parseNasdaqList('/nasdaqlisted.txt');
        setTickers(data);
      } catch (err) {
        setError('Failed to load NASDAQ ticker list');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadNasdaqList();
  }, []);

  // Filter and search tickers
  const results = useMemo(() => {
    if (!searchQuery || searchQuery.length < 1) {
      return [];
    }

    let filtered = applyFilter(tickers, filterType);
    filtered = filterTickers(filtered, searchQuery);

    // Limit to 10 results
    return filtered.slice(0, 10);
  }, [tickers, searchQuery, filterType]);

  return {
    results,
    isLoading,
    error,
    totalTickers: tickers.length
  };
};
