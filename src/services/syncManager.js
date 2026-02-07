/**
 * Sync Manager Service
 * Handles multi-device sync of watchlist, preferences, and alerts
 * Uses Cloudflare Worker + KV for cloud storage
 * Local-first strategy with conflict resolution
 */

const WORKER_URL = process.env.REACT_APP_WORKER_URL || 'https://twelvedata.noamteshuva.workers.dev/api';

class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.lastSyncTime = this.getLastSyncTime();
    this.pendingChanges = this.getPendingChanges();
    this.listeners = [];
  }

  /**
   * Get auth token from session storage
   */
  getAuthToken() {
    return sessionStorage.getItem('authToken');
  }

  /**
   * Get last sync time from localStorage
   */
  getLastSyncTime() {
    const stored = localStorage.getItem('lastSyncTime');
    return stored ? JSON.parse(stored) : {
      watchlist: null,
      preferences: null,
      alerts: null
    };
  }

  /**
   * Set last sync time in localStorage
   */
  setLastSyncTime(type, timestamp) {
    this.lastSyncTime[type] = timestamp;
    localStorage.setItem('lastSyncTime', JSON.stringify(this.lastSyncTime));
    this.notifyListeners({ type: 'syncTimeUpdated', data: this.lastSyncTime });
  }

  /**
   * Get pending changes from localStorage
   */
  getPendingChanges() {
    const stored = localStorage.getItem('pendingChanges');
    return stored ? JSON.parse(stored) : {
      watchlist: false,
      preferences: false,
      alerts: false
    };
  }

  /**
   * Mark data as having pending changes
   */
  markPendingChanges(type, hasPending = true) {
    this.pendingChanges[type] = hasPending;
    localStorage.setItem('pendingChanges', JSON.stringify(this.pendingChanges));
    this.notifyListeners({ type: 'pendingChangesUpdated', data: this.pendingChanges });
  }

  /**
   * Check if there are any pending changes
   */
  hasPendingChanges() {
    return Object.values(this.pendingChanges).some(pending => pending);
  }

  /**
   * Sync watchlist to/from cloud
   * @param {string} direction - 'push' or 'pull'
   * @param {Object} localData - Local watchlist data (for push)
   * @returns {Promise<Object>} Sync result
   */
  async syncWatchlist(direction = 'push', localData = null) {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Not authenticated - please log in');
    }

    if (direction === 'push') {
      // Upload local watchlist to cloud
      if (!localData || !Array.isArray(localData.symbols)) {
        throw new Error('Invalid watchlist data');
      }

      const response = await fetch(`${WORKER_URL}/sync/watchlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ symbols: localData.symbols })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync watchlist');
      }

      const result = await response.json();
      this.setLastSyncTime('watchlist', result.timestamp);
      this.markPendingChanges('watchlist', false);

      console.log('✅ Watchlist synced to cloud');
      return { direction: 'push', success: true, timestamp: result.timestamp };
    } else {
      // Download watchlist from cloud
      const response = await fetch(`${WORKER_URL}/sync/watchlist`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch watchlist');
      }

      const result = await response.json();

      if (!result.exists) {
        console.log('📭 No watchlist found in cloud');
        return { direction: 'pull', success: true, exists: false };
      }

      this.setLastSyncTime('watchlist', result.lastModified);
      console.log('✅ Watchlist downloaded from cloud');

      return {
        direction: 'pull',
        success: true,
        exists: true,
        data: result.data,
        lastModified: result.lastModified
      };
    }
  }

  /**
   * Sync preferences to/from cloud
   */
  async syncPreferences(direction = 'push', localData = null) {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Not authenticated - please log in');
    }

    if (direction === 'push') {
      const response = await fetch(`${WORKER_URL}/sync/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(localData || {})
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync preferences');
      }

      const result = await response.json();
      this.setLastSyncTime('preferences', result.timestamp);
      this.markPendingChanges('preferences', false);

      console.log('✅ Preferences synced to cloud');
      return { direction: 'push', success: true, timestamp: result.timestamp };
    } else {
      const response = await fetch(`${WORKER_URL}/sync/preferences`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch preferences');
      }

      const result = await response.json();

      if (!result.exists) {
        console.log('📭 No preferences found in cloud');
        return { direction: 'pull', success: true, exists: false };
      }

      this.setLastSyncTime('preferences', result.lastModified);
      console.log('✅ Preferences downloaded from cloud');

      return {
        direction: 'pull',
        success: true,
        exists: true,
        data: result.data,
        lastModified: result.lastModified
      };
    }
  }

  /**
   * Sync alerts to/from cloud
   */
  async syncAlerts(direction = 'push', localData = null) {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Not authenticated - please log in');
    }

    if (direction === 'push') {
      const response = await fetch(`${WORKER_URL}/sync/alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ alerts: localData || [] })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync alerts');
      }

      const result = await response.json();
      this.setLastSyncTime('alerts', result.timestamp);
      this.markPendingChanges('alerts', false);

      console.log('✅ Alerts synced to cloud');
      return { direction: 'push', success: true, timestamp: result.timestamp };
    } else {
      const response = await fetch(`${WORKER_URL}/sync/alerts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch alerts');
      }

      const result = await response.json();

      this.setLastSyncTime('alerts', result.lastModified || Date.now());
      console.log('✅ Alerts downloaded from cloud');

      return {
        direction: 'pull',
        success: true,
        exists: result.exists,
        data: result.data || [],
        lastModified: result.lastModified
      };
    }
  }

  /**
   * Get sync status from server
   */
  async getSyncStatus() {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Not authenticated - please log in');
    }

    const response = await fetch(`${WORKER_URL}/sync/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch sync status');
    }

    return await response.json();
  }

  /**
   * Sync all data (watchlist + preferences + alerts)
   * @param {string} direction - 'push' or 'pull'
   * @param {Object} localData - { watchlist, preferences, alerts }
   */
  async syncAll(direction = 'push', localData = {}) {
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    this.isSyncing = true;
    this.notifyListeners({ type: 'syncStarted' });

    const results = {
      watchlist: null,
      preferences: null,
      alerts: null,
      errors: []
    };

    try {
      // Sync watchlist
      if (localData.watchlist || direction === 'pull') {
        try {
          results.watchlist = await this.syncWatchlist(direction, localData.watchlist);
        } catch (error) {
          console.error('Watchlist sync failed:', error);
          results.errors.push({ type: 'watchlist', error: error.message });
        }
      }

      // Sync preferences
      if (localData.preferences || direction === 'pull') {
        try {
          results.preferences = await this.syncPreferences(direction, localData.preferences);
        } catch (error) {
          console.error('Preferences sync failed:', error);
          results.errors.push({ type: 'preferences', error: error.message });
        }
      }

      // Sync alerts
      if (localData.alerts || direction === 'pull') {
        try {
          results.alerts = await this.syncAlerts(direction, localData.alerts);
        } catch (error) {
          console.error('Alerts sync failed:', error);
          results.errors.push({ type: 'alerts', error: error.message });
        }
      }

      this.isSyncing = false;
      this.notifyListeners({ type: 'syncCompleted', data: results });

      return results;
    } catch (error) {
      this.isSyncing = false;
      this.notifyListeners({ type: 'syncFailed', error: error.message });
      throw error;
    }
  }

  /**
   * Resolve conflicts using last-write-wins strategy
   * @param {Object} localData - Local data with timestamp
   * @param {Object} cloudData - Cloud data with timestamp
   * @returns {Object} Resolved data
   */
  resolveConflict(localData, cloudData) {
    if (!localData && !cloudData) return null;
    if (!localData) return cloudData;
    if (!cloudData) return localData;

    // Last-write-wins: newer timestamp wins
    const localTimestamp = localData.timestamp || 0;
    const cloudTimestamp = cloudData.timestamp || 0;

    if (localTimestamp > cloudTimestamp) {
      console.log('🔄 Conflict resolved: Using local data (newer)');
      return { ...localData, source: 'local', conflictResolved: true };
    } else {
      console.log('🔄 Conflict resolved: Using cloud data (newer)');
      return { ...cloudData, source: 'cloud', conflictResolved: true };
    }
  }

  /**
   * Subscribe to sync events
   * @param {Function} listener - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of sync events
   */
  notifyListeners(event) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  /**
   * Clear all sync data (for testing/reset)
   */
  clearSyncData() {
    localStorage.removeItem('lastSyncTime');
    localStorage.removeItem('pendingChanges');
    this.lastSyncTime = { watchlist: null, preferences: null, alerts: null };
    this.pendingChanges = { watchlist: false, preferences: false, alerts: false };
    console.log('🗑️ Sync data cleared');
  }
}

// Create singleton instance
const syncManager = new SyncManager();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.syncManager = syncManager;
}

export default syncManager;
