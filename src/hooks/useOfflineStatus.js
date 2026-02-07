/**
 * useOfflineStatus Hook
 * React hook for consuming offline detection state
 */

import { useState, useEffect } from 'react';
import offlineDetector from '../services/offlineDetector';

export const useOfflineStatus = () => {
  const [status, setStatus] = useState(() => offlineDetector.getStatus());

  useEffect(() => {
    // Subscribe to offline detector events
    const unsubscribe = offlineDetector.subscribe((event) => {
      console.log('📡 Offline status changed:', event);
      setStatus(offlineDetector.getStatus());
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    isOffline: status.isOffline,
    staleSince: status.staleSince,
    failedRequestCount: status.failedRequestCount,
    lastSuccessfulRequest: status.lastSuccessfulRequest,
    timeSinceLastSuccess: status.timeSinceLastSuccess,
    // Helper methods
    getStaleTime: (staleSince) => offlineDetector.getStaleTime(staleSince),
    formatCacheAge: (ageMs) => offlineDetector.formatCacheAge(ageMs),
    isDataStale: (cacheAge, ttl) => offlineDetector.isDataStale(cacheAge, ttl)
  };
};

export default useOfflineStatus;
