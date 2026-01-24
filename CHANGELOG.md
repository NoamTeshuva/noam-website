# Changelog

All notable changes to the Financial Market Terminal project will be documented in this file.

## [Unreleased]

### Added
- **Client-side caching architecture**: New localStorage-based cache with market-hours-aware TTLs
  - `src/services/cacheManager.js`: Central cache manager with stale-while-revalidate pattern
  - `src/utils/marketHours.js`: Shared utility for checking US market hours
  - `src/services/cacheWarmer.js`: Optional cache preloading with staggered requests
- **Cache-first API wrappers**: `cachedTwelveDataAPI` in `api.js` for automatic caching
- **Instant page load**: Cached data displays immediately on page refresh
- **Offline support**: App shows stale cached data when network is unavailable
- **Cache metadata**: Data includes `_cached`, `_stale`, `_offline` flags for UI indicators
- **Cache statistics**: `getCacheStats()` function for debugging cache state

### Changed
- **Dynamic edge cache TTLs**: Worker now uses market-aware TTLs
  - Quotes: 60s (market open) / 1hr (closed)
  - Statistics: 1hr (open) / 24hr (closed)
- **Stale-while-revalidate headers**: Added to Cloudflare Worker responses
- **useSmartPolling**: Now loads cached data instantly before fetching fresh data
- **Expected API reduction**: ~60-70% fewer calls (from ~300-400/day to ~100-150/day)
- **Mobile-responsive UI**: Complete mobile interface overhaul
  - Header: Hamburger menu on mobile with dropdown for all actions
  - Sidebar: Full-width on mobile (`w-full sm:w-80`), improved overlay behavior
  - Stock grid: Responsive columns (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)
  - Touch targets: Increased button/input sizes on mobile (min 44px)
  - Peers panel: Optimized layout, hidden volume info on mobile
  - Login page: Larger input fields for touch
  - Status indicator: Compact version on mobile

### Security
- **Server-side authentication**: Replaced hardcoded client-side credentials with secure Cloudflare Worker authentication
  - Added `/api/auth/login` endpoint with password hashing (SHA-256 with salt)
  - Added `/api/auth/verify` endpoint for JWT token validation
  - Implemented rate limiting (5 attempts per minute per IP)
  - JWT tokens expire after 24 hours
- **Token-based sessions**: Sessions now use JWT tokens stored in sessionStorage
  - Tokens are verified on page load and periodically (every 5 minutes)
  - Auto-logout on token expiration
  - Logout functionality added to terminal header

### Fixed
- **Fundamentals data not loading**: Added `/statistics` API endpoint to fetch P/E ratio, EPS, Beta, Market Cap, 52-week high/low, and dividend yield
- **Loading state timing**: Fixed `isLoading` clearing before staggered fetches complete by tracking pending fetches
- **Market cap calculation**: Removed incorrect multiplication by 1,000,000 (API already returns actual value)
- **Search input**: Connected search input to state with filtering and autocomplete for watchlist symbols
- **Details panel**: Fixed condition to only show when price data is available
- **Rate limit handling**: Added status code check before JSON parsing to prevent errors on 429 responses

### Changed
- Login page now shows loading state during authentication
- Already logged-in users are redirected from login page to terminal

## [1.0.0] - 2025-01-23

### Added
- Initial Bloomberg-style terminal implementation
- Real-time stock quotes via Twelve Data API
- Peer comparison via Finnhub API
- Watchlist management with persistence
- Volume spike detection and notifications
- API call counter to track daily usage
- Cloudflare Worker proxy for API key security
- Edge caching for reduced API calls
