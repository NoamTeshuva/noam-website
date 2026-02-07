import { useState, useEffect, useRef } from 'react';
import { fetchTDSeries } from '../services/tdStats';
import { useWatchlistStore } from '../store/useWatchlistStore';
import { getCachedPeerSeries, savePeerSeries } from '../services/peerSeriesCache';
import { isTDExhausted } from '../utils/rateLimitManager';

/**
 * usePeerSeries - Fetches daily time series for a stock and its peers.
 * Lazy-loaded: only fetches when `enabled` is true (user clicks Peers tab).
 * Reuses tdStats 15-min in-memory cache for the main stock (0 extra API calls).
 * Fetches peer series with 8s stagger to respect rate limits.
 *
 * @param {string} symbol - Main stock symbol
 * @param {boolean} enabled - Whether to fetch (false until user clicks Peers tab)
 * @returns {{ seriesMap: Object, peers: string[], loading: boolean, progress: number, error: string|null }}
 */
export const usePeerSeries = (symbol, enabled = false) => {
  const [seriesMap, setSeriesMap] = useState({});
  const [peers, setPeers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const abortRef = useRef(false);
  const lastSymbolRef = useRef(null);

  const getPeersFor = useWatchlistStore(state => state.getPeersFor);

  useEffect(() => {
    if (!symbol || !enabled) return;

    // If same symbol and we already have data, skip
    if (symbol === lastSymbolRef.current && Object.keys(seriesMap).length > 0) {
      return;
    }

    abortRef.current = false;
    lastSymbolRef.current = symbol;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      setSeriesMap({});
      setProgress(0);

      try {
        // Get peer symbols from watchlist store
        const peerSymbols = getPeersFor(symbol);
        // Filter out demo peers
        const validPeers = (peerSymbols || [])
          .filter(p => p && !p.startsWith('DEMO'))
          .slice(0, 5);

        setPeers(validPeers);

        if (validPeers.length === 0) {
          setLoading(false);
          setError('No peers available');
          return;
        }

        const allSymbols = [symbol, ...validPeers];
        const totalToFetch = allSymbols.length;
        const newSeriesMap = {};
        let fetched = 0;

        for (let i = 0; i < allSymbols.length; i++) {
          if (abortRef.current) break;

          const sym = allSymbols[i];

          // Check cache first
          const cached = getCachedPeerSeries(sym);
          if (cached && cached.length > 0) {
            console.log(`[usePeerSeries] Cache hit for ${sym}`);
            newSeriesMap[sym] = cached;
            fetched++;
            setProgress((fetched / totalToFetch) * 100);
            setSeriesMap({ ...newSeriesMap });
            continue;
          }

          // Check rate limit before fetching
          if (isTDExhausted()) {
            console.warn(`[usePeerSeries] Rate limit exhausted, skipping ${sym}`);
            // Continue without this symbol, show what we have
            continue;
          }

          // Add stagger delay between API calls (skip for first symbol if cached main stock)
          if (i > 0) {
            console.log(`[usePeerSeries] Waiting 8s before fetching ${sym}...`);
            await new Promise(resolve => setTimeout(resolve, 8000));
            if (abortRef.current) break;
          }

          try {
            console.log(`[usePeerSeries] Fetching series for ${sym}...`);
            const bars = await fetchTDSeries(sym, '1day', 200);

            if (bars && bars.length > 0) {
              newSeriesMap[sym] = bars;
              savePeerSeries(sym, bars);
            }
          } catch (err) {
            console.warn(`[usePeerSeries] Failed to fetch ${sym}:`, err.message);
            // Graceful degradation - continue with remaining peers
          }

          fetched++;
          setProgress((fetched / totalToFetch) * 100);
          setSeriesMap({ ...newSeriesMap });
        }

        if (Object.keys(newSeriesMap).length === 0) {
          setError('Could not load series data');
        }

        setLoading(false);
      } catch (err) {
        console.error('[usePeerSeries] Error:', err);
        setError(err.message || 'Failed to load peer series');
        setLoading(false);
      }
    };

    fetchAll();

    return () => {
      abortRef.current = true;
    };
  }, [symbol, enabled, getPeersFor]);

  return { seriesMap, peers, loading, progress, error };
};
