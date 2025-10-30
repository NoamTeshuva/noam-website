/**
 * Twelve Data Rate Limit Manager
 * Handles global rate limit exhaustion state
 * When TD API returns "run out of API credits", blocks all further requests until midnight ET
 */

// Global exhaustion state
let TD_EXHAUSTED_UNTIL = null;

/**
 * Get midnight ET timestamp for today
 * @returns {number} - Timestamp in milliseconds
 */
const getMidnightET = () => {
  const now = new Date();
  const etDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));

  // Get tomorrow midnight ET
  const midnight = new Date(etDate);
  midnight.setHours(24, 0, 0, 0);

  return midnight.getTime();
};

/**
 * Check if TD API is currently exhausted
 * @returns {boolean} - True if exhausted and should not make requests
 */
export const isTDExhausted = () => {
  if (!TD_EXHAUSTED_UNTIL) return false;

  const now = Date.now();
  if (now >= TD_EXHAUSTED_UNTIL) {
    // Limit has reset, clear the flag
    TD_EXHAUSTED_UNTIL = null;
    console.log('✅ [RateLimit] TD API limit has reset at midnight');
    return false;
  }

  return true;
};

/**
 * Mark TD API as exhausted until midnight
 */
export const markTDExhausted = () => {
  TD_EXHAUSTED_UNTIL = getMidnightET();
  const resetTime = new Date(TD_EXHAUSTED_UNTIL).toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit'
  });

  console.error(`🚫 [RateLimit] TD API exhausted. Blocking all requests until midnight ET (${resetTime})`);
  console.log('[RateLimit] Switching to cached data only');
};

/**
 * Get time remaining until rate limit resets
 * @returns {string} - Human readable time (e.g., "2h 15m")
 */
export const getTimeUntilReset = () => {
  if (!TD_EXHAUSTED_UNTIL) return null;

  const now = Date.now();
  const msRemaining = TD_EXHAUSTED_UNTIL - now;

  if (msRemaining <= 0) return '0m';

  const hours = Math.floor(msRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

/**
 * Check if an error is a rate limit error
 * @param {Error|Object} error - Error object or response data
 * @returns {boolean} - True if it's a rate limit error
 */
export const isRateLimitError = (error) => {
  if (!error) return false;

  const errorMsg = error.message || error.error || error.code || JSON.stringify(error);
  const msgLower = errorMsg.toLowerCase();

  // TD API rate limit messages
  return msgLower.includes('run out of api credits') ||
         msgLower.includes('api credits') ||
         msgLower.includes('rate limit') ||
         msgLower.includes('too many requests') ||
         (error.code === 429) ||
         (error.status === 429);
};

/**
 * Handle TD API response and check for rate limit errors
 * @param {Response} response - Fetch response
 * @param {Object} data - Parsed JSON data
 * @returns {boolean} - True if rate limit was hit
 */
export const handleTDResponse = (response, data) => {
  // Check if data contains rate limit error
  if (data && isRateLimitError(data)) {
    markTDExhausted();
    return true;
  }

  // Check response status
  if (response && response.status === 429) {
    markTDExhausted();
    return true;
  }

  return false;
};

/**
 * Get exhaustion state for debugging
 */
export const getExhaustionState = () => {
  return {
    exhausted: isTDExhausted(),
    exhaustedUntil: TD_EXHAUSTED_UNTIL,
    timeRemaining: getTimeUntilReset(),
    resetTime: TD_EXHAUSTED_UNTIL ? new Date(TD_EXHAUSTED_UNTIL).toLocaleString('en-US', {
      timeZone: 'America/New_York'
    }) : null
  };
};

/**
 * Manually reset the exhaustion flag (for testing)
 */
export const resetExhaustion = () => {
  TD_EXHAUSTED_UNTIL = null;
  console.log('✅ [RateLimit] Exhaustion flag manually reset');
};

/**
 * Manually trigger exhaustion for testing (expires in 5 minutes)
 */
export const testExhaustion = (minutesUntilReset = 5) => {
  TD_EXHAUSTED_UNTIL = Date.now() + (minutesUntilReset * 60 * 1000);
  const resetTime = new Date(TD_EXHAUSTED_UNTIL).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
  console.warn(`🧪 [RateLimit TEST] Manually triggered exhaustion. Resets in ${minutesUntilReset} minutes (${resetTime})`);
  console.log('[RateLimit TEST] All TD API calls will now use cached data');
};

// Expose debug utilities to window for testing
if (typeof window !== 'undefined') {
  window.tdRateLimit = {
    markExhausted: markTDExhausted,
    reset: resetExhaustion,
    test: testExhaustion,
    getState: getExhaustionState,
    isExhausted: isTDExhausted
  };
  console.log('🔧 [RateLimit] Debug tools available: window.tdRateLimit');
}
