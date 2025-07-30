import { renderHook, act } from '@testing-library/react';
import { useWatchlistStore } from './useWatchlistStore';

// Mock the peer fetcher
jest.mock('../utils/peerFetcher', () => ({
  getCachedPeers: jest.fn(),
  getPeersWithInfo: jest.fn()
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

describe('useWatchlistStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    act(() => {
      useWatchlistStore.getState().clearWatchlist();
      // Set up default symbols
      useWatchlistStore.setState({
        symbols: ['AAPL', 'MSFT', 'GOOGL'],
        eventFlags: {},
        lastNotificationDate: new Date().toDateString()
      });
    });
    
    // Clear localStorage mock calls
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  describe('addToWatchlist', () => {
    test('should add new symbol to watchlist', () => {
      const { result } = renderHook(() => useWatchlistStore());
      
      act(() => {
        const response = result.current.addToWatchlist('TSLA');
        expect(response.success).toBe(true);
        expect(response.message).toBe('Added TSLA to watchlist');
      });

      expect(result.current.symbols).toContain('TSLA');
      expect(result.current.symbols).toHaveLength(4);
    });

    test('should convert symbol to uppercase', () => {
      const { result } = renderHook(() => useWatchlistStore());
      
      act(() => {
        result.current.addToWatchlist('nvda');
      });

      expect(result.current.symbols).toContain('NVDA');
      expect(result.current.symbols).not.toContain('nvda');
    });

    test('should reject duplicate symbols', () => {
      const { result } = renderHook(() => useWatchlistStore());
      
      act(() => {
        const response = result.current.addToWatchlist('AAPL');
        expect(response.success).toBe(false);
        expect(response.message).toBe('Symbol already in watchlist');
      });

      expect(result.current.symbols).toHaveLength(3); // Should remain unchanged
    });

    test('should reject when maximum symbols reached', () => {
      const { result } = renderHook(() => useWatchlistStore());
      
      // Add symbols to reach max limit
      act(() => {
        ['TSLA', 'NVDA', 'META', 'NFLX', 'AMZN', 'CRM', 'UBER'].forEach(symbol => {
          result.current.addToWatchlist(symbol);
        });
      });

      expect(result.current.symbols).toHaveLength(10);

      act(() => {
        const response = result.current.addToWatchlist('SNAP');
        expect(response.success).toBe(false);
        expect(response.message).toBe('Maximum 10 symbols allowed');
      });

      expect(result.current.symbols).toHaveLength(10);
      expect(result.current.symbols).not.toContain('SNAP');
    });
  });

  describe('removeFromWatchlist', () => {
    test('should remove existing symbol from watchlist', () => {
      const { result } = renderHook(() => useWatchlistStore());
      
      act(() => {
        const response = result.current.removeFromWatchlist('AAPL');
        expect(response.success).toBe(true);
        expect(response.message).toBe('Removed AAPL from watchlist');
      });

      expect(result.current.symbols).not.toContain('AAPL');
      expect(result.current.symbols).toHaveLength(2);
    });

    test('should handle non-existent symbols', () => {
      const { result } = renderHook(() => useWatchlistStore());
      
      act(() => {
        const response = result.current.removeFromWatchlist('TSLA');
        expect(response.success).toBe(false);
        expect(response.message).toBe('Symbol not found in watchlist');
      });

      expect(result.current.symbols).toHaveLength(3); // Should remain unchanged
    });

    test('should remove associated event flags when removing symbol', () => {
      const { result } = renderHook(() => useWatchlistStore());
      
      // Set an event flag
      act(() => {
        result.current.setEventFlag('AAPL', 'volume_spike');
      });

      const today = new Date().toDateString();
      expect(result.current.eventFlags[`AAPL_volume_spike_${today}`]).toBe(true);

      // Remove the symbol
      act(() => {
        result.current.removeFromWatchlist('AAPL');
      });

      expect(result.current.eventFlags[`AAPL_volume_spike_${today}`]).toBeUndefined();
    });
  });

  describe('getWatchlist', () => {
    test('should return current symbols array', () => {
      const { result } = renderHook(() => useWatchlistStore());
      
      const watchlist = result.current.getWatchlist();
      
      expect(watchlist).toEqual(['AAPL', 'MSFT', 'GOOGL']);
      expect(Array.isArray(watchlist)).toBe(true);
    });
  });

  describe('event flag management', () => {
    test('should set event flag correctly', () => {
      const { result } = renderHook(() => useWatchlistStore());
      const today = new Date().toDateString();
      
      act(() => {
        result.current.setEventFlag('AAPL', 'volume_spike');
      });

      expect(result.current.eventFlags[`AAPL_volume_spike_${today}`]).toBe(true);
    });

    test('should check if event fired today', () => {
      const { result } = renderHook(() => useWatchlistStore());
      
      // Initially should be false
      expect(result.current.hasEventFiredToday('AAPL')).toBe(false);
      
      // Set event flag
      act(() => {
        result.current.setEventFlag('AAPL', 'volume_spike');
      });

      // Should now be true
      expect(result.current.hasEventFiredToday('AAPL')).toBe(true);
    });

    test('should clear old event flags on new day', () => {
      const { result } = renderHook(() => useWatchlistStore());
      
      // Set event flag for today
      act(() => {
        result.current.setEventFlag('AAPL', 'volume_spike');
      });

      // Simulate new day by changing lastNotificationDate
      act(() => {
        useWatchlistStore.setState({
          lastNotificationDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()
        });
      });

      act(() => {
        result.current.clearOldEventFlags();
      });

      expect(Object.keys(result.current.eventFlags)).toHaveLength(0);
      expect(result.current.lastNotificationDate).toBe(new Date().toDateString());
    });
  });

  describe('getWatchlistStats', () => {
    test('should return correct statistics', () => {
      const { result } = renderHook(() => useWatchlistStore());
      
      const stats = result.current.getWatchlistStats();
      
      expect(stats).toEqual({
        count: 3,
        remaining: 7,
        maxReached: false
      });
    });

    test('should indicate when max is reached', () => {
      const { result } = renderHook(() => useWatchlistStore());
      
      // Add symbols to reach max
      act(() => {
        ['TSLA', 'NVDA', 'META', 'NFLX', 'AMZN', 'CRM', 'UBER'].forEach(symbol => {
          result.current.addToWatchlist(symbol);
        });
      });

      const stats = result.current.getWatchlistStats();
      
      expect(stats).toEqual({
        count: 10,
        remaining: 0,
        maxReached: true
      });
    });
  });

  describe('clearWatchlist', () => {
    test('should clear all symbols and event flags', () => {
      const { result } = renderHook(() => useWatchlistStore());
      
      // Add event flag
      act(() => {
        result.current.setEventFlag('AAPL', 'volume_spike');
      });

      expect(result.current.symbols).toHaveLength(3);
      expect(Object.keys(result.current.eventFlags)).toHaveLength(1);

      act(() => {
        result.current.clearWatchlist();
      });

      expect(result.current.symbols).toHaveLength(0);
      expect(result.current.eventFlags).toEqual({});
      expect(result.current.peersBySymbol).toEqual({});
      expect(result.current.peersInfo).toEqual({});
    });
  });

  describe('Peer Management', () => {
    const { getCachedPeers, getPeersWithInfo } = require('../utils/peerFetcher');

    beforeEach(() => {
      getCachedPeers.mockClear();
      getPeersWithInfo.mockClear();
    });

    test('should fetch peers for a symbol', async () => {
      const mockPeers = ['MSFT', 'GOOGL', 'META', 'AMZN', 'TSLA'];
      const mockPeersInfo = mockPeers.map(symbol => ({
        symbol,
        name: `${symbol} Inc.`,
        sector: 'Technology',
        isLoading: false
      }));

      getCachedPeers.mockResolvedValue(mockPeers);
      getPeersWithInfo.mockResolvedValue(mockPeersInfo);

      const { result } = renderHook(() => useWatchlistStore());

      await act(async () => {
        const response = await result.current.fetchPeersFor('AAPL');
        expect(response.success).toBe(true);
        expect(response.peers).toEqual(mockPeers);
      });

      expect(getCachedPeers).toHaveBeenCalledWith('AAPL');
      expect(getPeersWithInfo).toHaveBeenCalledWith(mockPeers);
      expect(result.current.getPeersFor('AAPL')).toEqual(mockPeers);
      expect(result.current.getPeersInfoFor('AAPL')).toEqual(mockPeersInfo);
    });

    test('should return exactly 5 peers maximum', async () => {
      const mockPeers = ['MSFT', 'GOOGL', 'META', 'AMZN', 'TSLA'];
      getCachedPeers.mockResolvedValue(mockPeers);
      getPeersWithInfo.mockResolvedValue(mockPeers.map(symbol => ({ symbol })));

      const { result } = renderHook(() => useWatchlistStore());

      await act(async () => {
        await result.current.fetchPeersFor('AAPL');
      });

      const peers = result.current.getPeersFor('AAPL');
      expect(peers).toHaveLength(5);
      expect(peers).toEqual(mockPeers);
    });

    test('should clean up peer data when removing symbol', async () => {
      const mockPeers = ['MSFT', 'GOOGL', 'META'];
      getCachedPeers.mockResolvedValue(mockPeers);
      getPeersWithInfo.mockResolvedValue(mockPeers.map(symbol => ({ symbol })));

      const { result } = renderHook(() => useWatchlistStore());

      // Fetch peers for AAPL
      await act(async () => {
        await result.current.fetchPeersFor('AAPL');
      });

      expect(result.current.getPeersFor('AAPL')).toEqual(mockPeers);

      // Remove AAPL from watchlist
      act(() => {
        result.current.removeFromWatchlist('AAPL');
      });

      // Peer data should be cleaned up
      expect(result.current.getPeersFor('AAPL')).toEqual([]);
      expect(result.current.getPeersInfoFor('AAPL')).toEqual([]);
    });

    test('should handle peer fetching errors gracefully', async () => {
      getCachedPeers.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useWatchlistStore());

      await act(async () => {
        const response = await result.current.fetchPeersFor('INVALID');
        expect(response.success).toBe(false);
        expect(response.error).toBe('API Error');
      });

      expect(result.current.getPeersFor('INVALID')).toEqual([]);
    });

    test('should return empty arrays for unknown symbols', () => {
      const { result } = renderHook(() => useWatchlistStore());

      expect(result.current.getPeersFor('UNKNOWN')).toEqual([]);
      expect(result.current.getPeersInfoFor('UNKNOWN')).toEqual([]);
    });

    test('should fetch peers when adding new symbol to watchlist', async () => {
      const mockPeers = ['AMZN', 'WMT', 'TGT', 'HD', 'LOW'];
      getCachedPeers.mockResolvedValue(mockPeers);
      getPeersWithInfo.mockResolvedValue(mockPeers.map(symbol => ({ symbol })));

      const { result } = renderHook(() => useWatchlistStore());

      await act(async () => {
        result.current.addToWatchlist('COST');
        // Wait a bit for the async peer fetching to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(getCachedPeers).toHaveBeenCalledWith('COST');
      expect(result.current.symbols).toContain('COST');
    });
  });
});