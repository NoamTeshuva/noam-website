# Peers Service Integration Guide

## Quick Start

The peers service is now fully integrated into your watchlist. Here's how to use it:

## Current Integration (Watchlist)

Your watchlist already uses the peers service via the store. The peers are fetched automatically when you add symbols to the watchlist.

### How It Works

1. User adds ticker to watchlist (e.g., "RCL")
2. `useWatchlistPeers` hook automatically calls `fetchPeersFor('RCL')`
3. Store uses `getPeersWithInfo()` which internally calls new service
4. Peers are displayed with names and sectors
5. Data is cached for 24h

## Adding a Dedicated Peers Panel (Optional)

If you want to show peers in a separate panel (e.g., on a stock detail page), here's how:

### Example Component

```jsx
import React, { useEffect, useState } from 'react';
import { getPeersHydrated } from '../services/peers';

const PeersPanel = ({ symbol }) => {
  const [peers, setPeers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('Finnhub');

  useEffect(() => {
    const fetchPeers = async () => {
      setLoading(true);
      try {
        const data = await getPeersHydrated(symbol);
        setPeers(data);

        // Check if from fallback
        const { isPeerDataFallback } = await import('../services/peers');
        setSource(isPeerDataFallback(symbol) ? 'Computed' : 'Finnhub');
      } catch (error) {
        console.error('Failed to load peers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPeers();
  }, [symbol]);

  if (loading) {
    return <div className="text-center py-4">Loading peers...</div>;
  }

  if (peers.length === 0) {
    return <div className="text-center py-4 text-gray-500">No peers available</div>;
  }

  return (
    <div className="bg-bloomberg-panel border border-bloomberg-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-bloomberg-text-primary">
          Related Stocks
        </h3>
        <span className="text-xs text-bloomberg-text-muted">
          Source: {source}
        </span>
      </div>

      <div className="space-y-2">
        {peers.map((peer) => (
          <div
            key={peer.symbol}
            className="flex items-center justify-between p-3 bg-bloomberg-background border border-bloomberg-border rounded hover:border-bloomberg-accent-blue cursor-pointer transition-all"
            onClick={() => window.location.href = `/stock/${peer.symbol}`}
          >
            <div className="flex-1">
              <div className="font-mono font-bold text-bloomberg-text-primary">
                {peer.symbol}
              </div>
              <div className="text-sm text-bloomberg-text-secondary">
                {peer.name}
              </div>
            </div>

            {peer.lastPrice && (
              <div className="text-right">
                <div className="font-mono text-bloomberg-text-primary">
                  ${peer.lastPrice.toFixed(2)}
                </div>
                <div
                  className={`text-sm ${
                    peer.change >= 0
                      ? 'text-bloomberg-data-positive'
                      : 'text-bloomberg-data-negative'
                  }`}
                >
                  {peer.change >= 0 ? '+' : ''}
                  {peer.changePercent?.toFixed(2)}%
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PeersPanel;
```

### Usage

```jsx
import PeersPanel from './components/PeersPanel';

function StockDetailPage({ symbol }) {
  return (
    <div>
      <h1>{symbol} Overview</h1>

      {/* Other components */}

      <PeersPanel symbol={symbol} />
    </div>
  );
}
```

## Testing the Integration

### 1. Test with RCL (Cruise Lines)

Open your browser console and run:

```javascript
import { getPeers, getPeersHydrated } from './services/peers';

// Get peer tickers
const peers = await getPeers('RCL');
console.log('RCL Peers:', peers);
// Expected: ['CCL', 'NCLH', 'BKNG', 'ABNB', 'MAR']

// Get hydrated data
const hydrated = await getPeersHydrated('RCL');
console.log('RCL Hydrated:', hydrated);
// Expected: Array of objects with symbol, name, lastPrice, change, changePercent
```

### 2. Test Caching

```javascript
// First call (will fetch from API)
console.time('First call');
await getPeers('AAPL');
console.timeEnd('First call');
// Expected: ~200-300ms

// Second call (will use cache)
console.time('Cached call');
await getPeers('AAPL');
console.timeEnd('Cached call');
// Expected: ~1-5ms
```

### 3. Test Fallback

```javascript
import { getPeers, isPeerDataFallback } from './services/peers';

// This will use fallback if Finnhub has no data
const peers = await getPeers('OBSCURE_TICKER');
const isFallback = isPeerDataFallback('OBSCURE_TICKER');

console.log('Using fallback?', isFallback);
```

## Monitoring & Debugging

### Check Network Requests

Open DevTools Network tab and filter by "peers":

1. First request should show:
   - URL: `https://twelvedata-proxy.teshuva91.workers.dev/api/finnhub/stock/peers?symbol=RCL`
   - Status: 200
   - Response: JSON array of tickers

2. Look for cache headers:
   - `x-cache: MISS` (first request)
   - `x-cache: HIT` (subsequent requests within 24h)

### Check Console Logs

The service logs all operations:

```
🔍 [PEERS] Fetching peers for RCL...
✅ [PEERS] Finnhub peers for RCL: ['CCL', 'NCLH', ...]
💧 [PEERS-HYDRATED] Hydrating 4 peers for RCL...
✅ [PEERS-HYDRATED] Hydrated 4 peers for RCL
```

### Rate Limit Warnings

If you see:
```
⚠️ [PEERS-HYDRATED] Failed to hydrate CCL: Rate limit exceeded
```

This means:
- TD has hit the 8 req/min limit
- Ticker will be shown without quote data
- Will retry after 1 minute

## Performance Tips

### 1. Prefetch Peers
```javascript
// Prefetch peers when hovering over ticker
<div onMouseEnter={() => getPeers('RCL')}>
  RCL
</div>
```

### 2. Batch Requests
```javascript
// Instead of:
await getPeers('RCL');
await getPeers('CCL');
await getPeers('NCLH');

// Do:
const symbols = ['RCL', 'CCL', 'NCLH'];
const allPeers = await Promise.all(
  symbols.map(s => getPeers(s))
);
```

### 3. Use Lightweight getPeers() First
```javascript
// Get tickers only (fast, no TD calls)
const tickers = await getPeers('RCL');

// Only hydrate when user clicks "Show Details"
if (showDetails) {
  const hydrated = await getPeersHydrated('RCL');
}
```

## Common Issues

### Issue: Empty Peers Array

**Cause**: Symbol not found or no peers available
**Solution**: Show "No peers available" message in UI

```javascript
if (peers.length === 0) {
  return <div>No peers available for {symbol}</div>;
}
```

### Issue: Peers Include Original Symbol

**Cause**: This shouldn't happen (the service filters it out)
**Debug**: Check if you're calling the legacy `getFallbackPeers()` directly

**Solution**: Always use `getPeers()` from `src/services/peers.js`

### Issue: Rate Limit Errors

**Cause**: TD 8 req/min limit exceeded
**Solution**: Service already handles this with:
- 1s delays between requests
- Graceful degradation (show ticker without quote)
- 60s cache for quotes

### Issue: Stale Quotes

**Cause**: Hydrated cache is 60s
**Solution**:
```javascript
import { invalidatePeers } from './services/peers';

// Force refresh
invalidatePeers('RCL');
const fresh = await getPeersHydrated('RCL');
```

## API Reference

### `getPeers(symbol)`

Returns up to 5 peer ticker symbols.

**Parameters:**
- `symbol` (string): Stock ticker (case-insensitive)

**Returns:** `Promise<string[]>`

**Cache:** 24 hours

**Example:**
```javascript
const peers = await getPeers('RCL');
// ['CCL', 'NCLH', 'BKNG', 'ABNB', 'MAR']
```

### `getPeersHydrated(symbol)`

Returns peer data with names and live quotes.

**Parameters:**
- `symbol` (string): Stock ticker (case-insensitive)

**Returns:** `Promise<Array<PeerData>>`

**PeerData:**
```typescript
{
  symbol: string;
  name: string;
  lastPrice: number | null;
  change: number | null;
  changePercent: number | null;
  source: 'Twelve Data' | null;
}
```

**Cache:** 60 seconds

**Rate Limits:** Respects TD 8 req/min with 1s delays

**Example:**
```javascript
const hydrated = await getPeersHydrated('RCL');
// [{ symbol: 'CCL', name: 'Carnival Corporation', lastPrice: 15.23, ... }, ...]
```

### `invalidatePeers(symbol?)`

Clears cache for symbol or all symbols.

**Parameters:**
- `symbol` (string, optional): Symbol to clear (omit to clear all)

**Returns:** `void`

**Example:**
```javascript
invalidatePeers('RCL'); // Clear RCL only
invalidatePeers();      // Clear all
```

### `isPeerDataFallback(symbol)`

Checks if peer data came from fallback source.

**Parameters:**
- `symbol` (string): Stock ticker

**Returns:** `boolean`

**Example:**
```javascript
const isFallback = isPeerDataFallback('RCL');
if (isFallback) {
  console.log('Using computed peers (Finnhub unavailable)');
}
```

## Resources

- **Main Service**: `src/services/peers.js`
- **Tests**: `src/services/peers.test.js`
- **Worker**: `workers/twelvedata.js`
- **Full Docs**: `PEERS_SERVICE_README.md`
- **Deployment**: `DEPLOY_WORKER.md`
