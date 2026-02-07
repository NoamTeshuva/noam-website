/**
 * IndexedDB Service
 * Manages local database for historical quotes, alerts, and time series data
 * Database: MarketTerminalDB
 * Retention: 90 days for quotes/alerts, 7 days for 1min bars, 2 years for daily bars
 */

const DB_NAME = 'MarketTerminalDB';
const DB_VERSION = 1;

// Retention periods in milliseconds
const RETENTION = {
  QUOTES: 90 * 24 * 60 * 60 * 1000,        // 90 days
  ALERTS: 90 * 24 * 60 * 60 * 1000,        // 90 days
  TIME_SERIES_1MIN: 7 * 24 * 60 * 60 * 1000,   // 7 days
  TIME_SERIES_1DAY: 2 * 365 * 24 * 60 * 60 * 1000  // 2 years
};

class IndexedDBService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.initPromise = null;
  }

  /**
   * Initialize database connection
   * Creates object stores and indexes on first run or upgrade
   */
  async init() {
    // If already initialized, return immediately
    if (this.isInitialized && this.db) {
      return this.db;
    }

    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('❌ IndexedDB failed to open:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('✅ IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log(`🔧 Upgrading IndexedDB from version ${event.oldVersion} to ${event.newVersion}`);

        // Store 1: Historical Quotes (daily snapshots)
        if (!db.objectStoreNames.contains('historicalQuotes')) {
          const quotesStore = db.createObjectStore('historicalQuotes', {
            keyPath: ['symbol', 'timestamp']
          });
          quotesStore.createIndex('symbol', 'symbol', { unique: false });
          quotesStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('📦 Created historicalQuotes store');
        }

        // Store 2: Alert History
        if (!db.objectStoreNames.contains('alertHistory')) {
          const alertsStore = db.createObjectStore('alertHistory', {
            keyPath: 'id'
          });
          alertsStore.createIndex('symbol', 'symbol', { unique: false });
          alertsStore.createIndex('timestamp', 'timestamp', { unique: false });
          alertsStore.createIndex('type', 'type', { unique: false });
          console.log('📦 Created alertHistory store');
        }

        // Store 3: Time Series Data (OHLCV bars for charts)
        if (!db.objectStoreNames.contains('timeSeries')) {
          const timeSeriesStore = db.createObjectStore('timeSeries', {
            keyPath: ['symbol', 'interval', 'datetime']
          });
          timeSeriesStore.createIndex('symbol', 'symbol', { unique: false });
          timeSeriesStore.createIndex('interval', 'interval', { unique: false });
          timeSeriesStore.createIndex('datetime', 'datetime', { unique: false });
          console.log('📦 Created timeSeries store');
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Save a quote snapshot
   * @param {string} symbol - Stock symbol
   * @param {Object} quoteData - Quote data (price, volume, change, etc.)
   */
  async saveQuoteSnapshot(symbol, quoteData) {
    await this.init();

    const transaction = this.db.transaction(['historicalQuotes'], 'readwrite');
    const store = transaction.objectStore('historicalQuotes');

    const snapshot = {
      symbol: symbol.toUpperCase(),
      timestamp: Date.now(),
      price: quoteData.price,
      open: quoteData.open,
      high: quoteData.high,
      low: quoteData.low,
      close: quoteData.price, // Use current price as close
      volume: quoteData.volume,
      change: quoteData.change,
      changePercent: quoteData.changePercent,
      savedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(snapshot);
      request.onsuccess = () => {
        console.log(`💾 Saved quote snapshot for ${symbol}`);
        resolve(snapshot);
      };
      request.onerror = () => {
        console.error(`❌ Failed to save quote snapshot for ${symbol}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get quote history for a symbol
   * @param {string} symbol - Stock symbol
   * @param {number} days - Number of days of history (default: 90)
   * @returns {Promise<Array>} Array of quote snapshots
   */
  async getQuoteHistory(symbol, days = 90) {
    await this.init();

    const transaction = this.db.transaction(['historicalQuotes'], 'readonly');
    const store = transaction.objectStore('historicalQuotes');
    const index = store.index('symbol');

    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);

    return new Promise((resolve, reject) => {
      const request = index.getAll(symbol.toUpperCase());
      request.onsuccess = () => {
        const quotes = request.result.filter(q => q.timestamp >= cutoff);
        // Sort by timestamp (oldest first)
        quotes.sort((a, b) => a.timestamp - b.timestamp);
        console.log(`📊 Retrieved ${quotes.length} quote snapshots for ${symbol}`);
        resolve(quotes);
      };
      request.onerror = () => {
        console.error(`❌ Failed to get quote history for ${symbol}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Save an alert event
   * @param {Object} alertData - Alert data (symbol, type, message, metadata)
   */
  async saveAlert(alertData) {
    await this.init();

    const transaction = this.db.transaction(['alertHistory'], 'readwrite');
    const store = transaction.objectStore('alertHistory');

    const alert = {
      id: `alert_${Date.now()}_${alertData.symbol}_${alertData.type}`,
      symbol: alertData.symbol.toUpperCase(),
      type: alertData.type,
      timestamp: Date.now(),
      message: alertData.message,
      metadata: alertData.metadata || {},
      savedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(alert);
      request.onsuccess = () => {
        console.log(`🔔 Saved alert for ${alertData.symbol}: ${alertData.type}`);
        resolve(alert);
      };
      request.onerror = () => {
        console.error(`❌ Failed to save alert for ${alertData.symbol}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get alert history for a symbol
   * @param {string} symbol - Stock symbol (optional, if null returns all)
   * @param {number} limit - Maximum number of alerts to return (default: 10)
   * @returns {Promise<Array>} Array of alerts
   */
  async getAlertHistory(symbol = null, limit = 10) {
    await this.init();

    const transaction = this.db.transaction(['alertHistory'], 'readonly');
    const store = transaction.objectStore('alertHistory');

    return new Promise((resolve, reject) => {
      let request;

      if (symbol) {
        const index = store.index('symbol');
        request = index.getAll(symbol.toUpperCase());
      } else {
        request = store.getAll();
      }

      request.onsuccess = () => {
        let alerts = request.result;
        // Sort by timestamp (newest first)
        alerts.sort((a, b) => b.timestamp - a.timestamp);
        // Apply limit
        alerts = alerts.slice(0, limit);
        console.log(`🔔 Retrieved ${alerts.length} alerts${symbol ? ` for ${symbol}` : ''}`);
        resolve(alerts);
      };

      request.onerror = () => {
        console.error(`❌ Failed to get alert history:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Save time series data (OHLCV bars for charts)
   * @param {string} symbol - Stock symbol
   * @param {string} interval - Time interval ('1min', '5min', '1hour', '1day', etc.)
   * @param {Array} bars - Array of OHLCV bars
   */
  async saveTimeSeries(symbol, interval, bars) {
    await this.init();

    const transaction = this.db.transaction(['timeSeries'], 'readwrite');
    const store = transaction.objectStore('timeSeries');

    const promises = bars.map(bar => {
      const data = {
        symbol: symbol.toUpperCase(),
        interval,
        datetime: bar.datetime,
        timestamp: new Date(bar.datetime).getTime(),
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume
      };

      return new Promise((resolve, reject) => {
        const request = store.put(data);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    try {
      await Promise.all(promises);
      console.log(`📈 Saved ${bars.length} ${interval} bars for ${symbol}`);
    } catch (error) {
      console.error(`❌ Failed to save time series for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get time series data for a symbol
   * @param {string} symbol - Stock symbol
   * @param {string} interval - Time interval ('1min', '5min', '1hour', '1day', etc.)
   * @param {number} days - Number of days of data (default: 7)
   * @returns {Promise<Array>} Array of OHLCV bars
   */
  async getTimeSeries(symbol, interval, days = 7) {
    await this.init();

    const transaction = this.db.transaction(['timeSeries'], 'readonly');
    const store = transaction.objectStore('timeSeries');
    const index = store.index('symbol');

    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);

    return new Promise((resolve, reject) => {
      const request = index.getAll(symbol.toUpperCase());
      request.onsuccess = () => {
        let bars = request.result.filter(
          b => b.interval === interval && b.timestamp >= cutoff
        );
        // Sort by timestamp (oldest first)
        bars.sort((a, b) => a.timestamp - b.timestamp);
        console.log(`📈 Retrieved ${bars.length} ${interval} bars for ${symbol}`);
        resolve(bars);
      };
      request.onerror = () => {
        console.error(`❌ Failed to get time series for ${symbol}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clean up old data based on retention policies
   * Removes entries older than retention period for each store
   */
  async cleanup() {
    await this.init();
    console.log('🧹 Starting IndexedDB cleanup...');

    const now = Date.now();
    const transaction = this.db.transaction(
      ['historicalQuotes', 'alertHistory', 'timeSeries'],
      'readwrite'
    );

    // Cleanup historical quotes (90 days)
    const quotesStore = transaction.objectStore('historicalQuotes');
    const quoteCutoff = now - RETENTION.QUOTES;
    await this._cleanupStore(quotesStore, 'timestamp', quoteCutoff, 'historical quotes');

    // Cleanup alerts (90 days)
    const alertsStore = transaction.objectStore('alertHistory');
    const alertCutoff = now - RETENTION.ALERTS;
    await this._cleanupStore(alertsStore, 'timestamp', alertCutoff, 'alerts');

    // Cleanup time series data (different retention for different intervals)
    const timeSeriesStore = transaction.objectStore('timeSeries');
    await this._cleanupTimeSeries(timeSeriesStore, now);

    console.log('✅ IndexedDB cleanup complete');
  }

  /**
   * Helper: Clean up a store by timestamp
   */
  async _cleanupStore(store, indexName, cutoff, storeName) {
    return new Promise((resolve, reject) => {
      const index = store.index(indexName);
      const request = index.openCursor();
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value[indexName] < cutoff) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          if (deletedCount > 0) {
            console.log(`🗑️ Deleted ${deletedCount} old ${storeName}`);
          }
          resolve();
        }
      };

      request.onerror = () => {
        console.error(`❌ Failed to cleanup ${storeName}:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Helper: Clean up time series with different retention per interval
   */
  async _cleanupTimeSeries(store, now) {
    return new Promise((resolve, reject) => {
      const request = store.openCursor();
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const bar = cursor.value;
          let cutoff;

          // Apply different retention based on interval
          if (bar.interval.includes('min')) {
            cutoff = now - RETENTION.TIME_SERIES_1MIN;
          } else if (bar.interval.includes('day')) {
            cutoff = now - RETENTION.TIME_SERIES_1DAY;
          } else {
            cutoff = now - RETENTION.TIME_SERIES_1MIN; // Default to 7 days
          }

          if (bar.timestamp < cutoff) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          if (deletedCount > 0) {
            console.log(`🗑️ Deleted ${deletedCount} old time series bars`);
          }
          resolve();
        }
      };

      request.onerror = () => {
        console.error('❌ Failed to cleanup time series:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get database statistics
   * @returns {Promise<Object>} Database statistics
   */
  async getStats() {
    await this.init();

    const transaction = this.db.transaction(
      ['historicalQuotes', 'alertHistory', 'timeSeries'],
      'readonly'
    );

    const stats = {
      quotes: 0,
      alerts: 0,
      timeSeries: 0,
      totalSize: 0
    };

    // Count quotes
    const quotesStore = transaction.objectStore('historicalQuotes');
    stats.quotes = await this._countStore(quotesStore);

    // Count alerts
    const alertsStore = transaction.objectStore('alertHistory');
    stats.alerts = await this._countStore(alertsStore);

    // Count time series
    const timeSeriesStore = transaction.objectStore('timeSeries');
    stats.timeSeries = await this._countStore(timeSeriesStore);

    stats.totalEntries = stats.quotes + stats.alerts + stats.timeSeries;

    // Estimate size (rough calculation: 500 bytes per entry)
    stats.estimatedSize = stats.totalEntries * 500;
    stats.estimatedSizeMB = (stats.estimatedSize / (1024 * 1024)).toFixed(2);

    return stats;
  }

  /**
   * Helper: Count entries in a store
   */
  async _countStore(store) {
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete all data (for testing or reset)
   */
  async clearAll() {
    await this.init();
    console.log('⚠️ Clearing all IndexedDB data...');

    const transaction = this.db.transaction(
      ['historicalQuotes', 'alertHistory', 'timeSeries'],
      'readwrite'
    );

    const promises = [
      new Promise((resolve) => transaction.objectStore('historicalQuotes').clear().onsuccess = resolve),
      new Promise((resolve) => transaction.objectStore('alertHistory').clear().onsuccess = resolve),
      new Promise((resolve) => transaction.objectStore('timeSeries').clear().onsuccess = resolve)
    ];

    await Promise.all(promises);
    console.log('✅ All IndexedDB data cleared');
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      console.log('🔒 IndexedDB connection closed');
    }
  }
}

// Create singleton instance
const indexedDBService = new IndexedDBService();

// Initialize on module load
indexedDBService.init().catch(error => {
  console.error('Failed to initialize IndexedDB:', error);
});

// Run cleanup on startup
indexedDBService.init().then(() => {
  indexedDBService.cleanup();
});

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.indexedDBService = indexedDBService;
}

export default indexedDBService;
