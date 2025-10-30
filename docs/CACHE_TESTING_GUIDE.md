# Rate Limit & Cached Data Testing Guide

## Overview

The app now includes a **global rate limit manager** that stops all TD API calls when credits are exhausted and shows cached data until midnight ET. This guide explains how to test this functionality.

---

## Testing Tools Added

### 1. Visual Test Button (UI)

Located in the Bloomberg header toolbar:

**"LIMIT" Button:**
- Click to enable rate limit test mode (5 minutes)
- Button turns yellow and changes to "CACHED" when active
- Click again to disable and resume normal API calls

### 2. Console Debug Tools

Available in browser console as `window.tdRateLimit`:

```javascript
// Check current state
window.tdRateLimit.getState()
// Returns: { exhausted, exhaustedUntil, timeRemaining, resetTime }

// Test exhaustion mode (5 minutes)
window.tdRateLimit.test(5)

// Mark as exhausted until midnight
window.tdRateLimit.markExhausted()

// Reset and resume normal operation
window.tdRateLimit.reset()

// Check if exhausted
window.tdRateLimit.isExhausted()
```

---

## How to Test Cached Data Display

### Method 1: Using the LIMIT Button (Recommended)

1. **Load the app and wait for data to load**
   - Make sure you see stock prices in the watchlist
   - Check that Overview tab shows data
   - Switch to Analysis tab to see technical indicators

2. **Click the "LIMIT" button in the header**
   - Button should turn yellow and change to "CACHED"
   - Toast notification appears: "⚠ Rate limit test mode enabled for 5 minutes"
   - Console shows: "🧪 Rate limit test mode enabled"

3. **Verify cached data indicators appear:**

   **Overview Tab:**
   - Data source shows: 🟡 "Cached Data (Rate Limit)"
   - Yellow warning below: "⚠ Rate limit exhausted. Resets in 5m"

   **Analysis Tab:**
   - Yellow banner appears at top:
     ```
     ⚠ CACHED DATA
     Rate limit reached. Showing cached data. Resets in 5m
     ```

4. **Try to refresh data:**
   - Click REFRESH button
   - Console should show:
     ```
     ⏸️ [TD API] Skipping AAPL quote - exhausted (resets in 5m)
     ⏸️ [TDStats] Using cached quote for AAPL - TD exhausted (resets in 5m)
     ```
   - Data should NOT change (still showing cached values)
   - Timestamps should NOT update

5. **Click "CACHED" button to disable test mode:**
   - Button returns to gray "LIMIT"
   - Toast: "✅ Rate limit test mode disabled"
   - Data refreshes automatically
   - Indicators change back to "Live Data (Twelve Data)"

---

### Method 2: Using Console Commands

```javascript
// 1. Enable exhaustion mode
window.tdRateLimit.test(5) // 5 minutes

// 2. Check state
window.tdRateLimit.getState()
// Should show: { exhausted: true, timeRemaining: "5m", ... }

// 3. Try to load Analysis tab
// Should see cached data warning

// 4. Reset
window.tdRateLimit.reset()
```

---

### Method 3: Simulate Real Rate Limit Error

To test with actual API error simulation:

```javascript
// Trigger exhaustion until midnight
window.tdRateLimit.markExhausted()

// Now ALL API calls will:
// 1. Return cached data if available
// 2. Show TD_EXHAUSTED error if no cache
// 3. Display yellow warnings in UI
```

---

## Expected Behaviors

### When Rate Limit is Exhausted:

✅ **No API calls are made**
- Console shows "⏸️ Skipping {symbol} quote - exhausted"

✅ **Cached data is displayed**
- If data was previously loaded, it continues to show
- Timestamps don't update
- Data remains static

✅ **Yellow indicators appear**
- Overview: 🟡 "Cached Data (Rate Limit)"
- Analysis: Yellow banner with reset time
- LIMIT button turns yellow, shows "CACHED"

✅ **Countdown shows time until reset**
- "Resets in 5m" → "Resets in 4m" → etc.

### When Cache is Empty:

If rate limit hits BEFORE any data was loaded:

❌ Analysis tab shows error:
```
Rate limit exhausted. No cached data available. Resets in 5m
```

💡 **Solution:** Let app load data first, then test rate limit

---

## Cache Persistence

### localStorage Cache

Data is now persisted to localStorage:

```javascript
// View cached data
localStorage.getItem('tdStatsCache')
// Contains: { quotes: {...}, series: {...}, timestamp: ... }

// Cache TTL:
// - In-memory: 60s (quotes), 15min (series)
// - localStorage: 24 hours
```

**Benefits:**
- Survives page refreshes
- Available immediately on page load
- Works even if rate limit hit before first load

---

## Console Logs to Watch

### Normal Operation:
```
📊 [TDStats] Fetching quote for AAPL...
✅ [TDStats] Got quote for AAPL: $150.25
📋 [TDStats] Quote cache hit for AAPL
```

### Rate Limit Active:
```
🚫 [RateLimit] TD API exhausted. Blocking requests until midnight ET
⏸️ [TD API] Skipping AAPL quote - exhausted (resets in 2h 15m)
⏸️ [TDStats] Using cached quote for AAPL - TD exhausted (resets in 2h 15m)
```

### Cache Loading:
```
📦 [TDStats] Loaded 5 quotes and 5 series from persistent cache
```

---

## Troubleshooting

### Issue: "No cached data" error when testing

**Solution:**
1. Load app and wait for data to appear
2. Verify prices are showing in watchlist
3. THEN click LIMIT button

### Issue: Data still updates after enabling test mode

**Check:**
1. Is button showing "CACHED" (yellow)?
2. Check console: `window.tdRateLimit.isExhausted()` should return `true`
3. Look for "⏸️ Skipping" messages in console

### Issue: Cache doesn't persist across refreshes

**Check:**
1. Open DevTools → Application → Local Storage
2. Look for `tdStatsCache` key
3. If missing, check browser settings (localStorage enabled?)

---

## Testing Checklist

- [ ] Load app, see live data in Overview
- [ ] Switch to Analysis tab, see technical indicators
- [ ] Click LIMIT button → turns yellow, shows "CACHED"
- [ ] Overview shows "Cached Data (Rate Limit)" indicator
- [ ] Analysis shows yellow "CACHED DATA" banner
- [ ] Click REFRESH → data doesn't change
- [ ] Console shows "⏸️ Skipping" messages
- [ ] Countdown timer shows "Resets in Xm"
- [ ] Click CACHED button → returns to "LIMIT", resumes API calls
- [ ] Data refreshes, shows "Live Data" indicator
- [ ] Refresh page → localStorage cache loads automatically

---

## Demo Flow for Testing

```bash
# 1. Start app
npm start

# 2. Wait for data to load (watch console)
# Should see: "✅ [TDStats] Got quote for AAPL"

# 3. Click LIMIT button
# Should see yellow indicators appear

# 4. Try to refresh
# Console: "⏸️ Skipping AAPL quote"

# 5. Open Analysis tab
# Yellow banner: "⚠ CACHED DATA"

# 6. Click CACHED button to disable
# Everything returns to normal

# 7. Refresh page
# Cache loads from localStorage
# Console: "📦 [TDStats] Loaded X quotes from persistent cache"
```

---

## Build Status

✅ **Successfully compiled**
- Bundle: 83.33 kB (+768 B)
- Includes localStorage cache persistence
- Includes test button and debug tools

---

## Summary

The rate limit handler is now fully functional with:

✅ Global exhaustion state management
✅ Automatic cache fallback
✅ localStorage persistence (24h)
✅ Visual UI indicators
✅ Test button in header
✅ Console debug tools
✅ Countdown timer to reset
✅ Automatic midnight reset

**You should now be able to:**
1. Click LIMIT button to test
2. See cached data indicators
3. Verify no API calls are made
4. Toggle back to normal mode anytime
