import { alphaVantageAPI, finnhubAPI } from './api.js';

/**
 * Calculate average daily volume over the past 2 weeks (14 days)
 * @param {string} symbol - Stock symbol
 * @returns {Promise<number>} - Average daily volume
 */
export const calculateAverageVolume14d = async (symbol) => {
  try {
    // Get historical data from Alpha Vantage (TIME_SERIES_DAILY)
    const response = await fetch(
      `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${process.env.REACT_APP_ALPHA_VANTAGE_KEY}`
    );
    const data = await response.json();
    
    if (data['Error Message']) {
      throw new Error(data['Error Message']);
    }
    
    const timeSeries = data['Time Series (Daily)'];
    if (!timeSeries) {
      throw new Error('No daily data available');
    }
    
    // Get last 14 trading days
    const dailyVolumes = Object.entries(timeSeries)
      .slice(0, 14)
      .map(([date, values]) => parseInt(values['5. volume']))
      .filter(volume => volume > 0);
    
    if (dailyVolumes.length === 0) {
      return 0;
    }
    
    // Calculate average
    const averageVolume = dailyVolumes.reduce((sum, volume) => sum + volume, 0) / dailyVolumes.length;
    
    return averageVolume;
  } catch (error) {
    console.error(`Error calculating average volume for ${symbol}:`, error);
    return 0;
  }
};

/**
 * Get today's cumulative volume for a symbol
 * @param {string} symbol - Stock symbol
 * @returns {Promise<number>} - Today's cumulative volume
 */
export const getTodayVolume = async (symbol) => {
  try {
    // First try to get current volume from Alpha Vantage quote
    const quote = await alphaVantageAPI.getQuote(symbol);
    return quote.volume || 0;
  } catch (error) {
    console.error(`Error getting today's volume for ${symbol}:`, error);
    return 0;
  }
};

/**
 * Check if a symbol should trigger a volume spike notification
 * @param {string} symbol - Stock symbol
 * @param {number} todayVolume - Today's cumulative volume
 * @param {number} averageVolume14d - 14-day average volume
 * @returns {boolean} - Whether to trigger notification
 */
export const shouldNotifyVolumeSpike = (symbol, todayVolume, averageVolume14d) => {
  // Check if today's volume is >= 2x the 14-day average
  const threshold = averageVolume14d * 2;
  const shouldNotify = todayVolume >= threshold && averageVolume14d > 0;
  
  if (shouldNotify) {
    console.log(`🚨 Volume spike detected for ${symbol}:`, {
      todayVolume: todayVolume.toLocaleString(),
      averageVolume14d: Math.round(averageVolume14d).toLocaleString(),
      ratio: (todayVolume / averageVolume14d).toFixed(2),
      threshold: Math.round(threshold).toLocaleString()
    });
  }
  
  return shouldNotify;
};

/**
 * Check all symbols in watchlist for volume spikes
 * @param {string[]} symbols - Array of symbols to check
 * @param {Function} onVolumeSpike - Callback when volume spike detected
 * @param {Function} hasEventFiredToday - Function to check if event already fired today
 * @param {Function} setEventFlag - Function to set event flag
 */
export const checkWatchlistForVolumeSpikes = async (
  symbols, 
  onVolumeSpike, 
  hasEventFiredToday, 
  setEventFlag
) => {
  const results = [];
  
  for (const symbol of symbols) {
    try {
      // Skip if we already notified for this symbol today
      if (hasEventFiredToday(symbol, 'volume_spike')) {
        console.log(`Already notified for ${symbol} today, skipping...`);
        continue;
      }
      
      // Get data for this symbol
      const [todayVolume, averageVolume14d] = await Promise.all([
        getTodayVolume(symbol),
        calculateAverageVolume14d(symbol)
      ]);
      
      // Check if should notify
      const shouldNotify = shouldNotifyVolumeSpike(symbol, todayVolume, averageVolume14d);
      
      if (shouldNotify) {
        // Fire notification
        const notificationData = {
          symbol,
          type: 'volume_spike',
          todayVolume,
          averageVolume14d,
          ratio: todayVolume / averageVolume14d,
          timestamp: new Date().toISOString()
        };
        
        onVolumeSpike(notificationData);
        
        // Set flag to prevent duplicate notifications
        setEventFlag(symbol, 'volume_spike');
        
        results.push(notificationData);
      }
      
      // Add delay to respect API rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`Error checking volume spike for ${symbol}:`, error);
    }
  }
  
  return results;
};

/**
 * Format volume for display in notifications
 * @param {number} volume - Volume number
 * @returns {string} - Formatted volume string
 */
export const formatVolumeForNotification = (volume) => {
  if (volume >= 1e9) {
    return `${(volume / 1e9).toFixed(1)}B`;
  } else if (volume >= 1e6) {
    return `${(volume / 1e6).toFixed(1)}M`;
  } else if (volume >= 1e3) {
    return `${(volume / 1e3).toFixed(1)}K`;
  } else {
    return volume.toLocaleString();
  }
};

/**
 * Create notification message for volume spike
 * @param {Object} data - Notification data
 * @returns {string} - Formatted notification message
 */
export const createVolumeSpikeMessage = (data) => {
  const { symbol, todayVolume, averageVolume14d, ratio } = data;
  const formattedToday = formatVolumeForNotification(todayVolume);
  const formattedAverage = formatVolumeForNotification(averageVolume14d);
  
  return `🚨 ${symbol} Volume Spike Alert! Today: ${formattedToday} (${ratio.toFixed(1)}x avg of ${formattedAverage})`;
};

/**
 * Enhanced event detector class for managing multiple event types
 */
export class EventDetector {
  constructor(watchlistStore, notificationCallback) {
    this.watchlistStore = watchlistStore;
    this.notificationCallback = notificationCallback;
    this.isRunning = false;
    this.intervalId = null;
  }
  
  /**
   * Start monitoring watchlist for events
   * @param {number} intervalMinutes - How often to check (default: 15 minutes)
   */
  start(intervalMinutes = 15) {
    if (this.isRunning) {
      console.log('Event detector already running');
      return;
    }
    
    this.isRunning = true;
    const intervalMs = intervalMinutes * 60 * 1000;
    
    console.log(`🔍 Starting event detector (checking every ${intervalMinutes} minutes)`);
    
    // Run immediately
    this.checkEvents();
    
    // Set up interval
    this.intervalId = setInterval(() => {
      this.checkEvents();
    }, intervalMs);
  }
  
  /**
   * Stop monitoring
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Event detector stopped');
  }
  
  /**
   * Check for all types of events
   */
  async checkEvents() {
    try {
      // Clear old event flags
      this.watchlistStore.getState().clearOldEventFlags();
      
      const symbols = this.watchlistStore.getState().getWatchlist();
      
      if (symbols.length === 0) {
        console.log('No symbols in watchlist, skipping event check');
        return;
      }
      
      console.log(`🔍 Checking ${symbols.length} symbols for events...`);
      
      // Check for volume spikes
      await checkWatchlistForVolumeSpikes(
        symbols,
        this.notificationCallback,
        this.watchlistStore.getState().hasEventFiredToday,
        this.watchlistStore.getState().setEventFlag
      );
      
    } catch (error) {
      console.error('Error in event detection:', error);
    }
  }
  
  /**
   * Manually trigger event check
   */
  async checkNow() {
    console.log('🔍 Manual event check triggered');
    await this.checkEvents();
  }
}