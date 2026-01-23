# Changelog

All notable changes to the Financial Market Terminal project will be documented in this file.

## [Unreleased]

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
