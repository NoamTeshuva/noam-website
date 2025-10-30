# Related Stocks (Peers) Service

## Overview

The peers service provides 4-5 related public company tickers for any given stock symbol. It uses a multi-tier approach with caching for optimal performance and reliability.

## Architecture

### Primary Source: Finnhub
- **Endpoint**: `GET /api/v1/stock/peers`
- **Returns**: List of tickers in same country & GICS sub-industry
- **Cache**: 24 hours
- **Rate Limit**: 30 req/s (monitored as `FINNHUB_429`)

### Hydration: Twelve Data
- **Purpose**: Fetch display name, last price, and change for each peer
- **Rate Limits**:
  - Basic Plan: 8 requests/minute
  - Daily Cap: 800 requests/day
- **Handling**: Batch with 1s delays between requests
- **Degradation**: Show tickers without quotes if rate limited (monitored as `TD_429_MINUTE`)

### Fallback: Twelve Data Metadata
When Finnhub is unavailable or returns no peers:
1. Uses predefined sector/industry mappings
2. In production, would query TD `/profile` for sector/industry/market cap
3. Filters by same sector/industry, sorts by market cap proximity
4. Returns top 4-5 closest matches

## Usage

### Basic Usage

```javascript
import { getPeers, getPeersHydrated } from '../services/peers';

// Get peer ticker symbols only
const peers = await getPeers('RCL');
// Returns: ['CCL', 'NCLH', 'CUK', 'ONON']

// Get peers with quotes and names
const hydratedPeers = await getPeersHydrated('RCL');
// Returns: [
//   {
//     symbol: 'CCL',
//     name: 'Carnival Corporation',
//     lastPrice: 15.23,
//     change: 0.45,
//     changePercent: 3.04,
//     source: 'Twelve Data'
//   },
//   ...
// ]
```

### Cache Management

```javascript
import { invalidatePeers } from '../services/peers';

// Clear cache for specific symbol
invalidatePeers('AAPL');

// Clear all peer caches
invalidatePeers();
```

### Check Fallback Status

```javascript
import { isPeerDataFallback } from '../services/peers';

const isFallback = isPeerDataFallback('RCL');
// Returns: true if peers came from fallback, false if from Finnhub
```

## Caching Strategy

### Peers Cache (24 hours)
- **Key**: `peers:${SYMBOL}`
- **TTL**: 86,400 seconds (24 hours)
- **Storage**: In-memory Map
- **Purpose**: Avoid repeated Finnhub API calls

### Hydrated Cache (60 seconds)
- **Key**: `hydrated:${SYMBOL}`
- **TTL**: 60 seconds
- **Storage**: In-memory Map
- **Purpose**: Reduce TD API usage for quote refreshes

## Rate Limit Handling

### Finnhub 429
1. Check cache for existing data
2. If cache exists, return cached data
3. If no cache, fall back to TD-based discovery
4. Log event: `FINNHUB_429: Rate limit exceeded`

### Twelve Data 429 (Minute Limit)
1. Return peer tickers without quotes
2. Show "Loading..." for price data
3. Retry after minute reset
4. Log event: `TD_429_MINUTE: Twelve Data rate limit exceeded`

### Twelve Data Daily Cap (800 requests)
1. Similar to minute limit handling
2. Will reset at midnight UTC
3. Log event: `TD_800_DAILY: Daily cap reached`

## Configuration

All rate limits and TTLs are configurable in `src/services/peers.js`:

```javascript
const PEERS_CACHE_TTL = 86400000; // 24 hours
const HYDRATED_CACHE_TTL = 60000; // 60 seconds
const MAX_PEERS = 5;
```

## Example: Cruise Lines

For Royal Caribbean (RCL):
- **Finnhub returns**: CCL, NCLH (Norwegian Cruise Line Holdings)
- **Note**: MSC Cruises doesn't appear (private company)
- **Fallback**: CUK (Carnival UK), ONON (On Holding AG - travel sector)

## Monitoring

### Check Cache Performance

Look for log messages:
```
📋 [PEERS] Cache hit for RCL: ['CCL', 'NCLH']
🔍 [PEERS] Fetching peers for TSLA...
✅ [PEERS] Finnhub peers for TSLA: ['NIO', 'RIVN', 'LCID', 'F']
⚠️ [PEERS] No Finnhub peers for XYZ, trying fallback...
```

### Check Hydration Status

Look for log messages:
```
💧 [PEERS-HYDRATED] Hydrating 4 peers for RCL...
✅ [PEERS-HYDRATED] Hydrated 4 peers for RCL
⚠️ [PEERS-HYDRATED] Failed to hydrate CCL: Rate limit exceeded
```

### Check Rate Limits

Worker logs will show:
```
FINNHUB_429: Rate limit exceeded
TD_429_MINUTE: Twelve Data rate limit exceeded
```

## API Secrets

Secrets are stored in Cloudflare Worker (not exposed to client):
- `FINNHUB_TOKEN` - Finnhub API key
- `TWELVEDATA_KEY` - Twelve Data API key

To update:
```bash
npx wrangler secret put FINNHUB_TOKEN
npx wrangler secret put TWELVEDATA_KEY
```

## Testing

Run the test suite:
```bash
npm test src/services/peers.test.js
```

Key test cases:
- ✅ RCL returns CCL, NCLH (cruise peers)
- ✅ Excludes original symbol from results
- ✅ Respects 24h cache TTL
- ✅ Gracefully handles Finnhub 429
- ✅ Gracefully handles TD rate limits
- ✅ Hydrated data includes name + price

## Edge Cases

### Empty Peers
Some microcaps or odd listings may have no peers:
```javascript
const peers = await getPeers('OBSCURE');
// Returns: []
```

UI should show: "No peers available"

### Private Companies
Private companies (e.g., MSC Cruises) won't appear in peer lists since they're not publicly traded.

### Symbol Format
- Handles lowercase: `getPeers('aapl')` → `['MSFT', 'GOOGL', ...]`
- Handles special chars: `getPeers('BRK.A')` works
- Excludes self: `getPeers('AAPL')` never returns `'AAPL'`

## Future Enhancements

1. **Full TD Fallback**: Query TD `/profile` and `/stocks` for dynamic peer discovery
2. **Persistent Cache**: Move from in-memory to localStorage/Redis
3. **Sector Badges**: Show sector tags on peer tiles
4. **Market Cap Proximity**: Sort peers by similar market cap
5. **Configurable Limits**: Allow users to adjust max peers shown

## Related Files

- `src/services/peers.js` - Main peers service
- `src/utils/peerFetcher.js` - Legacy wrapper (deprecated)
- `workers/twelvedata.js` - Cloudflare Worker proxy
- `src/services/peers.test.js` - Test suite
- `DEPLOY_WORKER.md` - Worker deployment instructions
