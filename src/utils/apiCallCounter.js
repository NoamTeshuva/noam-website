/**
 * API Call Counter
 * Tracks Twelve Data API calls per day with localStorage persistence
 * Resets at midnight ET (when Twelve Data limits reset)
 */

const STORAGE_KEY = 'td_api_call_count';
const STORAGE_DATE_KEY = 'td_api_call_date';

/**
 * Get today's date in ET timezone as YYYY-MM-DD
 */
const getTodayET = () => {
  const now = new Date();
  const etDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return etDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
};

/**
 * Get current API call count for today
 * @returns {number} - Number of API calls made today
 */
export const getAPICallCount = () => {
  const today = getTodayET();
  const storedDate = localStorage.getItem(STORAGE_DATE_KEY);

  // If the date has changed (new day), reset the counter
  if (storedDate !== today) {
    localStorage.setItem(STORAGE_DATE_KEY, today);
    localStorage.setItem(STORAGE_KEY, '0');
    return 0;
  }

  const count = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
  return count;
};

/**
 * Increment API call counter
 * @param {string} endpoint - Optional endpoint name for logging
 * @returns {number} - New total count
 */
export const incrementAPICallCount = (endpoint = 'unknown') => {
  const currentCount = getAPICallCount();
  const newCount = currentCount + 1;

  localStorage.setItem(STORAGE_KEY, newCount.toString());

  console.log(`📊 [API Counter] Call #${newCount} today - ${endpoint}`);

  // Warn if approaching limit (Twelve Data free tier is 800/day)
  if (newCount === 600) {
    console.warn('⚠️ [API Counter] 600 calls reached - 75% of daily limit (800)');
  } else if (newCount === 700) {
    console.warn('⚠️ [API Counter] 700 calls reached - 87.5% of daily limit (800)');
  } else if (newCount === 750) {
    console.warn('🚨 [API Counter] 750 calls reached - 93.75% of daily limit (800)');
  }

  return newCount;
};

/**
 * Reset API call counter (for testing or manual reset)
 */
export const resetAPICallCount = () => {
  localStorage.setItem(STORAGE_KEY, '0');
  localStorage.setItem(STORAGE_DATE_KEY, getTodayET());
  console.log('✅ [API Counter] Counter manually reset');
};

/**
 * Get detailed counter state
 */
export const getAPICounterState = () => {
  const count = getAPICallCount();
  const date = localStorage.getItem(STORAGE_DATE_KEY);
  const limit = 800; // Twelve Data free tier limit
  const remaining = Math.max(0, limit - count);
  const percentUsed = ((count / limit) * 100).toFixed(1);

  return {
    count,
    date,
    limit,
    remaining,
    percentUsed: parseFloat(percentUsed),
    isNearLimit: count >= 700,
    isAtLimit: count >= 800
  };
};

// Expose debug utilities to window for testing
if (typeof window !== 'undefined') {
  window.apiCounter = {
    get: getAPICallCount,
    increment: incrementAPICallCount,
    reset: resetAPICallCount,
    getState: getAPICounterState
  };
  console.log('🔧 [API Counter] Debug tools available: window.apiCounter');
}
