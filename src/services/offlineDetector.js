/**
 * Offline Detector Service
 * Monitors network connectivity and data freshness
 * Emits events when offline/online state changes
 */

class OfflineDetector {
  constructor() {
    this.isOffline = !navigator.onLine;
    this.listeners = [];
    this.failedRequestCount = 0;
    this.lastSuccessfulRequest = Date.now();
    this.staleSince = null;

    // Listen to browser online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  handleOnline() {
    console.log('🌐 Network connection restored');
    const wasOffline = this.isOffline;
    this.isOffline = false;
    this.failedRequestCount = 0;
    this.lastSuccessfulRequest = Date.now();

    if (wasOffline) {
      this.notifyListeners({
        type: 'online',
        isOffline: false,
        reconnectedAt: new Date(),
        staleSince: this.staleSince
      });
    }
  }

  handleOffline() {
    console.warn('⚠️ Network connection lost');
    const wasOnline = !this.isOffline;
    this.isOffline = true;

    if (wasOnline) {
      this.staleSince = new Date();
      this.notifyListeners({
        type: 'offline',
        isOffline: true,
        staleSince: this.staleSince
      });
    }
  }

  /**
   * Record a successful API request
   */
  recordSuccess() {
    this.failedRequestCount = 0;
    this.lastSuccessfulRequest = Date.now();

    // If we were offline, mark as back online
    if (this.isOffline && navigator.onLine) {
      this.handleOnline();
    }
  }

  /**
   * Record a failed API request
   * After 3 consecutive failures, consider ourselves offline
   */
  recordFailure() {
    this.failedRequestCount++;

    console.warn(`⚠️ API request failed (${this.failedRequestCount} consecutive failures)`);

    // After 3 failures, assume we're offline (even if navigator.onLine says otherwise)
    if (this.failedRequestCount >= 3 && !this.isOffline) {
      console.warn('⚠️ Multiple API failures detected - entering offline mode');
      this.isOffline = true;
      this.staleSince = new Date();

      this.notifyListeners({
        type: 'offline',
        isOffline: true,
        staleSince: this.staleSince,
        reason: 'multiple_api_failures'
      });
    }
  }

  /**
   * Check if data is stale based on cache age
   * @param {number} cacheAge - Age of cached data in milliseconds
   * @param {number} ttl - Time-to-live in milliseconds
   * @returns {boolean} True if data is stale
   */
  isDataStale(cacheAge, ttl) {
    return cacheAge >= ttl;
  }

  /**
   * Get human-readable time since data became stale
   * @param {Date} staleSince - When data became stale
   * @returns {string} Formatted time string
   */
  getStaleTime(staleSince) {
    if (!staleSince) return null;

    const now = Date.now();
    const staleMs = now - staleSince.getTime();
    const minutes = Math.floor(staleMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  }

  /**
   * Format cache age for display
   * @param {number} ageMs - Age in milliseconds
   * @returns {string} Formatted age string
   */
  formatCacheAge(ageMs) {
    const seconds = Math.floor(ageMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d old`;
    if (hours > 0) return `${hours}h old`;
    if (minutes > 0) return `${minutes}m old`;
    if (seconds > 0) return `${seconds}s old`;
    return 'fresh';
  }

  /**
   * Get offline status
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      isOffline: this.isOffline,
      staleSince: this.staleSince,
      failedRequestCount: this.failedRequestCount,
      lastSuccessfulRequest: this.lastSuccessfulRequest,
      timeSinceLastSuccess: Date.now() - this.lastSuccessfulRequest
    };
  }

  /**
   * Subscribe to offline/online events
   * @param {Function} listener - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of state change
   * @param {Object} event - Event object
   */
  notifyListeners(event) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in offline detector listener:', error);
      }
    });
  }

  /**
   * Manually set offline state (for testing)
   * @param {boolean} offline - Offline state
   */
  setOffline(offline) {
    if (offline && !this.isOffline) {
      this.handleOffline();
    } else if (!offline && this.isOffline) {
      this.handleOnline();
    }
  }

  /**
   * Cleanup (remove event listeners)
   */
  destroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.listeners = [];
  }
}

// Create singleton instance
const offlineDetector = new OfflineDetector();

// Expose to window for debugging
if (typeof window !== 'undefined') {
  window.offlineDetector = offlineDetector;
}

export default offlineDetector;
