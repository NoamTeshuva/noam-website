import React, { useState, useEffect } from 'react';
import { getPeers } from '../services/peers';
import { twelveDataAPI } from '../utils/api';
import { formatters } from '../hooks/useSmartPolling';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * PeersPanel - Displays peer stocks with live Twelve Data quotes
 *
 * Data flow:
 * 1. Gets peer tickers from Finnhub (via getPeers service)
 * 2. Fetches live quotes from Twelve Data for each peer
 * 3. Uses delays between requests to respect TD 8 req/min limit
 */
const PeersPanel = ({ symbol }) => {
  const [peers, setPeers] = useState([]);
  const [peerData, setPeerData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    if (!symbol) return;

    const fetchPeersWithQuotes = async () => {
      setLoading(true);
      setError(null);
      setPeerData({});
      setLoadingProgress(0);

      try {
        // Step 1: Get peer tickers from Finnhub (cached 24h)
        console.log(`🔍 [PeersPanel] Fetching peers for ${symbol}...`);
        const peerSymbols = await getPeers(symbol);

        if (peerSymbols.length === 0) {
          setLoading(false);
          setError('No peers available');
          return;
        }

        console.log(`✅ [PeersPanel] Got ${peerSymbols.length} peers:`, peerSymbols);
        setPeers(peerSymbols);

        // Step 2: Fetch quotes from Twelve Data with delays
        const quotes = {};
        const totalPeers = peerSymbols.length;

        for (let i = 0; i < peerSymbols.length; i++) {
          const peerSymbol = peerSymbols[i];

          try {
            // Add 8-second delay between requests (to stay well under 8 req/min)
            if (i > 0) {
              console.log(`⏳ [PeersPanel] Waiting 8s before fetching ${peerSymbol}...`);
              await new Promise(resolve => setTimeout(resolve, 8000));
            }

            console.log(`📊 [PeersPanel] Fetching quote for ${peerSymbol}...`);
            const quoteData = await twelveDataAPI.getQuote(peerSymbol);

            quotes[peerSymbol] = {
              symbol: peerSymbol,
              price: quoteData.price,
              change: quoteData.change,
              changePercent: quoteData.changePercent,
              volume: quoteData.volume,
              lastUpdated: new Date(),
              error: null
            };

            // Update progress
            setLoadingProgress(((i + 1) / totalPeers) * 100);
            setPeerData({ ...quotes });

            console.log(`✅ [PeersPanel] Got quote for ${peerSymbol}: $${quoteData.price}`);

          } catch (error) {
            console.error(`❌ [PeersPanel] Failed to fetch ${peerSymbol}:`, error.message);

            // Graceful degradation - show ticker without quote
            quotes[peerSymbol] = {
              symbol: peerSymbol,
              price: null,
              change: null,
              changePercent: null,
              volume: null,
              lastUpdated: null,
              error: error.message
            };

            setPeerData({ ...quotes });
          }
        }

        setLoading(false);
        console.log(`✅ [PeersPanel] Finished loading ${Object.keys(quotes).length} peers`);

      } catch (error) {
        console.error(`❌ [PeersPanel] Error fetching peers:`, error);
        setError(error.message || 'Failed to load peers');
        setLoading(false);
      }
    };

    fetchPeersWithQuotes();
  }, [symbol]);

  if (loading && peers.length === 0) {
    return (
      <div className="bg-bloomberg-panel border border-bloomberg-border rounded p-4">
        <h3 className="text-gray-300 font-bold mb-3" style={{ fontSize: '13px' }}>
          Related Stocks
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-bloomberg-orange"></div>
          <span className="ml-3 text-gray-400 text-sm">Loading peers...</span>
        </div>
      </div>
    );
  }

  if (error && peers.length === 0) {
    return (
      <div className="bg-bloomberg-panel border border-bloomberg-border rounded p-4">
        <h3 className="text-gray-300 font-bold mb-3" style={{ fontSize: '13px' }}>
          Related Stocks
        </h3>
        <div className="text-center py-8 text-gray-400 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bloomberg-panel border border-bloomberg-border rounded p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-gray-300 font-bold" style={{ fontSize: '13px' }}>
          Related Stocks
          <span className="ml-2 text-xs text-gray-500">
            ({peers.length} peers)
          </span>
        </h3>
        {loading && (
          <div className="flex items-center space-x-2">
            <div className="w-24 bg-bloomberg-secondary rounded-full h-1.5">
              <div
                className="bg-bloomberg-orange h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            <span className="text-xs text-gray-500">
              {Math.round(loadingProgress)}%
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2">
        {peers.map((peerSymbol) => {
          const data = peerData[peerSymbol];
          const isLoading = !data;
          const hasError = data?.error;
          const isPositive = data?.change >= 0;
          const isNeutral = data?.change === 0;

          return (
            <div
              key={peerSymbol}
              className="bg-bloomberg-secondary border border-bloomberg-border rounded p-3 hover:border-bloomberg-orange transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                {/* Left: Symbol */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-bloomberg-orange" style={{ fontSize: '12px' }}>
                      {peerSymbol}
                    </span>
                    {isLoading && (
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400"></div>
                    )}
                    {hasError && (
                      <span className="text-xs text-bloomberg-status-error">Error</span>
                    )}
                  </div>
                </div>

                {/* Center: Price */}
                <div className="flex-1 text-center">
                  {isLoading ? (
                    <div className="h-4 bg-bloomberg-background rounded w-16 mx-auto animate-pulse"></div>
                  ) : hasError ? (
                    <span className="text-xs text-gray-500">N/A</span>
                  ) : (
                    <span className="font-mono text-white font-bold" style={{ fontSize: '13px' }}>
                      {formatters.price(data.price)}
                    </span>
                  )}
                </div>

                {/* Right: Change */}
                <div className="flex-1 text-right">
                  {isLoading ? (
                    <div className="h-4 bg-bloomberg-background rounded w-20 ml-auto animate-pulse"></div>
                  ) : hasError ? (
                    <span className="text-xs text-gray-500">---</span>
                  ) : (
                    <div className="flex items-center justify-end space-x-1">
                      {isNeutral ? (
                        <Minus className="h-3 w-3 text-bloomberg-data-neutral" />
                      ) : isPositive ? (
                        <TrendingUp className="h-3 w-3 text-bloomberg-data-positive" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-bloomberg-data-negative" />
                      )}
                      <span
                        className={`font-mono text-xs ${
                          isNeutral
                            ? 'text-bloomberg-data-neutral'
                            : isPositive
                            ? 'text-bloomberg-data-positive'
                            : 'text-bloomberg-data-negative'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {formatters.change(data.change, data.changePercent)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Volume (if loaded) */}
              {data && !hasError && data.volume && (
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                  <span>Vol:</span>
                  <span className="font-mono">{formatters.volume(data.volume)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Source indicator */}
      <div className="mt-3 pt-2 border-t border-bloomberg-border-subtle text-xs text-gray-500 flex items-center justify-between">
        <span>Peers: Finnhub • Quotes: Twelve Data</span>
        {loading && (
          <span className="text-bloomberg-orange animate-pulse">Loading quotes...</span>
        )}
      </div>
    </div>
  );
};

export default PeersPanel;
