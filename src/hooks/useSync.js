/**
 * useSync Hook
 * React hook for multi-device sync operations
 * Wraps syncManager service for React components
 */

import { useState, useEffect, useCallback } from 'react';
import syncManager from '../services/syncManager';
import { useWatchlistStore } from '../store/useWatchlistStore';

export const useSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(syncManager.lastSyncTime);
  const [pendingChanges, setPendingChanges] = useState(syncManager.pendingChanges);
  const [syncError, setSyncError] = useState(null);

  const { symbols, peersBySymbol, peersInfo } = useWatchlistStore();

  useEffect(() => {
    // Subscribe to sync manager events
    const unsubscribe = syncManager.subscribe((event) => {
      if (event.type === 'syncStarted') {
        setIsSyncing(true);
        setSyncError(null);
      } else if (event.type === 'syncCompleted') {
        setIsSyncing(false);
        setLastSyncTime(syncManager.lastSyncTime);
        setPendingChanges(syncManager.pendingChanges);

        // Check if there were any errors
        if (event.data?.errors && event.data.errors.length > 0) {
          setSyncError(event.data.errors[0].error);
        }
      } else if (event.type === 'syncFailed') {
        setIsSyncing(false);
        setSyncError(event.error);
      } else if (event.type === 'syncTimeUpdated') {
        setLastSyncTime(event.data);
      } else if (event.type === 'pendingChangesUpdated') {
        setPendingChanges(event.data);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Sync watchlist to cloud
   */
  const syncWatchlistToCloud = useCallback(async () => {
    try {
      setSyncError(null);
      setIsSyncing(true);

      const result = await syncManager.syncWatchlist('push', {
        symbols,
        peersBySymbol,
        peersInfo
      });

      setIsSyncing(false);
      console.log('✅ Watchlist synced successfully');
      return result;
    } catch (error) {
      setIsSyncing(false);
      setSyncError(error.message);
      throw error;
    }
  }, [symbols, peersBySymbol, peersInfo]);

  /**
   * Pull watchlist from cloud
   */
  const pullWatchlistFromCloud = useCallback(async () => {
    try {
      setSyncError(null);
      setIsSyncing(true);

      const result = await syncManager.syncWatchlist('pull');

      setIsSyncing(false);

      if (result.exists && result.data) {
        console.log('📥 Watchlist downloaded from cloud:', result.data.symbols);
        return result.data;
      } else {
        console.log('📭 No watchlist found in cloud');
        return null;
      }
    } catch (error) {
      setIsSyncing(false);
      setSyncError(error.message);
      throw error;
    }
  }, []);

  /**
   * Sync everything (watchlist + preferences + alerts)
   */
  const syncAll = useCallback(async (direction = 'push') => {
    try {
      setSyncError(null);
      setIsSyncing(true);

      const localData = direction === 'push' ? {
        watchlist: { symbols, peersBySymbol, peersInfo },
        preferences: {}, // Will be populated when preferences store is implemented
        alerts: [] // Will be populated when alert management is implemented
      } : {};

      const result = await syncManager.syncAll(direction, localData);

      setIsSyncing(false);

      if (result.errors.length > 0) {
        setSyncError(`Sync completed with errors: ${result.errors.map(e => e.error).join(', ')}`);
      }

      return result;
    } catch (error) {
      setIsSyncing(false);
      setSyncError(error.message);
      throw error;
    }
  }, [symbols, peersBySymbol, peersInfo]);

  /**
   * Get sync status from server
   */
  const getSyncStatus = useCallback(async () => {
    try {
      return await syncManager.getSyncStatus();
    } catch (error) {
      setSyncError(error.message);
      throw error;
    }
  }, []);

  /**
   * Check if data needs sync (has pending changes)
   */
  const needsSync = useCallback(() => {
    return syncManager.hasPendingChanges();
  }, []);

  /**
   * Format time since last sync
   */
  const getTimeSinceSync = useCallback((type) => {
    const lastSync = lastSyncTime[type];
    if (!lastSync) return 'Never';

    const now = Date.now();
    const diff = now - lastSync;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }, [lastSyncTime]);

  /**
   * Mark watchlist as changed (needs sync)
   */
  const markWatchlistChanged = useCallback(() => {
    syncManager.markPendingChanges('watchlist', true);
    setPendingChanges(syncManager.pendingChanges);
  }, []);

  return {
    // State
    isSyncing,
    lastSyncTime,
    pendingChanges,
    syncError,

    // Actions
    syncWatchlistToCloud,
    pullWatchlistFromCloud,
    syncAll,
    getSyncStatus,
    markWatchlistChanged,

    // Helpers
    needsSync,
    getTimeSinceSync,
    hasPendingChanges: needsSync() // Convenience for UI
  };
};

export default useSync;
