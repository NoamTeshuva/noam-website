/**
 * Schema Migrations Service
 * Handles database schema versioning and migrations
 * Validates data integrity on load
 */

const SCHEMA_VERSION_KEY = 'schema_version';
const CURRENT_SCHEMA_VERSION = 1;

/**
 * Migration registry
 * Each migration function receives the IndexedDB database instance
 * and performs necessary schema changes
 */
const migrations = {
  1: (db) => {
    console.log('📦 Running migration v1: Initial schema setup');
    // Initial schema is handled by indexedDBService.js onupgradeneeded
    // This migration is here for documentation and future reference
    return Promise.resolve();
  },

  // Future migrations would go here:
  // 2: async (db) => {
  //   console.log('📦 Running migration v2: Add new index...');
  //   // Add new indexes or object stores
  // },
};

/**
 * Schema validation rules
 * Defines expected structure for each data type
 */
const validators = {
  /**
   * Validate quote snapshot structure
   */
  quoteSnapshot: (data) => {
    const required = ['symbol', 'timestamp', 'price'];
    for (const field of required) {
      if (data[field] === undefined || data[field] === null) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }

    if (typeof data.symbol !== 'string') {
      return { valid: false, error: 'symbol must be a string' };
    }

    if (typeof data.timestamp !== 'number' || data.timestamp <= 0) {
      return { valid: false, error: 'timestamp must be a positive number' };
    }

    if (typeof data.price !== 'number' || data.price < 0) {
      return { valid: false, error: 'price must be a non-negative number' };
    }

    return { valid: true };
  },

  /**
   * Validate alert structure
   */
  alert: (data) => {
    const required = ['id', 'symbol', 'type', 'timestamp', 'message'];
    for (const field of required) {
      if (data[field] === undefined || data[field] === null) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }

    if (typeof data.symbol !== 'string') {
      return { valid: false, error: 'symbol must be a string' };
    }

    if (typeof data.type !== 'string') {
      return { valid: false, error: 'type must be a string' };
    }

    if (typeof data.message !== 'string') {
      return { valid: false, error: 'message must be a string' };
    }

    return { valid: true };
  },

  /**
   * Validate time series bar structure
   */
  timeSeriesBar: (data) => {
    const required = ['symbol', 'interval', 'datetime', 'open', 'high', 'low', 'close', 'volume'];
    for (const field of required) {
      if (data[field] === undefined || data[field] === null) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }

    if (typeof data.symbol !== 'string') {
      return { valid: false, error: 'symbol must be a string' };
    }

    if (typeof data.interval !== 'string') {
      return { valid: false, error: 'interval must be a string' };
    }

    const numericFields = ['open', 'high', 'low', 'close', 'volume'];
    for (const field of numericFields) {
      if (typeof data[field] !== 'number' || data[field] < 0) {
        return { valid: false, error: `${field} must be a non-negative number` };
      }
    }

    // Validate OHLC relationships
    if (data.high < data.low) {
      return { valid: false, error: 'high must be >= low' };
    }

    if (data.high < data.open || data.high < data.close) {
      return { valid: false, error: 'high must be >= open and close' };
    }

    if (data.low > data.open || data.low > data.close) {
      return { valid: false, error: 'low must be <= open and close' };
    }

    return { valid: true };
  }
};

class SchemaMigrations {
  constructor() {
    this.currentVersion = this.getStoredVersion();
  }

  /**
   * Get stored schema version from localStorage
   */
  getStoredVersion() {
    const version = localStorage.getItem(SCHEMA_VERSION_KEY);
    return version ? parseInt(version, 10) : 0;
  }

  /**
   * Set schema version in localStorage
   */
  setStoredVersion(version) {
    localStorage.setItem(SCHEMA_VERSION_KEY, version.toString());
    this.currentVersion = version;
  }

  /**
   * Check if migrations are needed
   */
  needsMigration() {
    return this.currentVersion < CURRENT_SCHEMA_VERSION;
  }

  /**
   * Run all necessary migrations to bring schema up to current version
   * @param {IDBDatabase} db - IndexedDB database instance
   */
  async runMigrations(db) {
    if (!this.needsMigration()) {
      console.log(`✅ Schema is up to date (v${this.currentVersion})`);
      return;
    }

    console.log(`🔄 Migrating schema from v${this.currentVersion} to v${CURRENT_SCHEMA_VERSION}`);

    for (let version = this.currentVersion + 1; version <= CURRENT_SCHEMA_VERSION; version++) {
      if (migrations[version]) {
        console.log(`📦 Running migration v${version}...`);
        try {
          await migrations[version](db);
          this.setStoredVersion(version);
          console.log(`✅ Migration v${version} complete`);
        } catch (error) {
          console.error(`❌ Migration v${version} failed:`, error);
          throw new Error(`Migration v${version} failed: ${error.message}`);
        }
      } else {
        console.warn(`⚠️ No migration found for version ${version}`);
      }
    }

    console.log(`✅ Schema migration complete (now at v${CURRENT_SCHEMA_VERSION})`);
  }

  /**
   * Validate data before saving
   * @param {string} type - Data type ('quoteSnapshot', 'alert', 'timeSeriesBar')
   * @param {Object} data - Data to validate
   * @returns {Object} Validation result { valid, error }
   */
  validate(type, data) {
    if (!validators[type]) {
      return { valid: false, error: `Unknown data type: ${type}` };
    }

    try {
      return validators[type](data);
    } catch (error) {
      return { valid: false, error: `Validation error: ${error.message}` };
    }
  }

  /**
   * Validate and sanitize quote snapshot before saving
   * @param {Object} data - Quote data
   * @returns {Object} Sanitized data or throws error
   */
  sanitizeQuoteSnapshot(data) {
    const validation = this.validate('quoteSnapshot', data);
    if (!validation.valid) {
      throw new Error(`Invalid quote snapshot: ${validation.error}`);
    }

    return {
      symbol: data.symbol.toUpperCase(),
      timestamp: data.timestamp,
      price: Number(data.price),
      open: data.open !== undefined ? Number(data.open) : null,
      high: data.high !== undefined ? Number(data.high) : null,
      low: data.low !== undefined ? Number(data.low) : null,
      close: data.close || Number(data.price),
      volume: data.volume !== undefined ? Number(data.volume) : null,
      change: data.change !== undefined ? Number(data.change) : null,
      changePercent: data.changePercent !== undefined ? Number(data.changePercent) : null,
      savedAt: new Date().toISOString()
    };
  }

  /**
   * Validate and sanitize alert before saving
   * @param {Object} data - Alert data
   * @returns {Object} Sanitized data or throws error
   */
  sanitizeAlert(data) {
    const validation = this.validate('alert', data);
    if (!validation.valid) {
      throw new Error(`Invalid alert: ${validation.error}`);
    }

    return {
      id: data.id || `alert_${Date.now()}_${data.symbol}_${data.type}`,
      symbol: data.symbol.toUpperCase(),
      type: data.type,
      timestamp: data.timestamp || Date.now(),
      message: data.message,
      metadata: data.metadata || {},
      savedAt: new Date().toISOString()
    };
  }

  /**
   * Validate and sanitize time series bar before saving
   * @param {Object} data - Time series bar
   * @returns {Object} Sanitized data or throws error
   */
  sanitizeTimeSeriesBar(data) {
    const validation = this.validate('timeSeriesBar', data);
    if (!validation.valid) {
      throw new Error(`Invalid time series bar: ${validation.error}`);
    }

    return {
      symbol: data.symbol.toUpperCase(),
      interval: data.interval,
      datetime: data.datetime,
      timestamp: data.timestamp || new Date(data.datetime).getTime(),
      open: Number(data.open),
      high: Number(data.high),
      low: Number(data.low),
      close: Number(data.close),
      volume: Number(data.volume)
    };
  }

  /**
   * Reset schema version (for testing)
   */
  reset() {
    localStorage.removeItem(SCHEMA_VERSION_KEY);
    this.currentVersion = 0;
    console.log('⚠️ Schema version reset to 0');
  }

  /**
   * Get schema info
   */
  getInfo() {
    return {
      currentVersion: this.currentVersion,
      latestVersion: CURRENT_SCHEMA_VERSION,
      needsMigration: this.needsMigration(),
      availableMigrations: Object.keys(migrations).length
    };
  }
}

// Create singleton instance
const schemaMigrations = new SchemaMigrations();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.schemaMigrations = schemaMigrations;
}

export default schemaMigrations;
export { CURRENT_SCHEMA_VERSION, validators };
