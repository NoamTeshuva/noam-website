/**
 * Market Hours Utility
 * Shared utility for checking US market hours (NYSE/NASDAQ)
 */

/**
 * Get current time in Eastern Time zone
 * @returns {Date} Current time in ET
 */
export function getEasternTime() {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
}

/**
 * Check if US stock market is currently open
 * Market hours: Monday-Friday, 9:30 AM - 4:00 PM ET
 * @returns {boolean} True if market is open
 */
export function isMarketOpen() {
  const etTime = getEasternTime();
  const day = etTime.getDay(); // 0 = Sunday, 6 = Saturday
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  // Market hours: Monday-Friday, 9:30 AM - 4:00 PM ET
  const isWeekday = day >= 1 && day <= 5;
  const marketOpen = 9 * 60 + 30; // 9:30 AM in minutes
  const marketClose = 16 * 60; // 4:00 PM in minutes
  const isDuringMarketHours = totalMinutes >= marketOpen && totalMinutes < marketClose;

  return isWeekday && isDuringMarketHours;
}

/**
 * Check if we're in extended hours (pre-market or after-hours)
 * Pre-market: 4:00 AM - 9:30 AM ET
 * After-hours: 4:00 PM - 8:00 PM ET
 * @returns {boolean} True if in extended hours
 */
export function isExtendedHours() {
  const etTime = getEasternTime();
  const day = etTime.getDay();
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  const isWeekday = day >= 1 && day <= 5;
  const preMarketStart = 4 * 60; // 4:00 AM
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const marketClose = 16 * 60; // 4:00 PM
  const afterHoursEnd = 20 * 60; // 8:00 PM

  const isPreMarket = totalMinutes >= preMarketStart && totalMinutes < marketOpen;
  const isAfterHours = totalMinutes >= marketClose && totalMinutes < afterHoursEnd;

  return isWeekday && (isPreMarket || isAfterHours);
}

/**
 * Get time until market opens (in milliseconds)
 * Returns 0 if market is currently open
 * @returns {number} Milliseconds until market opens
 */
export function getTimeUntilMarketOpen() {
  if (isMarketOpen()) return 0;

  const etTime = getEasternTime();
  const day = etTime.getDay();
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const totalMinutes = hours * 60 + minutes;

  const marketOpen = 9 * 60 + 30; // 9:30 AM in minutes

  let daysToAdd = 0;

  if (day === 0) {
    // Sunday - wait until Monday
    daysToAdd = 1;
  } else if (day === 6) {
    // Saturday - wait until Monday
    daysToAdd = 2;
  } else if (totalMinutes >= 16 * 60) {
    // After market close - wait until next weekday
    daysToAdd = day === 5 ? 3 : 1; // Friday goes to Monday
  }

  // Calculate milliseconds until market open
  const minutesUntilOpen = daysToAdd > 0
    ? (daysToAdd * 24 * 60) + marketOpen - totalMinutes
    : marketOpen - totalMinutes;

  return minutesUntilOpen * 60 * 1000;
}

/**
 * Get market status as a string for display
 * @returns {string} "OPEN", "PRE-MARKET", "AFTER-HOURS", or "CLOSED"
 */
export function getMarketStatus() {
  if (isMarketOpen()) return 'OPEN';
  if (isExtendedHours()) {
    const etTime = getEasternTime();
    const hours = etTime.getHours();
    return hours < 9 ? 'PRE-MARKET' : 'AFTER-HOURS';
  }
  return 'CLOSED';
}

/**
 * Format Eastern Time for display
 * @returns {string} Formatted time string (e.g., "10:30:45 AM ET")
 */
export function formatEasternTime() {
  const etTime = getEasternTime();
  return etTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }) + ' ET';
}
