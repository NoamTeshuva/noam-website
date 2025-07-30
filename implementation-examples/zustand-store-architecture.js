// Zustand store architecture for Bloomberg Terminal
import { create } from 'zustand';
import { subscribeWithSelector, persist, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Auth Store
export const useAuthStore = create(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        
        login: async (credentials) => {
          set({ isLoading: true });
          try {
            // Auth0 or custom auth logic
            const response = await authService.login(credentials);
            set({ 
              user: response.user, 
              isAuthenticated: true, 
              isLoading: false 
            });
          } catch (error) {
            set({ isLoading: false });
            throw error;
          }
        },
        
        logout: () => {
          set({ user: null, isAuthenticated: false });
          // Clear other stores
          useMarketStore.getState().reset();
          useWatchlistStore.getState().reset();
        }
      }),
      { name: 'auth-storage' }
    ),
    { name: 'auth-store' }
  )
);

// Market Data Store - for real-time quotes
export const useMarketStore = create(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // State
        quotes: {},
        fundamentals: {},
        connections: {
          finnhub: 'disconnected',
          polygon: 'disconnected'
        },
        subscribedSymbols: new Set(),
        lastUpdated: null,
        
        // Real-time quote updates
        updateQuote: (symbol, data) => set((state) => {
          state.quotes[symbol] = {
            ...state.quotes[symbol],
            ...data,
            timestamp: Date.now()
          };
          state.lastUpdated = Date.now();
        }),
        
        // Batch quote updates (for initial load)
        updateQuotes: (quotesData) => set((state) => {
          Object.entries(quotesData).forEach(([symbol, data]) => {
            state.quotes[symbol] = {
              ...state.quotes[symbol],
              ...data,
              timestamp: Date.now()
            };
          });
          state.lastUpdated = Date.now();
        }),
        
        // Fundamentals (cached for 24h)
        updateFundamentals: (symbol, data) => set((state) => {
          state.fundamentals[symbol] = {
            ...data,
            cachedAt: Date.now()
          };
        }),
        
        // Connection management
        setConnectionStatus: (provider, status) => set((state) => {
          state.connections[provider] = status;
        }),
        
        // Symbol subscription management
        subscribeToSymbol: (symbol) => set((state) => {
          state.subscribedSymbols.add(symbol);
        }),
        
        unsubscribeFromSymbol: (symbol) => set((state) => {
          state.subscribedSymbols.delete(symbol);
          delete state.quotes[symbol];
        }),
        
        // Get quote with fallback
        getQuote: (symbol) => {
          const { quotes } = get();
          return quotes[symbol] || null;
        },
        
        // Get fundamentals with cache check
        getFundamentals: (symbol) => {
          const { fundamentals } = get();
          const data = fundamentals[symbol];
          
          if (!data) return null;
          
          // Check if cache is expired (24 hours)
          const isExpired = Date.now() - data.cachedAt > 24 * 60 * 60 * 1000;
          return isExpired ? null : data;
        },
        
        // Reset store
        reset: () => set((state) => {
          state.quotes = {};
          state.fundamentals = {};
          state.subscribedSymbols = new Set();
          state.lastUpdated = null;
        })
      }))
    ),
    { name: 'market-store' }
  )
);

// Watchlist Store - for user's custom watchlists
export const useWatchlistStore = create(
  devtools(
    persist(
      immer((set, get) => ({
        // State
        watchlists: {
          'default': {
            id: 'default',
            name: 'Main Watchlist',
            symbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'META'],
            created: Date.now(),
            updated: Date.now()
          }
        },
        activeWatchlistId: 'default',
        
        // Actions
        createWatchlist: (name, symbols = []) => {
          const id = `watchlist_${Date.now()}`;
          set((state) => {
            state.watchlists[id] = {
              id,
              name,
              symbols,
              created: Date.now(),
              updated: Date.now()
            };
          });
          return id;
        },
        
        deleteWatchlist: (id) => set((state) => {
          if (id !== 'default') {
            delete state.watchlists[id];
            if (state.activeWatchlistId === id) {
              state.activeWatchlistId = 'default';
            }
          }
        }),
        
        renameWatchlist: (id, newName) => set((state) => {
          if (state.watchlists[id]) {
            state.watchlists[id].name = newName;
            state.watchlists[id].updated = Date.now();
          }
        }),
        
        addSymbolToWatchlist: (watchlistId, symbol) => set((state) => {
          const watchlist = state.watchlists[watchlistId];
          if (watchlist && !watchlist.symbols.includes(symbol)) {
            watchlist.symbols.push(symbol);
            watchlist.updated = Date.now();
          }
        }),
        
        removeSymbolFromWatchlist: (watchlistId, symbol) => set((state) => {
          const watchlist = state.watchlists[watchlistId];
          if (watchlist) {
            watchlist.symbols = watchlist.symbols.filter(s => s !== symbol);
            watchlist.updated = Date.now();
          }
        }),
        
        setActiveWatchlist: (id) => set((state) => {
          if (state.watchlists[id]) {
            state.activeWatchlistId = id;
          }
        }),
        
        // Getters
        getActiveWatchlist: () => {
          const { watchlists, activeWatchlistId } = get();
          return watchlists[activeWatchlistId];
        },
        
        getAllWatchlists: () => {
          const { watchlists } = get();
          return Object.values(watchlists);
        },
        
        // Reset store
        reset: () => set((state) => {
          state.watchlists = {
            'default': {
              id: 'default',
              name: 'Main Watchlist',
              symbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'META'],
              created: Date.now(),
              updated: Date.now()
            }
          };
          state.activeWatchlistId = 'default';
        })
      })),
      { 
        name: 'watchlist-storage',
        partialize: (state) => ({ 
          watchlists: state.watchlists, 
          activeWatchlistId: state.activeWatchlistId 
        })
      }
    ),
    { name: 'watchlist-store' }
  )
);

// UI Store - for application UI state
export const useUIStore = create(
  devtools(
    (set, get) => ({
      // Layout state
      sidebarOpen: true,
      activePanel: 'dashboard',
      chartLayout: 'grid',
      
      // Modal state
      modals: {
        addWatchlist: false,
        stockDetail: false,
        settings: false
      },
      
      // Loading states
      loading: {
        quotes: false,
        fundamentals: false,
        news: false
      },
      
      // Error states
      errors: {},
      
      // Notifications
      notifications: [],
      
      // Actions
      toggleSidebar: () => set((state) => ({ 
        sidebarOpen: !state.sidebarOpen 
      })),
      
      setActivePanel: (panel) => set({ activePanel: panel }),
      
      setChartLayout: (layout) => set({ chartLayout: layout }),
      
      openModal: (modalName) => set((state) => ({
        modals: { ...state.modals, [modalName]: true }
      })),
      
      closeModal: (modalName) => set((state) => ({
        modals: { ...state.modals, [modalName]: false }
      })),
      
      setLoading: (key, isLoading) => set((state) => ({
        loading: { ...state.loading, [key]: isLoading }
      })),
      
      setError: (key, error) => set((state) => ({
        errors: { ...state.errors, [key]: error }
      })),
      
      clearError: (key) => set((state) => {
        const newErrors = { ...state.errors };
        delete newErrors[key];
        return { errors: newErrors };
      }),
      
      addNotification: (notification) => set((state) => ({
        notifications: [...state.notifications, {
          id: Date.now(),
          timestamp: Date.now(),
          ...notification
        }]
      })),
      
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),
      
      clearAllNotifications: () => set({ notifications: [] })
    }),
    { name: 'ui-store' }
  )
);

// Computed selectors for complex derived state
export const useMarketSelectors = () => {
  const quotes = useMarketStore(state => state.quotes);
  const subscribedSymbols = useMarketStore(state => state.subscribedSymbols);
  
  return {
    // Get quotes for active watchlist
    activeWatchlistQuotes: useWatchlistStore(state => {
      const activeWatchlist = state.watchlists[state.activeWatchlistId];
      return activeWatchlist?.symbols.reduce((acc, symbol) => {
        acc[symbol] = quotes[symbol] || null;
        return acc;
      }, {}) || {};
    }),
    
    // Get top gainers/losers
    topMovers: Object.entries(quotes)
      .filter(([_, quote]) => quote?.changePercent != null)
      .sort((a, b) => Math.abs(b[1].changePercent) - Math.abs(a[1].changePercent))
      .slice(0, 10),
      
    // Connection health
    isHealthy: useMarketStore(state => 
      Object.values(state.connections).some(status => status === 'connected')
    )
  };
};