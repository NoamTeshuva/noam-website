// Testing Setup for Bloomberg Terminal
// package.json testing dependencies
/*
"devDependencies": {
  "@testing-library/react": "^13.4.0",
  "@testing-library/jest-dom": "^5.16.5",
  "@testing-library/user-event": "^14.4.3",
  "jest": "^27.5.1",
  "jest-environment-jsdom": "^27.5.1",
  "msw": "^0.49.0",
  "cypress": "^12.0.0",
  "cypress-real-events": "^1.7.6",
  "@percy/cypress": "^3.1.2",
  "start-server-and-test": "^1.15.2"
}
*/

// Jest Configuration (jest.config.js)
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/index.js',
    '!src/reportWebVitals.js',
    '!src/**/*.test.{js,jsx}',
    '!src/**/*.stories.{js,jsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};

// setupTests.js
import '@testing-library/jest-dom';
import { server } from './mocks/server';

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn()
}));

// Establish API mocking before all tests
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Unit Tests Example
// src/hooks/__tests__/useMarketStore.test.js
import { renderHook, act } from '@testing-library/react';
import { useMarketStore } from '../useMarketStore';

describe('useMarketStore', () => {
  beforeEach(() => {
    useMarketStore.getState().reset();
  });

  test('should update quote data', () => {
    const { result } = renderHook(() => useMarketStore());
    
    act(() => {
      result.current.updateQuote('AAPL', {
        price: 150.25,
        change: 2.5,
        changePercent: 1.69
      });
    });

    expect(result.current.quotes.AAPL).toEqual({
      price: 150.25,
      change: 2.5,
      changePercent: 1.69,
      timestamp: expect.any(Number)
    });
  });

  test('should handle symbol subscription', () => {
    const { result } = renderHook(() => useMarketStore());
    
    act(() => {
      result.current.subscribeToSymbol('MSFT');
    });

    expect(result.current.subscribedSymbols.has('MSFT')).toBe(true);
  });

  test('should cache fundamentals with expiration', () => {
    const { result } = renderHook(() => useMarketStore());
    const fundamentalsData = { pe: 25.5, marketCap: 2800000000 };
    
    act(() => {
      result.current.updateFundamentals('AAPL', fundamentalsData);
    });

    const cached = result.current.getFundamentals('AAPL');
    expect(cached).toEqual({
      ...fundamentalsData,
      cachedAt: expect.any(Number)
    });
  });
});

// Component Tests
// src/components/__tests__/QuoteCard.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuoteCard } from '../QuoteCard';
import { useMarketStore } from '../../stores/useMarketStore';

// Mock the store
jest.mock('../../stores/useMarketStore');

describe('QuoteCard', () => {
  const mockQuoteData = {
    symbol: 'AAPL',
    price: 150.25,
    change: 2.5,
    changePercent: 1.69,
    volume: 45200000,
    marketCap: 2800000000000,
    name: 'Apple Inc.'
  };

  beforeEach(() => {
    useMarketStore.mockReturnValue({
      quotes: { AAPL: mockQuoteData },
      subscribeToSymbol: jest.fn()
    });
  });

  test('renders quote data correctly', () => {
    render(<QuoteCard symbol="AAPL" />);
    
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('$150.25')).toBeInTheDocument();
    expect(screen.getByText('+2.50 (+1.69%)')).toBeInTheDocument();
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
  });

  test('applies correct styling for positive change', () => {
    render(<QuoteCard symbol="AAPL" />);
    
    const changeElement = screen.getByText('+2.50 (+1.69%)');
    expect(changeElement).toHaveClass('text-bloomberg-data-positive');
  });

  test('applies correct styling for negative change', () => {
    useMarketStore.mockReturnValue({
      quotes: { 
        AAPL: { ...mockQuoteData, change: -2.5, changePercent: -1.69 }
      }
    });

    render(<QuoteCard symbol="AAPL" />);
    
    const changeElement = screen.getByText('-2.50 (-1.69%)');
    expect(changeElement).toHaveClass('text-bloomberg-data-negative');
  });

  test('handles click interaction', () => {
    const onSelect = jest.fn();
    render(<QuoteCard symbol="AAPL" onSelect={onSelect} />);
    
    fireEvent.click(screen.getByTestId('quote-card-AAPL'));
    expect(onSelect).toHaveBeenCalledWith('AAPL');
  });

  test('shows loading state when data is unavailable', () => {
    useMarketStore.mockReturnValue({
      quotes: {},
      subscribeToSymbol: jest.fn()
    });

    render(<QuoteCard symbol="AAPL" />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});

// Integration Tests
// src/features/__tests__/Dashboard.integration.test.js
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dashboard } from '../Dashboard/Dashboard';
import { TestProviders } from '../../test-utils/TestProviders';

describe('Dashboard Integration', () => {
  test('loads and displays watchlist with real-time updates', async () => {
    render(
      <TestProviders>
        <Dashboard />
      </TestProviders>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Main Watchlist')).toBeInTheDocument();
    });

    // Check that quotes are displayed
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('MSFT')).toBeInTheDocument();

    // Simulate real-time update
    act(() => {
      useMarketStore.getState().updateQuote('AAPL', {
        price: 155.50,
        change: 5.25,
        changePercent: 3.49
      });
    });

    await waitFor(() => {
      expect(screen.getByText('$155.50')).toBeInTheDocument();
      expect(screen.getByText('+5.25 (+3.49%)')).toBeInTheDocument();
    });
  });

  test('handles WebSocket connection and reconnection', async () => {
    const { rerender } = render(
      <TestProviders>
        <Dashboard />
      </TestProviders>
    );

    // Check initial connection status
    expect(screen.getByTestId('connection-status')).toHaveTextContent('Connecting...');

    // Simulate connection
    act(() => {
      useMarketStore.getState().setConnectionStatus('finnhub', 'connected');
    });

    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Live');
    });
  });
});

// API Mocking with MSW
// src/mocks/handlers.js
import { rest } from 'msw';

export const handlers = [
  // Finnhub quote API
  rest.get('https://finnhub.io/api/v1/quote', (req, res, ctx) => {
    const symbol = req.url.searchParams.get('symbol');
    
    const mockData = {
      'AAPL': { c: 150.25, d: 2.5, dp: 1.69, h: 152.0, l: 148.5, o: 149.0, pc: 147.75 },
      'MSFT': { c: 378.85, d: -1.25, dp: -0.33, h: 380.0, l: 375.5, o: 379.2, pc: 380.1 },
      'GOOGL': { c: 142.75, d: 0.85, dp: 0.60, h: 144.2, l: 141.5, o: 142.0, pc: 141.9 }
    };

    return res(
      ctx.json(mockData[symbol] || { c: 100, d: 0, dp: 0, h: 100, l: 100, o: 100, pc: 100 })
    );
  }),

  // Alpha Vantage overview API
  rest.get('https://www.alphavantage.co/query', (req, res, ctx) => {
    const func = req.url.searchParams.get('function');
    const symbol = req.url.searchParams.get('symbol');

    if (func === 'OVERVIEW') {
      const mockOverview = {
        'AAPL': {
          Symbol: 'AAPL',
          Name: 'Apple Inc.',
          MarketCapitalization: '2800000000000',
          PERatio: '28.5',
          Sector: 'Technology'
        }
      };

      return res(ctx.json(mockOverview[symbol] || {}));
    }

    return res(ctx.json({}));
  }),

  // WebSocket mock (handled in test setup)
  rest.get('wss://ws.finnhub.io', (req, res, ctx) => {
    return res(ctx.status(101)); // WebSocket upgrade
  })
];

// src/mocks/server.js
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// E2E Tests with Cypress
// cypress/e2e/bloomberg-terminal.cy.js
describe('Bloomberg Terminal E2E', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.login('racquel', 'Racquel@2025'); // Custom command
  });

  it('should load dashboard with live quotes', () => {
    cy.url().should('include', '/bloomberg');
    
    // Check that quotes are loaded
    cy.get('[data-testid="quote-card"]').should('have.length.at.least', 6);
    cy.get('[data-testid="quote-card-AAPL"]').should('contain', 'AAPL');
    
    // Check live data indicator
    cy.get('[data-testid="connection-status"]').should('contain', 'Live');
  });

  it('should handle watchlist management', () => {
    // Create new watchlist
    cy.get('[data-testid="add-watchlist-btn"]').click();
    cy.get('[data-testid="watchlist-name-input"]').type('Tech Stocks');
    cy.get('[data-testid="create-watchlist-btn"]').click();
    
    // Add symbol to watchlist
    cy.get('[data-testid="symbol-search"]').type('NVDA');
    cy.get('[data-testid="search-result-NVDA"]').click();
    
    // Verify symbol was added
    cy.get('[data-testid="quote-card-NVDA"]').should('exist');
  });

  it('should display real-time price updates', () => {
    // Mock WebSocket message
    cy.window().its('WebSocket').then((ws) => {
      cy.wrap(ws).invoke('send', JSON.stringify({
        type: 'trade',
        data: [{
          s: 'AAPL',
          p: 155.50,
          v: 100,
          t: Date.now()
        }]
      }));
    });

    // Check price update
    cy.get('[data-testid="quote-card-AAPL"]')
      .should('contain', '$155.50');
  });
});

// Visual Regression Testing with Percy
// cypress/e2e/visual-regression.cy.js
describe('Visual Regression Tests', () => {
  it('should match Bloomberg terminal layout', () => {
    cy.visit('/bloomberg');
    cy.get('[data-testid="dashboard"]').should('be.visible');
    cy.percySnapshot('Bloomberg Dashboard');
  });

  it('should match quote card designs', () => {
    cy.visit('/bloomberg');
    cy.get('[data-testid="quote-card-AAPL"]').should('be.visible');
    cy.percySnapshot('Quote Card - Positive Change', {
      scope: '[data-testid="quote-card-AAPL"]'
    });
  });
});

// Performance Testing
// cypress/e2e/performance.cy.js
describe('Performance Tests', () => {
  it('should load within performance budget', () => {
    cy.visit('/bloomberg', {
      onBeforeLoad: (win) => {
        win.performance.mark('start');
      },
      onLoad: (win) => {
        win.performance.mark('end');
        win.performance.measure('pageLoad', 'start', 'end');
        const measure = win.performance.getEntriesByName('pageLoad')[0];
        expect(measure.duration).to.be.lessThan(3000); // 3 second budget
      }
    });
  });
});