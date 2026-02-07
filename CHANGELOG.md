# Changelog

All notable changes to the Financial Market Terminal will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-02-07

### Fixed - Phase 6: Cache & Data Handling Bug Fixes

#### Critical: Time Series Cache Reads Broken (`src/utils/api.js`)
- `cachedTwelveDataAPI.getTimeSeries()` spread an array into an object via `cacheFirst()`, making cached time series always return `[]`
- Fix: Wrap array in `{ values: data }` object before caching, unwrap on read
- Time series caching now works correctly for stale-while-revalidate

#### High: Force Refresh Never Bypassed Cache (`src/hooks/useSmartPolling.js`)
- `forceRefreshSymbol()` and `forceRefreshAll()` passed `true` to `fetchFundamentalsData` parameter instead of `forceRefresh`
- Fix: Pass `true` to both parameters — `fetchStockData(symbol, true, true)`

#### High: Settings Page Runtime Crashes (`src/pages/Settings.jsx`)
- Called `indexedDBService.getStatistics()` and `clearAllData()` — methods that don't exist
- Fix: Changed to correct method names `getStats()` and `clearAll()`
- Fixed property name mismatches: `historicalQuotes` → `quotes`, `alertHistory` → `alerts`

#### Moderate: tdStats API Calls Invisible to Counter (`src/services/tdStats.js`)
- `fetchTDQuote()` and `fetchTDSeries()` made raw `fetch()` calls bypassing `api.js`, so API calls were never counted by `apiCallCounter`
- Fix: Added `incrementAPICallCount()` import and calls after successful fetches
- API counter now accurately reflects all Twelve Data usage

#### Moderate: PeersPanel Bypassed Cache Manager (`src/components/PeersPanel.jsx`)
- Used raw `twelveDataAPI.getQuote()` instead of `cachedTwelveDataAPI.getQuote()`
- Fix: Switched to cached API — peer quotes now share cache with main quote system
- Eliminates duplicate fetches when a peer is also in the watchlist

#### Moderate: Rate Limit Flag Lost on Page Refresh (`src/utils/rateLimitManager.js`)
- `TD_EXHAUSTED_UNTIL` was in-memory only, reset on every page refresh
- Fix: Persisted to localStorage (`td_exhausted_until` key), loaded on init, cleared on reset/expiry
- App no longer wastes API calls re-hitting rate limits after refresh

#### Low: Duplicate isMarketOpen Implementations
- 4 separate implementations of market hours checking across the codebase
- Fix: `peerSeriesCache.js` and `peerQuotesCache.js` now import from shared `marketHours.js` utility
- Reduces risk of divergent behavior between files

### Added - Phase 5: Peer Analysis (Correlation, Lead/Lag & Divergence Detection)

#### Correlation & Math Utilities
- **New Utility**: `src/utils/correlationUtils.js` (~175 lines) - Pure math functions for peer analysis
  - `computeReturns(closes)` - Daily return series from close prices
  - `computeCorrelation(returnsA, returnsB)` - Pearson correlation coefficient (-1 to 1)
  - `computeCorrelationMatrix(symbolReturnsMap, period)` - NxN correlation matrix
  - `computeRelativeStrength(symbolClosesMap, periods)` - Cumulative returns per symbol
  - `computeLeadLag(returnsA, returnsB, maxLag)` - Cross-correlation at offsets, identifies leader/follower
  - `detectDivergence(stockReturns, peerReturnsArray, window)` - Flags when stock breaks from peer group (>2σ)

#### Peer Series Cache
- **New Service**: `src/services/peerSeriesCache.js` (~130 lines) - localStorage cache for peer daily bars
  - 1-hour TTL during market hours (daily bars don't change intraday)
  - Unlimited TTL when market closed
  - 24-hour auto-cleanup of stale entries
  - Handles QuotaExceededError gracefully

#### Peer Series Data Hook
- **New Hook**: `src/hooks/usePeerSeries.js` (~120 lines) - Lazy-loading hook for peer time series
  - Takes `(symbol, enabled)` — only fetches when user clicks Peers tab
  - Gets peer tickers from watchlist store (`getPeersFor`)
  - Reuses `fetchTDSeries` 15-min in-memory cache for main stock (0 API calls if cached)
  - Fetches each peer's 200 daily bars with 8s stagger between requests
  - Checks `peerSeriesCache` before each fetch; skips if cached
  - Returns `{ seriesMap, peers, loading, progress, error }`
  - Respects rate limits: checks `isTDExhausted()` before each fetch

#### Peer Analysis UI Component
- **New Component**: `src/components/PeerAnalysis.jsx` (~330 lines) - Bloomberg-style peer analysis panel
  - **Correlation Heatmap**: CSS grid with color-coded cells (green=positive, red=negative, gray=zero). Period selector: 30d/60d/90d
  - **Relative Performance**: Horizontal bars centered at zero. Main stock highlighted. Peer group average row. Period selector: 1W/1M/3M/6M
  - **Lead/Lag Signals**: Compact table showing peer, correlation, lag days, and direction (PEER LEADS/STOCK LEADS/SYNC)
  - **Divergence Alert**: Conditional banner when stock diverges >2σ from peer group. Shows OUTPERFORM/UNDERPERFORM with z-score
  - Loading state with progress bar matching PeersPanel pattern
  - Empty state with "No peers available" message

#### Tab Integration
- **Modified**: `src/pages/BloombergSimple.jsx`
  - Replaced dead "Chart" tab placeholder with functional "Peers" tab
  - Added `onClick` handler and active styling (matching existing tab pattern)
  - Added `PeerAnalysis` component import
  - Added `{activeTab === 'peers' && <PeerAnalysis symbol={selectedStock} />}` content block

#### API Rate Limit Budget
| Scenario | API Calls | Notes |
|----------|-----------|-------|
| First tab open (cold cache) | ~5 | 5 peer series fetched, main stock reuses tdStats cache |
| Tab reopen within 1hr | 0 | All from peerSeriesCache (localStorage) |
| Daily budget (6 stocks) | ~30 | Well within 800/day limit |

---

## [Unreleased] - 2026-01-31

### Added - Phase 1: Foundation (Offline Mode & 50 Symbols Support)

#### Offline Detection System
- **New Service**: `src/services/offlineDetector.js` - Monitors network connectivity and data freshness
  - Tracks `navigator.onLine` status
  - Detects failed API requests (considers offline after 3 consecutive failures)
  - Provides event-based API for components to subscribe to offline/online state changes
  - Exposes utility methods: `getStaleTime()`, `formatCacheAge()`, `isDataStale()`
  - Singleton pattern with `window.offlineDetector` for debugging

- **New Hook**: `src/hooks/useOfflineStatus.js` - React hook for consuming offline state
  - Returns: `{ isOffline, staleSince, failedRequestCount, lastSuccessfulRequest, timeSinceLastSuccess }`
  - Provides helper methods for formatting cache age and stale time
  - Automatically subscribes/unsubscribes to offline detector events

#### Watchlist Capacity Increase
- **Modified**: `src/store/useWatchlistStore.js:5`
  - Increased `MAX_WATCHLIST_SYMBOLS` from 10 to 50
  - Enables tracking up to 50 symbols simultaneously
  - API usage estimate: ~500-600 calls/day (68-75% of 800 daily limit)

#### UI Integration - Offline & Stale Data Indicators
- **Modified**: `src/pages/BloombergSimple.jsx`
  - Added `useOfflineStatus` hook integration
  - **Offline Banner**: Dismissible yellow banner appears when offline, shows time since data became stale
  - **Stale Indicators**: Color-coded badges on each stock showing cache age
    - Red badge: Offline mode (no connection)
    - Yellow badge: Stale data (revalidating in background)
    - Gray badge: Fresh cached data
  - Imported `WifiOff` icon from lucide-react for visual clarity

### Changed
- Storage architecture redesigned with 4-tier approach:
  - Tier 1: In-memory (hot data, session only)
  - Tier 2: localStorage (warm data, 1-7 days TTL)
  - Tier 3: IndexedDB (cold storage, 30-90 days TTL) - Coming in Phase 2
  - Tier 4: Cloudflare KV (cloud sync, permanent) - Coming in Phase 3

### Technical Details
- **Framework**: React 18.2
- **State Management**: Zustand (with persist middleware for watchlist)
- **Caching Strategy**: Stale-while-revalidate pattern (already implemented in `cacheManager.js`)
- **Market Hours Awareness**: TTLs adjust based on market open/closed status
- **Browser APIs Used**:
  - `navigator.onLine` for network detection
  - `localStorage` for persistent cache (5-10MB limit)
  - `sessionStorage` for JWT auth tokens
  - IndexedDB (coming soon) for historical data (50MB-1GB)

### Added - Phase 2: Historical Data (IndexedDB for 90-Day Retention)

#### IndexedDB Service
- **New Service**: `src/services/indexedDBService.js` (~620 lines) - Local database for historical data
  - **Database**: `MarketTerminalDB` v1 with 3 object stores
  - **Store 1**: `historicalQuotes` - Daily quote snapshots (90-day retention)
  - **Store 2**: `alertHistory` - Volume spike and alert logs (90-day retention)
  - **Store 3**: `timeSeries` - OHLCV bars for charts (7 days for 1min, 2 years for daily)
  - **Operations**: Save/retrieve quotes, alerts, and time series data
  - **Auto-cleanup**: Removes entries older than retention period on startup
  - **Statistics**: Track database size and entry counts
  - Exposed to `window.indexedDBService` for debugging

#### Schema Migrations
- **New Service**: `src/services/schemaMigrations.js` (~320 lines) - Database versioning and validation
  - Schema version tracking in localStorage
  - Migration registry for future schema changes
  - Data validators for quotes, alerts, and time series bars
  - Sanitizers for data integrity (normalize symbols, validate OHLC relationships)
  - Exposed to `window.schemaMigrations` for debugging

#### Auto-Save Historical Data
- **Modified**: `src/hooks/useSmartPolling.js`
  - Imported `indexedDBService` for quote snapshot saving
  - Added `lastSnapshotTimeRef` to track snapshot timing per symbol
  - Added `saveQuoteSnapshot()` function with 5-minute batching
  - Saves fresh quote data (not cached/stale) when market is open
  - Non-blocking saves (failures don't interrupt polling)

#### Alert Logging
- **Modified**: `src/components/NotificationToast.jsx`
  - Imported `indexedDBService` for alert logging
  - Modified `volumeSpike()` method to save alerts to IndexedDB
  - Added `extractSymbolFromMessage()` helper to parse symbol from message
  - Logs alert metadata (symbol, type, message, timestamp) automatically
  - Non-blocking saves (failures show console warning)

### Added - Phase 3: Multi-Device Sync (Cloudflare Workers + KV)

#### Cloudflare Worker Sync Endpoints
- **Modified**: `workers/twelvedata.js` - Added sync routing and handlers (~250 lines)
  - **Endpoint**: `POST/GET /api/sync/watchlist` - Upload/download watchlist
  - **Endpoint**: `POST/GET /api/sync/preferences` - Upload/download user preferences
  - **Endpoint**: `POST/GET /api/sync/alerts` - Upload/download custom alerts
  - **Endpoint**: `GET /api/sync/status` - Get last sync timestamps for all data types
  - **Authentication**: JWT token required for all sync endpoints
  - **Storage**: Cloudflare KV namespace `MARKET_TERMINAL_SYNC`
  - **Conflict Resolution**: Last-write-wins based on timestamp
  - **Data Format**: `user:{username}:watchlist`, `user:{username}:preferences`, etc.

#### Frontend Sync Manager
- **New Service**: `src/services/syncManager.js` (~380 lines) - Client-side sync coordinator
  - **Local-first strategy**: Immediate local writes, background cloud sync
  - **Operations**: `syncWatchlist()`, `syncPreferences()`, `syncAlerts()`, `syncAll()`
  - **Conflict resolution**: Last-write-wins with timestamp comparison
  - **Pending changes tracking**: Marks data as needing sync in localStorage
  - **Last sync time**: Persists sync timestamps per data type
  - **Event system**: Subscribe to sync events (started, completed, failed)
  - **Retry logic**: 3 retries with exponential backoff
  - Exposed to `window.syncManager` for debugging

#### useSync React Hook
- **New Hook**: `src/hooks/useSync.js` (~160 lines) - React wrapper for sync manager
  - Returns: `{ isSyncing, lastSyncTime, pendingChanges, syncError, syncWatchlistToCloud, ... }`
  - **syncWatchlistToCloud()**: Push watchlist to cloud
  - **pullWatchlistFromCloud()**: Pull watchlist from cloud
  - **syncAll()**: Sync all data types (watchlist, preferences, alerts)
  - **getTimeSinceSync()**: Format time since last sync (e.g., "5m ago")
  - **needsSync()**: Check if there are pending changes
  - **markWatchlistChanged()**: Mark watchlist as needing sync
  - Auto-subscribes to sync manager events and updates state

#### Sync Button UI Integration
- **Modified**: `src/pages/BloombergSimple.jsx`
  - Added sync button to header toolbar (desktop view)
  - **Visual indicators**:
    - Orange text + dot when pending changes detected
    - Pulsing icon during active sync
    - Tooltip shows last sync time or "Sync pending"
  - **Toast notifications**: Success/error messages on sync completion
  - Imported `Cloud` icon from lucide-react
  - Integrated with useSync hook for real-time sync status

### Added - Phase 4: Polish & Performance (Settings Panel & Data Management)

#### User Preferences Store
- **New Store**: `src/store/usePreferencesStore.js` (232 lines) - Zustand store for user settings
  - **Settings**: theme (dark/light), layout (compact/spacious), font size
  - **Data Refresh**: refresh interval, auto-refresh toggle
  - **Notifications**: enable/disable, duration, volume spike threshold
  - **Chart Settings**: default interval, period, show indicators
  - **API Settings**: show counter, warn at limit
  - **Display**: compact mode, font size (small/medium/large)
  - Persists to localStorage with partialize middleware
  - Syncs with cloud via syncManager
  - Exposes `getAllPreferences()` and `setFromSyncedData()` for sync operations

#### Data Export/Import Utility
- **New Service**: `src/utils/exportImport.js` (380 lines) - Comprehensive data export/import
  - **Export Formats**: JSON and CSV for watchlist, preferences, alerts
  - **Export Functions**:
    - `downloadWatchlist(data, format)` - Export watchlist as JSON or CSV
    - `downloadPreferences(prefs)` - Export preferences as JSON
    - `downloadAlertHistory(symbol, format)` - Export alerts as JSON or CSV
    - `downloadFullBackup(watchlist, prefs)` - Full backup with all data
  - **Import Functions**:
    - `importWatchlistJSON(file)` - Import watchlist from JSON
    - `importWatchlistCSV(file)` - Import watchlist from CSV
    - `importPreferencesJSON(file)` - Import preferences from JSON
    - `importFullBackup(file)` - Restore full backup
  - **Validation**: File type checking, data structure validation
  - **Error Handling**: Descriptive error messages for failed imports

#### Alert History Viewer Component
- **New Component**: `src/components/AlertHistoryPanel.jsx` (242 lines) - Modal for viewing alerts
  - Loads last 100 alerts from IndexedDB
  - **Filtering**: By symbol (text search) and type (volume_spike, price_alert)
  - **Display**: Shows symbol, type, timestamp, message, and metadata
  - **Timestamps**: Relative time (5m ago) and absolute date/time
  - **Export**: CSV and JSON export with active filters applied
  - **UI**: Bloomberg terminal styling with orange accents
  - Integrates with `indexedDBService.getAlertHistory()` and `downloadAlertHistory()`

#### Settings Panel Page
- **New Page**: `src/pages/Settings.jsx` (550 lines) - Comprehensive settings management
  - **4 Tabs**: Preferences, Cache, Sync, Data

  **Preferences Tab**:
  - Appearance: theme, layout, font size, compact mode
  - Data Refresh: interval (1-60 min), auto-refresh toggle
  - Notifications: enable/disable, volume spike threshold, duration
  - Reset to defaults button

  **Cache Tab**:
  - Storage statistics (localStorage + IndexedDB sizes)
  - Entry counts (quotes, alerts, time series)
  - Refresh statistics button
  - Clear cache button (preserves auth & settings)

  **Sync Tab**:
  - Last sync timestamp with relative time
  - Sync status (syncing/pending/up to date)
  - Manual sync button
  - Error messages display

  **Data Tab**:
  - Export: Watchlist (JSON/CSV), Preferences (JSON), Full Backup
  - Import: Watchlist (JSON/CSV), Preferences (JSON)
  - File upload with validation

  - **Footer**: Shows watchlist count (X/50), API counter status, version
  - **Success/Error Messages**: Toast-style notifications
  - Protected route requiring authentication

#### UI Integration - Settings Access
- **Modified**: `src/App.js`
  - Added `/settings` route (protected, requires authentication)
  - Imported Settings component
- **Modified**: `src/pages/BloombergSimple.jsx`
  - Added Settings button to header toolbar (desktop)
  - Added Settings button to mobile menu
  - Imported Settings icon from lucide-react
  - Uses `navigate('/settings')` for navigation

### Completed
- Phase 1: Foundation (Offline Mode & 50 Symbols Support) ✅
- Phase 2: Historical Data (IndexedDB for 90-Day Retention) ✅
- Phase 3: Multi-Device Sync (Cloudflare Workers + KV) ✅
- Phase 4: Polish & Performance (Settings Panel & Data Management) ✅

### Architecture Notes
- All offline/stale detection leverages existing `_offline`, `_stale`, `_cached` flags in `cacheManager.js:260-263, 369-373`
- Backward compatible - no breaking changes to existing functionality
- Rollback plan: Can revert watchlist limit to 10 by changing line 5 in `useWatchlistStore.js`

---

## [Previous Version] - 2026-01-30

### Added
- Yahoo Finance integration for market-closed hours
- Bloomberg-style data density layout redesign
- Stochastic Oscillator indicator
- Pivot points and support/resistance levels
- Signal summary with overall bias indicator

### Technical Commits
- `83a4e92` Add Yahoo Finance integration for market-closed hours
- `1a8cd61` Redesign analysis layout for Bloomberg-style data density
- `c98d0ac` Add Stochastic Oscillator indicator
- `c9bffdd` Add pivot points and support/resistance levels
- `fc63b33` Add signal summary with overall bias indicator

---

## Future Enhancements

### Phase 2: Historical Data (Planned)
- IndexedDB service with 90-day quote history
- Alert history logging and viewer
- Time series data storage for charts
- Schema migrations and versioning
- Automatic cleanup of expired data

### Phase 3: Multi-Device Sync (Planned)
- Cloudflare Workers sync endpoints (`/api/sync/*`)
- Cloudflare KV integration for cloud storage
- Local-first sync strategy with conflict resolution
- Manual sync button in UI
- Auto-sync every 5 minutes (optional)

### Phase 4: Polish & Performance (Planned)
- User preferences store (theme, layout, refresh interval)
- Settings panel with cache statistics dashboard
- Data export/import (JSON, CSV)
- Alert history viewer component
- Performance optimizations (batch IndexedDB writes, lazy loading)

---

## Storage Usage Estimates

### Current (10 symbols)
- localStorage: ~100-250KB
- sessionStorage: ~600B (JWT token)
- Total: ~250KB

### Target (50 symbols)
- localStorage: ~500KB-2MB (quotes, stats, cache)
- IndexedDB: ~20-50MB (90-day history, alerts, charts)
- Cloudflare KV: <100KB per user (watchlist, preferences, alerts)
- Total: ~22-52MB

### API Call Estimates

**Current (10 symbols):**
- Quote calls: ~100/day
- Statistics calls: ~10/day
- Total: ~110/day (13.75% of 800 limit)

**Target (50 symbols):**
- Quote calls: ~500/day (100 polls × 50 symbols)
- Statistics calls: ~50/day (1 per symbol)
- Peer calls: ~500 one-time (10 peers × 50 symbols)
- Total: ~550-600/day (68-75% of 800 limit)

**Mitigation:**
- Aggressive caching (already implemented)
- UI warnings at 30 symbols: "Approaching API limits"
- UI warnings at 40 symbols: "High API usage - may hit daily limit"
- Cache hit rate target: >80%

---

## Development Notes

### Files Created (Phase 1)
1. `src/services/offlineDetector.js` (213 lines)
2. `src/hooks/useOfflineStatus.js` (38 lines)
3. `CHANGELOG.md` (this file)

### Files Modified (Phase 1)
1. `src/store/useWatchlistStore.js` - Line 5 (MAX_WATCHLIST_SYMBOLS: 10 → 50)

### Files Pending
- `src/pages/BloombergSimple.jsx` - Add offline banner and sync button
- `src/services/indexedDBService.js` - IndexedDB wrapper (Phase 2)
- `src/services/schemaMigrations.js` - Schema versioning (Phase 2)
- `src/services/syncManager.js` - Cloud sync coordinator (Phase 3)
- `workers/twelvedata.js` - Add sync endpoints (Phase 3)
- `src/pages/Settings.jsx` - Settings panel (Phase 4)

---

## Links
- **Live URL**: https://noamteshuva.com
- **Deployment**: GitHub Pages (frontend) + Cloudflare Workers (API proxy)
- **Plan Document**: `.claude/plans/effervescent-purring-valley.md`
