import {
  calculateAverageVolume14d,
  getTodayVolume,
  shouldNotifyVolumeSpike,
  formatVolumeForNotification,
  createVolumeSpikeMessage,
  checkWatchlistForVolumeSpikes,
  EventDetector
} from './eventDetector';

// Mock the API module
jest.mock('./api', () => ({
  alphaVantageAPI: {
    getQuote: jest.fn()
  }
}));

import { alphaVantageAPI } from './api';

// Mock fetch
global.fetch = jest.fn();

describe('eventDetector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  describe('calculateAverageVolume14d', () => {
    test('should calculate correct average volume', async () => {
      const mockResponse = {
        'Time Series (Daily)': {
          '2024-01-15': { '5. volume': '50000000' },
          '2024-01-14': { '5. volume': '50000000' },
          '2024-01-13': { '5. volume': '50000000' },
          '2024-01-12': { '5. volume': '50000000' },
          '2024-01-11': { '5. volume': '50000000' },
          '2024-01-10': { '5. volume': '50000000' },
          '2024-01-09': { '5. volume': '50000000' },
          '2024-01-08': { '5. volume': '50000000' },
          '2024-01-07': { '5. volume': '50000000' },
          '2024-01-06': { '5. volume': '50000000' },
          '2024-01-05': { '5. volume': '50000000' },
          '2024-01-04': { '5. volume': '50000000' },
          '2024-01-03': { '5. volume': '50000000' },
          '2024-01-02': { '5. volume': '50000000' }
        }
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      });

      const average = await calculateAverageVolume14d('AAPL');
      
      expect(average).toBe(50000000); // All volumes are the same, so average should be 50M
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('TIME_SERIES_DAILY&symbol=AAPL')
      );
    });

    test('should handle API errors gracefully', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ 'Error Message': 'API limit reached' })
      });

      const average = await calculateAverageVolume14d('INVALID');
      
      expect(average).toBe(0);
    });

    test('should handle missing data gracefully', async () => {
      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve({})
      });

      const average = await calculateAverageVolume14d('AAPL');
      
      expect(average).toBe(0);
    });
  });

  describe('getTodayVolume', () => {
    test('should return current volume from quote', async () => {
      alphaVantageAPI.getQuote.mockResolvedValueOnce({
        volume: 75000000,
        price: 150.25
      });

      const volume = await getTodayVolume('AAPL');
      
      expect(volume).toBe(75000000);
      expect(alphaVantageAPI.getQuote).toHaveBeenCalledWith('AAPL');
    });

    test('should handle API errors gracefully', async () => {
      alphaVantageAPI.getQuote.mockRejectedValueOnce(new Error('API Error'));

      const volume = await getTodayVolume('AAPL');
      
      expect(volume).toBe(0);
    });
  });

  describe('shouldNotifyVolumeSpike', () => {
    test('should return true when volume is 2x average', () => {
      const result = shouldNotifyVolumeSpike('AAPL', 100000000, 50000000);
      expect(result).toBe(true);
    });

    test('should return true when volume is more than 2x average', () => {
      const result = shouldNotifyVolumeSpike('AAPL', 150000000, 50000000);
      expect(result).toBe(true);
    });

    test('should return false when volume is less than 2x average', () => {
      const result = shouldNotifyVolumeSpike('AAPL', 90000000, 50000000);
      expect(result).toBe(false);
    });

    test('should return false when average volume is 0', () => {
      const result = shouldNotifyVolumeSpike('AAPL', 100000000, 0);
      expect(result).toBe(false);
    });
  });

  describe('formatVolumeForNotification', () => {
    test('should format billions correctly', () => {
      expect(formatVolumeForNotification(2500000000)).toBe('2.5B');
    });

    test('should format millions correctly', () => {
      expect(formatVolumeForNotification(75000000)).toBe('75.0M');
    });

    test('should format thousands correctly', () => {
      expect(formatVolumeForNotification(5500)).toBe('5.5K');
    });

    test('should format small numbers as-is', () => {
      expect(formatVolumeForNotification(500)).toBe('500');
    });
  });

  describe('createVolumeSpikeMessage', () => {
    test('should create properly formatted message', () => {
      const data = {
        symbol: 'AAPL',
        todayVolume: 100000000,
        averageVolume14d: 50000000,
        ratio: 2.0
      };

      const message = createVolumeSpikeMessage(data);
      
      expect(message).toBe('🚨 AAPL Volume Spike Alert! Today: 100.0M (2.0x avg of 50.0M)');
    });
  });

  describe('checkWatchlistForVolumeSpikes', () => {
    test('should check all symbols and trigger notifications', async () => {
      const symbols = ['AAPL', 'MSFT'];
      const onVolumeSpike = jest.fn();
      const hasEventFiredToday = jest.fn().mockReturnValue(false);
      const setEventFlag = jest.fn();

      // Mock API responses
      alphaVantageAPI.getQuote
        .mockResolvedValueOnce({ volume: 100000000 }) // AAPL
        .mockResolvedValueOnce({ volume: 80000000 });  // MSFT

      fetch
        .mockResolvedValueOnce({ // AAPL volume history
          json: () => Promise.resolve({
            'Time Series (Daily)': Array.from({length: 14}, (_, i) => [`2024-01-${15-i}`, { '5. volume': '50000000' }])
              .reduce((acc, [date, data]) => ({ ...acc, [date]: data }), {})
          })
        })
        .mockResolvedValueOnce({ // MSFT volume history
          json: () => Promise.resolve({
            'Time Series (Daily)': Array.from({length: 14}, (_, i) => [`2024-01-${15-i}`, { '5. volume': '60000000' }])
              .reduce((acc, [date, data]) => ({ ...acc, [date]: data }), {})
          })
        });

      const results = await checkWatchlistForVolumeSpikes(
        symbols,
        onVolumeSpike,
        hasEventFiredToday,
        setEventFlag
      );

      expect(results).toHaveLength(1); // Only AAPL should trigger (100M >= 2 * 50M)
      expect(onVolumeSpike).toHaveBeenCalledTimes(1);
      expect(setEventFlag).toHaveBeenCalledWith('AAPL', 'volume_spike');
    });

    test('should skip symbols that already triggered today', async () => {
      const symbols = ['AAPL'];
      const onVolumeSpike = jest.fn();
      const hasEventFiredToday = jest.fn().mockReturnValue(true); // Already triggered
      const setEventFlag = jest.fn();

      const results = await checkWatchlistForVolumeSpikes(
        symbols,
        onVolumeSpike,
        hasEventFiredToday,
        setEventFlag
      );

      expect(results).toHaveLength(0);
      expect(onVolumeSpike).not.toHaveBeenCalled();
      expect(setEventFlag).not.toHaveBeenCalled();
    });
  });

  describe('EventDetector', () => {
    let mockWatchlistStore;
    let mockNotificationCallback;
    let eventDetector;

    beforeEach(() => {
      mockWatchlistStore = {
        getState: jest.fn(() => ({
          getWatchlist: () => ['AAPL', 'MSFT'],
          hasEventFiredToday: jest.fn().mockReturnValue(false),
          setEventFlag: jest.fn(),
          clearOldEventFlags: jest.fn()
        }))
      };
      mockNotificationCallback = jest.fn();
      eventDetector = new EventDetector(mockWatchlistStore, mockNotificationCallback);
    });

    afterEach(() => {
      if (eventDetector.isRunning) {
        eventDetector.stop();
      }
    });

    test('should start and stop monitoring', () => {
      expect(eventDetector.isRunning).toBe(false);
      
      eventDetector.start(1); // 1 minute for testing
      expect(eventDetector.isRunning).toBe(true);
      expect(eventDetector.intervalId).toBeDefined();
      
      eventDetector.stop();
      expect(eventDetector.isRunning).toBe(false);
      expect(eventDetector.intervalId).toBeNull();
    });

    test('should not start if already running', () => {
      eventDetector.start(1);
      const firstIntervalId = eventDetector.intervalId;
      
      eventDetector.start(1); // Try to start again
      expect(eventDetector.intervalId).toBe(firstIntervalId); // Should remain the same
    });

    test('should check events manually', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await eventDetector.checkNow();
      
      expect(consoleSpy).toHaveBeenCalledWith('🔍 Manual event check triggered');
      
      consoleSpy.mockRestore();
    });
  });
});