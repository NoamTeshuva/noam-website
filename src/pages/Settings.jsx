/**
 * Settings Panel Page
 * Comprehensive settings management for the Market Terminal
 * Includes preferences, cache stats, sync controls, and data export/import
 */

import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Database,
  Cloud,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Bell,
  Layout,
  Zap,
  Info,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';
import { usePreferencesStore } from '../store/usePreferencesStore';
import { useWatchlistStore } from '../store/useWatchlistStore';
import { useNavigate } from 'react-router-dom';
import indexedDBService from '../services/indexedDBService';
import { useSync } from '../hooks/useSync';
import {
  downloadWatchlist,
  downloadPreferences,
  downloadFullBackup,
  importWatchlistJSON,
  importWatchlistCSV,
  importPreferencesJSON
} from '../utils/exportImport';

const Settings = () => {
  const navigate = useNavigate();

  // Stores
  const preferences = usePreferencesStore();
  const { symbols, setWatchlist } = useWatchlistStore();

  // Sync hook
  const {
    isSyncing,
    lastSyncTime,
    pendingChanges,
    syncError,
    syncAll,
    getTimeSinceSync
  } = useSync();

  // Local state
  const [activeTab, setActiveTab] = useState('preferences');
  const [cacheStats, setCacheStats] = useState(null);
  const [showSuccess, setShowSuccess] = useState('');
  const [showError, setShowError] = useState('');

  // Load cache statistics
  useEffect(() => {
    loadCacheStats();
  }, []);

  const loadCacheStats = async () => {
    try {
      const stats = await indexedDBService.getStats();

      // Calculate localStorage usage
      let localStorageSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          localStorageSize += localStorage[key].length + key.length;
        }
      }

      setCacheStats({
        indexedDB: stats,
        localStorage: {
          size: localStorageSize,
          sizeFormatted: formatBytes(localStorageSize * 2) // UTF-16 = 2 bytes per char
        }
      });
    } catch (error) {
      console.error('Failed to load cache statistics:', error);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handlers
  const handleClearCache = async () => {
    if (!window.confirm('Clear all cached data? This will remove historical quotes, alerts, and time series data.')) {
      return;
    }

    try {
      // Clear IndexedDB
      await indexedDBService.clearAll();

      // Clear localStorage cache (but keep auth and settings)
      const keysToKeep = ['auth-token', 'preferences-storage', 'watchlist-storage'];
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key) && !keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      }

      await loadCacheStats();
      showSuccessMessage('Cache cleared successfully');
    } catch (error) {
      showErrorMessage('Failed to clear cache: ' + error.message);
    }
  };

  const handleExportWatchlist = (format) => {
    try {
      const watchlistData = useWatchlistStore.getState();
      downloadWatchlist(watchlistData, format);
      showSuccessMessage(`Watchlist exported as ${format.toUpperCase()}`);
    } catch (error) {
      showErrorMessage('Export failed: ' + error.message);
    }
  };

  const handleExportPreferences = () => {
    try {
      const prefs = preferences.getAllPreferences();
      downloadPreferences(prefs);
      showSuccessMessage('Preferences exported');
    } catch (error) {
      showErrorMessage('Export failed: ' + error.message);
    }
  };

  const handleExportFullBackup = async () => {
    try {
      const watchlistData = useWatchlistStore.getState();
      const prefs = preferences.getAllPreferences();
      await downloadFullBackup(watchlistData, prefs);
      showSuccessMessage('Full backup created');
    } catch (error) {
      showErrorMessage('Backup failed: ' + error.message);
    }
  };

  const handleImportWatchlist = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      let watchlistData;
      if (file.name.endsWith('.json')) {
        watchlistData = await importWatchlistJSON(file);
      } else if (file.name.endsWith('.csv')) {
        watchlistData = await importWatchlistCSV(file);
      } else {
        throw new Error('Unsupported file format. Use JSON or CSV.');
      }

      setWatchlist(watchlistData);
      showSuccessMessage(`Imported ${watchlistData.symbols.length} symbols`);
    } catch (error) {
      showErrorMessage('Import failed: ' + error.message);
    }

    event.target.value = ''; // Reset file input
  };

  const handleImportPreferences = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const prefs = await importPreferencesJSON(file);
      preferences.setFromSyncedData(prefs);
      showSuccessMessage('Preferences imported');
    } catch (error) {
      showErrorMessage('Import failed: ' + error.message);
    }

    event.target.value = ''; // Reset file input
  };

  const handleResetPreferences = () => {
    if (!window.confirm('Reset all preferences to default values?')) {
      return;
    }
    preferences.resetToDefaults();
    showSuccessMessage('Preferences reset to defaults');
  };

  const handleSyncNow = async () => {
    try {
      await syncAll();
      showSuccessMessage('Sync completed successfully');
    } catch (error) {
      showErrorMessage('Sync failed: ' + error.message);
    }
  };

  const showSuccessMessage = (message) => {
    setShowSuccess(message);
    setTimeout(() => setShowSuccess(''), 3000);
  };

  const showErrorMessage = (message) => {
    setShowError(message);
    setTimeout(() => setShowError(''), 5000);
  };

  // Tab components
  const PreferencesTab = () => (
    <div className="space-y-6">
      {/* Theme Settings */}
      <div className="bg-bloomberg-secondary border border-bloomberg-border rounded p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Layout className="h-4 w-4 text-bloomberg-orange" />
          <h3 className="font-bold text-white">Appearance</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Theme</label>
            <select
              value={preferences.theme}
              onChange={(e) => preferences.setTheme(e.target.value)}
              className="w-full bg-bloomberg-panel border border-bloomberg-border rounded px-3 py-2 text-white focus:outline-none focus:border-bloomberg-orange"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Layout</label>
            <select
              value={preferences.layout}
              onChange={(e) => preferences.setLayout(e.target.value)}
              className="w-full bg-bloomberg-panel border border-bloomberg-border rounded px-3 py-2 text-white focus:outline-none focus:border-bloomberg-orange"
            >
              <option value="compact">Compact</option>
              <option value="spacious">Spacious</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Font Size</label>
            <select
              value={preferences.fontSize}
              onChange={(e) => preferences.setFontSize(e.target.value)}
              className="w-full bg-bloomberg-panel border border-bloomberg-border rounded px-3 py-2 text-white focus:outline-none focus:border-bloomberg-orange"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Compact Mode</span>
            <button
              onClick={preferences.toggleCompactMode}
              className={`px-3 py-1 rounded text-xs ${
                preferences.compactMode
                  ? 'bg-bloomberg-orange text-white'
                  : 'bg-bloomberg-panel border border-bloomberg-border text-gray-400'
              }`}
            >
              {preferences.compactMode ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Data Refresh Settings */}
      <div className="bg-bloomberg-secondary border border-bloomberg-border rounded p-4">
        <div className="flex items-center space-x-2 mb-4">
          <RefreshCw className="h-4 w-4 text-bloomberg-orange" />
          <h3 className="font-bold text-white">Data Refresh</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Refresh Interval (minutes)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={preferences.refreshInterval / 60000}
              onChange={(e) => preferences.setRefreshInterval(e.target.value * 60000)}
              className="w-full bg-bloomberg-panel border border-bloomberg-border rounded px-3 py-2 text-white focus:outline-none focus:border-bloomberg-orange"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Auto-refresh</span>
            <button
              onClick={preferences.toggleAutoRefresh}
              className={`px-3 py-1 rounded text-xs ${
                preferences.autoRefresh
                  ? 'bg-bloomberg-orange text-white'
                  : 'bg-bloomberg-panel border border-bloomberg-border text-gray-400'
              }`}
            >
              {preferences.autoRefresh ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-bloomberg-secondary border border-bloomberg-border rounded p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Bell className="h-4 w-4 text-bloomberg-orange" />
          <h3 className="font-bold text-white">Notifications</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Enable Notifications</span>
            <button
              onClick={() => preferences.setNotificationPreferences({
                enabled: !preferences.enableNotifications
              })}
              className={`px-3 py-1 rounded text-xs ${
                preferences.enableNotifications
                  ? 'bg-bloomberg-orange text-white'
                  : 'bg-bloomberg-panel border border-bloomberg-border text-gray-400'
              }`}
            >
              {preferences.enableNotifications ? 'ON' : 'OFF'}
            </button>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Volume Spike Threshold (multiplier)
            </label>
            <input
              type="number"
              min="1.5"
              max="5"
              step="0.1"
              value={preferences.volumeSpikeThreshold}
              onChange={(e) => preferences.setNotificationPreferences({
                threshold: parseFloat(e.target.value)
              })}
              className="w-full bg-bloomberg-panel border border-bloomberg-border rounded px-3 py-2 text-white focus:outline-none focus:border-bloomberg-orange"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Notification Duration (seconds)
            </label>
            <input
              type="number"
              min="3"
              max="30"
              value={preferences.notificationDuration / 1000}
              onChange={(e) => preferences.setNotificationPreferences({
                duration: e.target.value * 1000
              })}
              className="w-full bg-bloomberg-panel border border-bloomberg-border rounded px-3 py-2 text-white focus:outline-none focus:border-bloomberg-orange"
            />
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={handleResetPreferences}
        className="w-full px-4 py-2 bg-red-600/20 border border-red-600 text-red-500 rounded hover:bg-red-600/30 transition-colors text-sm"
      >
        Reset All to Defaults
      </button>
    </div>
  );

  const CacheTab = () => (
    <div className="space-y-6">
      {/* Cache Statistics */}
      <div className="bg-bloomberg-secondary border border-bloomberg-border rounded p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Database className="h-4 w-4 text-bloomberg-orange" />
          <h3 className="font-bold text-white">Storage Usage</h3>
        </div>

        {cacheStats ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">localStorage</span>
              <span className="text-white font-mono">{cacheStats.localStorage.sizeFormatted}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">IndexedDB</span>
              <span className="text-white font-mono">{formatBytes(cacheStats.indexedDB.estimatedSize)}</span>
            </div>

            <div className="border-t border-bloomberg-border pt-3 mt-3">
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex justify-between">
                  <span>Historical Quotes:</span>
                  <span>{cacheStats.indexedDB.quotes} entries</span>
                </div>
                <div className="flex justify-between">
                  <span>Alert History:</span>
                  <span>{cacheStats.indexedDB.alerts} entries</span>
                </div>
                <div className="flex justify-between">
                  <span>Time Series:</span>
                  <span>{cacheStats.indexedDB.timeSeries} entries</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4">Loading statistics...</div>
        )}
      </div>

      {/* Cache Actions */}
      <div className="bg-bloomberg-secondary border border-bloomberg-border rounded p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Zap className="h-4 w-4 text-bloomberg-orange" />
          <h3 className="font-bold text-white">Cache Management</h3>
        </div>

        <div className="space-y-2">
          <button
            onClick={loadCacheStats}
            className="w-full px-4 py-2 bg-bloomberg-panel border border-bloomberg-border text-white rounded hover:border-bloomberg-orange transition-colors text-sm flex items-center justify-center space-x-2"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Refresh Statistics</span>
          </button>

          <button
            onClick={handleClearCache}
            className="w-full px-4 py-2 bg-red-600/20 border border-red-600 text-red-500 rounded hover:bg-red-600/30 transition-colors text-sm flex items-center justify-center space-x-2"
          >
            <Trash2 className="h-3 w-3" />
            <span>Clear All Cache</span>
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          <Info className="h-3 w-3 inline mr-1" />
          Clearing cache will not affect your watchlist, preferences, or authentication.
        </div>
      </div>
    </div>
  );

  const SyncTab = () => (
    <div className="space-y-6">
      {/* Sync Status */}
      <div className="bg-bloomberg-secondary border border-bloomberg-border rounded p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Cloud className="h-4 w-4 text-bloomberg-orange" />
          <h3 className="font-bold text-white">Sync Status</h3>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Last Sync</span>
            <span className="text-white">
              {lastSyncTime ? getTimeSinceSync('watchlist') : 'Never'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Status</span>
            <span className={`text-sm ${
              isSyncing ? 'text-yellow-500' :
              pendingChanges ? 'text-bloomberg-orange' :
              'text-green-500'
            }`}>
              {isSyncing ? 'Syncing...' :
               pendingChanges ? 'Pending changes' :
               'Up to date'}
            </span>
          </div>

          {syncError && (
            <div className="p-2 bg-red-600/20 border border-red-600 rounded text-xs text-red-400">
              {syncError}
            </div>
          )}
        </div>
      </div>

      {/* Sync Controls */}
      <div className="bg-bloomberg-secondary border border-bloomberg-border rounded p-4">
        <div className="flex items-center space-x-2 mb-4">
          <RefreshCw className="h-4 w-4 text-bloomberg-orange" />
          <h3 className="font-bold text-white">Manual Sync</h3>
        </div>

        <button
          onClick={handleSyncNow}
          disabled={isSyncing}
          className="w-full px-4 py-2 bg-bloomberg-orange text-white rounded hover:bg-orange-600 transition-colors text-sm flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Cloud className={`h-3 w-3 ${isSyncing ? 'animate-pulse' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
        </button>

        <div className="mt-4 text-xs text-gray-500">
          <Info className="h-3 w-3 inline mr-1" />
          Syncs watchlist, preferences, and custom alerts across all your devices.
        </div>
      </div>
    </div>
  );

  const DataTab = () => (
    <div className="space-y-6">
      {/* Export */}
      <div className="bg-bloomberg-secondary border border-bloomberg-border rounded p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Download className="h-4 w-4 text-bloomberg-orange" />
          <h3 className="font-bold text-white">Export Data</h3>
        </div>

        <div className="space-y-2">
          <div className="flex space-x-2">
            <button
              onClick={() => handleExportWatchlist('json')}
              className="flex-1 px-3 py-2 bg-bloomberg-panel border border-bloomberg-border text-white rounded hover:border-bloomberg-orange transition-colors text-sm"
            >
              Watchlist (JSON)
            </button>
            <button
              onClick={() => handleExportWatchlist('csv')}
              className="flex-1 px-3 py-2 bg-bloomberg-panel border border-bloomberg-border text-white rounded hover:border-bloomberg-orange transition-colors text-sm"
            >
              Watchlist (CSV)
            </button>
          </div>

          <button
            onClick={handleExportPreferences}
            className="w-full px-3 py-2 bg-bloomberg-panel border border-bloomberg-border text-white rounded hover:border-bloomberg-orange transition-colors text-sm"
          >
            Preferences (JSON)
          </button>

          <button
            onClick={handleExportFullBackup}
            className="w-full px-3 py-2 bg-bloomberg-orange text-white rounded hover:bg-orange-600 transition-colors text-sm font-bold"
          >
            Full Backup (All Data)
          </button>
        </div>
      </div>

      {/* Import */}
      <div className="bg-bloomberg-secondary border border-bloomberg-border rounded p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Upload className="h-4 w-4 text-bloomberg-orange" />
          <h3 className="font-bold text-white">Import Data</h3>
        </div>

        <div className="space-y-2">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Import Watchlist</label>
            <input
              type="file"
              accept=".json,.csv"
              onChange={handleImportWatchlist}
              className="w-full px-3 py-2 bg-bloomberg-panel border border-bloomberg-border text-white rounded hover:border-bloomberg-orange transition-colors text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-bloomberg-orange file:text-white hover:file:bg-orange-600"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Import Preferences</label>
            <input
              type="file"
              accept=".json"
              onChange={handleImportPreferences}
              className="w-full px-3 py-2 bg-bloomberg-panel border border-bloomberg-border text-white rounded hover:border-bloomberg-orange transition-colors text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-bloomberg-orange file:text-white hover:file:bg-orange-600"
            />
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          <Info className="h-3 w-3 inline mr-1" />
          Importing will replace current data. Export a backup first to be safe.
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bloomberg-panel text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <SettingsIcon className="h-6 w-6 text-bloomberg-orange" />
            <h1 className="text-2xl font-bold text-bloomberg-orange">Settings</h1>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-bloomberg-secondary border border-bloomberg-border text-white rounded hover:border-bloomberg-orange transition-colors text-sm"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Success/Error Messages */}
        {showSuccess && (
          <div className="mb-4 p-3 bg-green-600/20 border border-green-600 rounded flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-400">{showSuccess}</span>
          </div>
        )}

        {showError && (
          <div className="mb-4 p-3 bg-red-600/20 border border-red-600 rounded flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-400">{showError}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 border-b border-bloomberg-border">
          {[
            { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
            { id: 'cache', label: 'Cache', icon: Database },
            { id: 'sync', label: 'Sync', icon: Cloud },
            { id: 'data', label: 'Data', icon: Download }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm flex items-center space-x-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-bloomberg-orange text-bloomberg-orange'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="h-3 w-3" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'preferences' && <PreferencesTab />}
          {activeTab === 'cache' && <CacheTab />}
          {activeTab === 'sync' && <SyncTab />}
          {activeTab === 'data' && <DataTab />}
        </div>

        {/* Footer Info */}
        <div className="mt-8 p-4 bg-bloomberg-secondary border border-bloomberg-border rounded">
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>Watchlist Symbols:</span>
              <span className="text-white">{symbols.length} / 50</span>
            </div>
            <div className="flex justify-between">
              <span>API Counter:</span>
              <span className="text-white">{preferences.showAPICounter ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div className="flex justify-between">
              <span>Version:</span>
              <span className="text-white">1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
