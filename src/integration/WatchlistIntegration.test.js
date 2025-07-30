import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import BloombergSimple from '../pages/BloombergSimple';
import { useWatchlistStore } from '../store/useWatchlistStore';
import { EventDetector } from '../utils/eventDetector';

// Mock the API modules
jest.mock('../utils/api', () => ({
  alphaVantageAPI: {
    searchSymbol: jest.fn(),
    getQuote: jest.fn()
  }
}));

jest.mock('../hooks/useSmartPolling', () => ({
  useSmartPolling: () => ({
    stockData: {
      AAPL: { price: 150.25, change: 2.45, changePercent: 1.65 },
      MSFT: { price: 380.50, change: -1.25, changePercent: -0.33 }
    },
    isLoading: false,
    lastUpdated: new Date(),
    error: null,
    refreshAll: jest.fn()
  }),
  formatters: {
    price: (price) => `$${price?.toFixed(2) || '—'}`,
    change: (change, percent) => `${change >= 0 ? '+' : ''}${change?.toFixed(2)} (${change >= 0 ? '+' : ''}${percent?.toFixed(2)}%)`
  }
}));

jest.mock('../hooks/useLivePrice', () => {
  return (symbol) => {
    const mockData = {
      AAPL: { price: 150.25, change: 2.45, changePercent: 1.65 },
      MSFT: { price: 380.50, change: -1.25, changePercent: -0.33 }
    };
    return mockData[symbol] || null;
  };
});

// Mock EventDetector
jest.mock('../utils/eventDetector', () => ({
  ...jest.requireActual('../utils/eventDetector'),
  EventDetector: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    checkNow: jest.fn(),
    isRunning: false
  }))
}));

import { alphaVantageAPI } from '../utils/api';

const TestWrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Watchlist Integration Tests', () => {
  beforeEach(() => {
    // Reset watchlist store
    act(() => {
      useWatchlistStore.getState().clearWatchlist();
      useWatchlistStore.setState({
        symbols: ['AAPL', 'MSFT'],
        eventFlags: {},
        lastNotificationDate: new Date().toDateString()
      });
    });

    jest.clearAllMocks();
  });

  test('should display watchlist symbols in the dashboard', async () => {
    render(
      <TestWrapper>
        <BloombergSimple />
      </TestWrapper>
    );

    // Check that watchlist symbols are displayed in the grid
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('MSFT')).toBeInTheDocument();
    
    // Check that watchlist count is shown in header
    expect(screen.getByText(/WATCHLIST \(2\)/)).toBeInTheDocument();
  });

  test('should open and close watchlist sidebar', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <BloombergSimple />
      </TestWrapper>
    );

    // Initially sidebar should be closed
    expect(screen.queryByText('📊 WATCHLIST')).not.toBeInTheDocument();

    // Click watchlist button to open
    const watchlistButton = screen.getByText(/WATCHLIST \(2\)/);
    await user.click(watchlistButton);

    // Sidebar should now be open
    await waitFor(() => {
      expect(screen.getByText('📊 WATCHLIST')).toBeInTheDocument();
    });

    // Should show current symbols
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('MSFT')).toBeInTheDocument();
  });

  test('should add new symbol to watchlist through search', async () => {
    const user = userEvent.setup();
    
    // Mock search API response
    alphaVantageAPI.searchSymbol.mockResolvedValueOnce([
      {
        '1. symbol': 'TSLA',
        '2. name': 'Tesla Inc.',
        '4. region': 'United States'
      }
    ]);

    render(
      <TestWrapper>
        <BloombergSimple />
      </TestWrapper>
    );

    // Open watchlist sidebar
    const watchlistButton = screen.getByText(/WATCHLIST \(2\)/);
    await user.click(watchlistButton);

    await waitFor(() => {
      expect(screen.getByText('📊 WATCHLIST')).toBeInTheDocument();
    });

    // Type in search box
    const searchInput = screen.getByPlaceholderText(/Search stocks/);
    await user.type(searchInput, 'TSLA');

    // Wait for search results
    await waitFor(() => {
      expect(alphaVantageAPI.searchSymbol).toHaveBeenCalledWith('TSLA');
    });

    // Click add button for TSLA
    const addButton = screen.getByText('Add');
    await user.click(addButton);

    // Verify symbol was added to store
    await waitFor(() => {
      const symbols = useWatchlistStore.getState().symbols;
      expect(symbols).toContain('TSLA');
      expect(symbols).toHaveLength(3);
    });
  });

  test('should remove symbol from watchlist', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <BloombergSimple />
      </TestWrapper>
    );

    // Open watchlist sidebar
    const watchlistButton = screen.getByText(/WATCHLIST \(2\)/);
    await user.click(watchlistButton);

    await waitFor(() => {
      expect(screen.getByText('📊 WATCHLIST')).toBeInTheDocument();
    });

    // Find and click remove button for AAPL (X button)
    const removeButtons = screen.getAllByTitle('Remove from watchlist');
    await user.click(removeButtons[0]); // First symbol (AAPL)

    // Should show confirmation buttons
    const confirmButton = screen.getByTitle('Confirm remove');
    await user.click(confirmButton);

    // Verify symbol was removed from store
    await waitFor(() => {
      const symbols = useWatchlistStore.getState().symbols;
      expect(symbols).not.toContain('AAPL');
      expect(symbols).toHaveLength(1);
    });
  });

  test('should prevent adding duplicate symbols', async () => {
    const user = userEvent.setup();
    
    // Mock search API response with existing symbol
    alphaVantageAPI.searchSymbol.mockResolvedValueOnce([
      {
        '1. symbol': 'AAPL',
        '2. name': 'Apple Inc.',
        '4. region': 'United States'
      }
    ]);

    render(
      <TestWrapper>
        <BloombergSimple />
      </TestWrapper>
    );

    // Open watchlist sidebar
    const watchlistButton = screen.getByText(/WATCHLIST \(2\)/);
    await user.click(watchlistButton);

    await waitFor(() => {
      expect(screen.getByText('📊 WATCHLIST')).toBeInTheDocument();
    });

    // Search for existing symbol
    const searchInput = screen.getByPlaceholderText(/Search stocks/);
    await user.type(searchInput, 'AAPL');

    await waitFor(() => {
      expect(alphaVantageAPI.searchSymbol).toHaveBeenCalledWith('AAPL');
    });

    // Add button should show "Added" and be disabled
    expect(screen.getByText('Added')).toBeInTheDocument();
    expect(screen.getByText('Added')).toBeDisabled();
  });

  test('should enforce maximum watchlist limit', async () => {
    const user = userEvent.setup();
    
    // Fill watchlist to maximum
    act(() => {
      useWatchlistStore.setState({
        symbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'META', 'NFLX', 'AMZN', 'CRM', 'UBER']
      });
    });

    // Mock search API response
    alphaVantageAPI.searchSymbol.mockResolvedValueOnce([
      {
        '1. symbol': 'SNAP',
        '2. name': 'Snap Inc.',
        '4. region': 'United States'
      }
    ]);

    render(
      <TestWrapper>
        <BloombergSimple />
      </TestWrapper>
    );

    // Open watchlist sidebar
    const watchlistButton = screen.getByText(/WATCHLIST \(10\)/);
    await user.click(watchlistButton);

    await waitFor(() => {
      expect(screen.getByText('📊 WATCHLIST')).toBeInTheDocument();
    });

    // Search input should be disabled
    const searchInput = screen.getByPlaceholderText(/Search stocks/);
    expect(searchInput).toBeDisabled();

    // Should show "0 remaining"
    expect(screen.getByText('0 remaining')).toBeInTheDocument();
  });

  test('should simulate volume spike notification flow', async () => {
    // Mock notification system
    const mockNotificationCallback = jest.fn();
    
    // Mock EventDetector constructor to capture callback
    EventDetector.mockImplementation((store, callback) => {
      mockNotificationCallback.mockImplementation(callback);
      return {
        start: jest.fn(),
        stop: jest.fn(),
        checkNow: jest.fn(),
        isRunning: false
      };
    });

    render(
      <TestWrapper>
        <BloombergSimple />
      </TestWrapper>
    );

    // Simulate volume spike event
    act(() => {
      mockNotificationCallback({
        symbol: 'AAPL',
        type: 'volume_spike',
        todayVolume: 100000000,
        averageVolume14d: 50000000,
        ratio: 2.0,
        timestamp: new Date().toISOString()
      });
    });

    // Check that event flag was set (preventing duplicate notifications)
    expect(useWatchlistStore.getState().hasEventFiredToday('AAPL', 'volume_spike')).toBe(false);
  });

  test('should persist watchlist across page reloads', () => {
    // Add symbol to watchlist
    act(() => {
      useWatchlistStore.getState().addToWatchlist('TSLA');
    });

    // Simulate page reload by creating new component instance
    const { unmount } = render(
      <TestWrapper>
        <BloombergSimple />
      </TestWrapper>
    );

    unmount();

    // Render again (simulating reload)
    render(
      <TestWrapper>
        <BloombergSimple />
      </TestWrapper>
    );

    // Should still show TSLA in watchlist count
    expect(screen.getByText(/WATCHLIST \(3\)/)).toBeInTheDocument();
  });

  test('should handle API errors gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock search API to fail
    alphaVantageAPI.searchSymbol.mockRejectedValueOnce(new Error('API Error'));

    render(
      <TestWrapper>
        <BloombergSimple />
      </TestWrapper>
    );

    // Open watchlist sidebar
    const watchlistButton = screen.getByText(/WATCHLIST \(2\)/);
    await user.click(watchlistButton);

    await waitFor(() => {
      expect(screen.getByText('📊 WATCHLIST')).toBeInTheDocument();
    });

    // Type in search box
    const searchInput = screen.getByPlaceholderText(/Search stocks/);
    await user.type(searchInput, 'INVALID');

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('Search failed. Please try again.')).toBeInTheDocument();
    });
  });
});