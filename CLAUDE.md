# Claude Code Context - Financial Market Terminal

## Project Overview

A Bloomberg-style financial market terminal built with React, providing real-time stock data visualization with a dark terminal aesthetic.

**Live URL**: https://noamteshuva.com
**Deployment**: GitHub Pages (frontend) + Cloudflare Workers (API proxy)

## Tech Stack

- **Frontend**: React 18.2, Tailwind CSS
- **State Management**: Zustand (for watchlist persistence)
- **API Proxy**: Cloudflare Workers
- **Market Data APIs**: Twelve Data (quotes, statistics), Finnhub (peers)

## Architecture

```
src/
├── App.js                     # Main app with routing and auth context
├── pages/
│   ├── Login.jsx              # JWT-based authentication
│   ├── BloombergSimple.jsx    # Main terminal UI
│   └── BloombergWannabe.jsx   # Alternative terminal view
├── hooks/
│   └── useSmartPolling.js     # Market data polling with rate limiting
├── utils/
│   ├── api.js                 # Twelve Data API client
│   ├── rateLimitManager.js    # API rate limit tracking
│   └── apiCallCounter.js      # Daily API call counter
├── components/
│   ├── WatchlistSidebar.jsx   # Watchlist management
│   ├── PeersPanel.jsx         # Stock peer comparison
│   └── NotificationToast.jsx  # Volume spike alerts
└── store/
    └── useWatchlistStore.js   # Zustand store for watchlist

workers/
└── twelvedata.js              # Cloudflare Worker API proxy + auth
```

## Key Files

| File | Purpose |
|------|---------|
| `workers/twelvedata.js` | API proxy with auth endpoints, JWT generation, rate limiting |
| `src/hooks/useSmartPolling.js` | Smart polling that respects market hours and API limits |
| `src/utils/api.js` | API client with rate limit handling |
| `src/pages/BloombergSimple.jsx` | Main terminal UI component |

## Authentication Flow

1. User submits credentials to `/api/auth/login`
2. Worker verifies password hash (SHA-256 with salt)
3. Worker returns JWT token (24h expiry)
4. Token stored in sessionStorage
5. App verifies token on load via `/api/auth/verify`
6. Token checked every 5 minutes for expiration

**Environment Variables Required (Cloudflare Worker):**
- `JWT_SECRET`: Secret key for JWT signing
- `AUTH_USERNAME`: Authorized username (lowercase)
- `AUTH_PASSWORD_HASH`: Password hash in format `salt:hash`
- `TWELVEDATA_KEY`: Twelve Data API key
- `FINNHUB_TOKEN`: Finnhub API token

To generate a password hash, use the `generatePasswordHash()` function in the worker.

## API Rate Limits

- **Twelve Data Free Tier**: 8 requests/minute, 800 requests/day
- **Polling Interval**: 4 minutes during market hours
- **Caching**: 60 second edge cache on Cloudflare

## Common Tasks

### Adding a New API Endpoint
1. Add handler function in `workers/twelvedata.js`
2. Add client function in `src/utils/api.js`
3. Handle rate limit checks before and after fetch

### Modifying Stock Data Display
1. Check if data is available in `useSmartPolling.js` response
2. Update `BloombergSimple.jsx` to display new fields
3. Add formatter in `useSmartPolling.js` if needed

### Debugging API Issues
1. Check browser console for rate limit messages
2. Verify API counter in terminal header
3. Check Cloudflare Worker logs for upstream errors

## Conventions

- **Styling**: Tailwind with custom `bloomberg-*` color palette
- **State**: Local state for UI, Zustand for persistent data
- **Error Handling**: Show "---" for missing data, toast for errors
- **Date/Time**: Always convert to Eastern Time for market hours

## Testing Locally

```bash
npm start                    # Start React dev server
wrangler dev workers/       # Start Cloudflare Worker locally
```

Set `REACT_APP_WORKER_URL=http://localhost:8787/api` for local worker.
