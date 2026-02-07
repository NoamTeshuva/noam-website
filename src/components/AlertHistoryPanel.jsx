/**
 * Alert History Panel Component
 * Displays historical alerts from IndexedDB
 * Supports filtering by symbol, type, and date range
 * Allows export to CSV/JSON
 */

import React, { useState, useEffect } from 'react';
import { Download, Filter, X, AlertCircle } from 'lucide-react';
import indexedDBService from '../services/indexedDBService';
import { downloadAlertHistory } from '../utils/exportImport';

const AlertHistoryPanel = ({ isOpen, onClose }) => {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterSymbol, setFilterSymbol] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Load alerts from IndexedDB on mount
  useEffect(() => {
    if (isOpen) {
      loadAlerts();
    }
  }, [isOpen]);

  // Apply filters whenever alerts or filters change
  useEffect(() => {
    applyFilters();
  }, [alerts, filterSymbol, filterType]);

  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      const alertHistory = await indexedDBService.getAlertHistory(null, 100); // Last 100 alerts
      setAlerts(alertHistory);
    } catch (error) {
      console.error('Failed to load alert history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...alerts];

    // Filter by symbol
    if (filterSymbol) {
      filtered = filtered.filter(alert =>
        alert.symbol.toUpperCase().includes(filterSymbol.toUpperCase())
      );
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(alert => alert.type === filterType);
    }

    setFilteredAlerts(filtered);
  };

  const handleExport = async (format) => {
    try {
      await downloadAlertHistory(filterSymbol || null, format);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const clearFilters = () => {
    setFilterSymbol('');
    setFilterType('all');
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatTimestamp = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-bloomberg-panel border border-bloomberg-border rounded w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-bloomberg-border">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-bloomberg-orange" />
            <h2 className="text-lg font-bold text-bloomberg-orange">Alert History</h2>
            <span className="text-sm text-gray-400">
              ({filteredAlerts.length} {filteredAlerts.length === 1 ? 'alert' : 'alerts'})
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-1 px-3 py-1 rounded text-xs transition-colors ${
                showFilters ? 'bg-bloomberg-secondary text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              <Filter className="h-3 w-3" />
              <span>Filters</span>
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center space-x-1 px-3 py-1 rounded text-xs text-gray-300 hover:text-white transition-colors"
              title="Export to CSV"
            >
              <Download className="h-3 w-3" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => handleExport('json')}
              className="flex items-center space-x-1 px-3 py-1 rounded text-xs text-gray-300 hover:text-white transition-colors"
              title="Export to JSON"
            >
              <Download className="h-3 w-3" />
              <span>JSON</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="p-4 bg-bloomberg-secondary border-b border-bloomberg-border">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">Symbol</label>
                <input
                  type="text"
                  value={filterSymbol}
                  onChange={(e) => setFilterSymbol(e.target.value)}
                  placeholder="Filter by symbol..."
                  className="w-full bg-bloomberg-panel border border-bloomberg-border rounded px-3 py-1 text-sm text-white focus:outline-none focus:border-bloomberg-orange"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full bg-bloomberg-panel border border-bloomberg-border rounded px-3 py-1 text-sm text-white focus:outline-none focus:border-bloomberg-orange"
                >
                  <option value="all">All Types</option>
                  <option value="volume_spike">Volume Spike</option>
                  <option value="price_alert">Price Alert</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="px-3 py-1 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Alert List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-400">Loading alerts...</div>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <AlertCircle className="h-12 w-12 mb-2 opacity-50" />
              <p>No alerts found</p>
              {(filterSymbol || filterType !== 'all') && (
                <button
                  onClick={clearFilters}
                  className="mt-2 text-sm text-bloomberg-orange hover:text-white transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="bg-bloomberg-secondary border border-bloomberg-border rounded p-3 hover:border-bloomberg-orange/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-bloomberg-orange font-bold">{alert.symbol}</span>
                        <span className="text-xs px-2 py-0.5 bg-bloomberg-orange/20 text-bloomberg-orange rounded">
                          {alert.type}
                        </span>
                        <span className="text-xs text-gray-500">{formatTimestamp(alert.timestamp)}</span>
                      </div>
                      <p className="text-sm text-gray-300">{alert.message}</p>
                      {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                        <div className="mt-2 text-xs text-gray-500 space-y-1">
                          {Object.entries(alert.metadata).map(([key, value]) => (
                            <div key={key}>
                              <span className="text-gray-400">{key}:</span>{' '}
                              <span>{typeof value === 'number' ? value.toLocaleString() : value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 text-right whitespace-nowrap ml-4">
                      {formatDate(alert.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertHistoryPanel;
