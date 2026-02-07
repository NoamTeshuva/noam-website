/**
 * Data Export/Import Utility
 * Handles exporting and importing watchlist, preferences, and alert history
 * Supports JSON and CSV formats
 */

import indexedDBService from '../services/indexedDBService';

/**
 * Export watchlist to JSON
 * @param {Object} watchlistData - Watchlist data from store
 * @returns {string} JSON string
 */
export function exportWatchlistJSON(watchlistData) {
  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    type: 'watchlist',
    data: {
      symbols: watchlistData.symbols || [],
      peersBySymbol: watchlistData.peersBySymbol || {},
      peersInfo: watchlistData.peersInfo || {}
    }
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export watchlist to CSV
 * @param {Object} watchlistData - Watchlist data from store
 * @returns {string} CSV string
 */
export function exportWatchlistCSV(watchlistData) {
  const { symbols = [] } = watchlistData;

  const header = 'Symbol\n';
  const rows = symbols.map(symbol => `${symbol}`).join('\n');

  return header + rows;
}

/**
 * Export preferences to JSON
 * @param {Object} preferences - Preferences from store
 * @returns {string} JSON string
 */
export function exportPreferencesJSON(preferences) {
  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    type: 'preferences',
    data: preferences
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export alert history to JSON
 * @param {Array} alerts - Alert history from IndexedDB
 * @returns {string} JSON string
 */
export function exportAlertsJSON(alerts) {
  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    type: 'alerts',
    data: alerts || []
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export alert history to CSV
 * @param {Array} alerts - Alert history from IndexedDB
 * @returns {string} CSV string
 */
export function exportAlertsCSV(alerts) {
  const header = 'Symbol,Type,Timestamp,Date,Message\n';
  const rows = (alerts || []).map(alert => {
    const date = new Date(alert.timestamp).toLocaleString();
    const message = (alert.message || '').replace(/"/g, '""'); // Escape quotes
    return `${alert.symbol},${alert.type},${alert.timestamp},"${date}","${message}"`;
  }).join('\n');

  return header + rows;
}

/**
 * Export all data (watchlist + preferences + alerts) to JSON
 * @param {Object} watchlistData - Watchlist data
 * @param {Object} preferences - Preferences data
 * @param {Array} alerts - Alert history
 * @returns {string} JSON string
 */
export function exportAllDataJSON(watchlistData, preferences, alerts) {
  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    type: 'full_backup',
    data: {
      watchlist: {
        symbols: watchlistData.symbols || [],
        peersBySymbol: watchlistData.peersBySymbol || {},
        peersInfo: watchlistData.peersInfo || {}
      },
      preferences: preferences || {},
      alerts: alerts || []
    }
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Download data as file
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type (default: application/json)
 */
export function downloadFile(content, filename, mimeType = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export watchlist and download as file
 * @param {Object} watchlistData - Watchlist data
 * @param {string} format - 'json' or 'csv'
 */
export function downloadWatchlist(watchlistData, format = 'json') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

  if (format === 'json') {
    const content = exportWatchlistJSON(watchlistData);
    downloadFile(content, `watchlist-${timestamp}.json`, 'application/json');
  } else if (format === 'csv') {
    const content = exportWatchlistCSV(watchlistData);
    downloadFile(content, `watchlist-${timestamp}.csv`, 'text/csv');
  }
}

/**
 * Export preferences and download as file
 * @param {Object} preferences - Preferences data
 */
export function downloadPreferences(preferences) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const content = exportPreferencesJSON(preferences);
  downloadFile(content, `preferences-${timestamp}.json`, 'application/json');
}

/**
 * Export alert history and download as file
 * @param {string} symbol - Symbol to filter (optional, if null exports all)
 * @param {string} format - 'json' or 'csv'
 */
export async function downloadAlertHistory(symbol = null, format = 'json') {
  const alerts = await indexedDBService.getAlertHistory(symbol, 1000); // Get last 1000 alerts
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

  if (format === 'json') {
    const content = exportAlertsJSON(alerts);
    const filename = symbol
      ? `alerts-${symbol}-${timestamp}.json`
      : `alerts-all-${timestamp}.json`;
    downloadFile(content, filename, 'application/json');
  } else if (format === 'csv') {
    const content = exportAlertsCSV(alerts);
    const filename = symbol
      ? `alerts-${symbol}-${timestamp}.csv`
      : `alerts-all-${timestamp}.csv`;
    downloadFile(content, filename, 'text/csv');
  }
}

/**
 * Export all data (full backup) and download as file
 * @param {Object} watchlistData - Watchlist data
 * @param {Object} preferences - Preferences data
 */
export async function downloadFullBackup(watchlistData, preferences) {
  const alerts = await indexedDBService.getAlertHistory(null, 10000); // All alerts
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

  const content = exportAllDataJSON(watchlistData, preferences, alerts);
  downloadFile(content, `market-terminal-backup-${timestamp}.json`, 'application/json');
}

/**
 * Import watchlist from JSON file
 * @param {File} file - File object from input
 * @returns {Promise<Object>} Parsed watchlist data
 */
export async function importWatchlistJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);

        // Validate structure
        if (parsed.type !== 'watchlist' && parsed.type !== 'full_backup') {
          reject(new Error('Invalid file type - expected watchlist or full backup'));
          return;
        }

        const watchlistData = parsed.type === 'watchlist'
          ? parsed.data
          : parsed.data.watchlist;

        if (!watchlistData || !Array.isArray(watchlistData.symbols)) {
          reject(new Error('Invalid watchlist format - missing symbols array'));
          return;
        }

        resolve({
          symbols: watchlistData.symbols,
          peersBySymbol: watchlistData.peersBySymbol || {},
          peersInfo: watchlistData.peersInfo || {}
        });
      } catch (error) {
        reject(new Error(`Failed to parse JSON: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Import watchlist from CSV file
 * @param {File} file - File object from input
 * @returns {Promise<Object>} Parsed watchlist data
 */
export async function importWatchlistCSV(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target.result;
        const lines = content.split('\n').filter(line => line.trim());

        // Skip header if present
        const symbols = lines
          .filter((line, index) => {
            // Skip header row if it says "Symbol"
            if (index === 0 && line.trim().toLowerCase() === 'symbol') return false;
            return true;
          })
          .map(line => line.trim().toUpperCase())
          .filter(symbol => /^[A-Z]+$/.test(symbol)); // Only valid symbols

        if (symbols.length === 0) {
          reject(new Error('No valid symbols found in CSV'));
          return;
        }

        resolve({
          symbols,
          peersBySymbol: {},
          peersInfo: {}
        });
      } catch (error) {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Import preferences from JSON file
 * @param {File} file - File object from input
 * @returns {Promise<Object>} Parsed preferences data
 */
export async function importPreferencesJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);

        if (parsed.type !== 'preferences' && parsed.type !== 'full_backup') {
          reject(new Error('Invalid file type - expected preferences or full backup'));
          return;
        }

        const preferences = parsed.type === 'preferences'
          ? parsed.data
          : parsed.data.preferences;

        resolve(preferences);
      } catch (error) {
        reject(new Error(`Failed to parse JSON: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Import full backup from JSON file
 * @param {File} file - File object from input
 * @returns {Promise<Object>} Parsed backup data (watchlist, preferences, alerts)
 */
export async function importFullBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);

        if (parsed.type !== 'full_backup') {
          reject(new Error('Invalid file type - expected full backup'));
          return;
        }

        resolve({
          watchlist: parsed.data.watchlist,
          preferences: parsed.data.preferences,
          alerts: parsed.data.alerts
        });
      } catch (error) {
        reject(new Error(`Failed to parse JSON: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

export default {
  exportWatchlistJSON,
  exportWatchlistCSV,
  exportPreferencesJSON,
  exportAlertsJSON,
  exportAlertsCSV,
  exportAllDataJSON,
  downloadFile,
  downloadWatchlist,
  downloadPreferences,
  downloadAlertHistory,
  downloadFullBackup,
  importWatchlistJSON,
  importWatchlistCSV,
  importPreferencesJSON,
  importFullBackup
};
