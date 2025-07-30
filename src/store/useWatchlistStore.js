import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getCachedPeers, getPeersWithInfo } from '../utils/peerFetcher'

const MAX_WATCHLIST_SYMBOLS = 10;

export const useWatchlistStore = create(
  persist(
    (set, get) => ({
      // State
      symbols: ['AAPL', 'MSFT', 'GOOGL'], // Default symbols
      peersBySymbol: {}, // Map of symbol -> array of peer symbols
      peersInfo: {}, // Map of symbol -> array of peer objects with info
      peerFetchFailed: {}, // Track which symbols are using fallback/demo peers
      eventFlags: {}, // Track which symbols have already fired notifications today
      lastNotificationDate: new Date().toDateString(),
      
      // Actions
      addToWatchlist: (symbol) => {
        const { symbols } = get();
        const upperSymbol = symbol.toUpperCase();
        
        // Check if symbol already exists
        if (symbols.includes(upperSymbol)) {
          return { success: false, message: 'Symbol already in watchlist' };
        }
        
        // Check max limit
        if (symbols.length >= MAX_WATCHLIST_SYMBOLS) {
          return { success: false, message: `Maximum ${MAX_WATCHLIST_SYMBOLS} symbols allowed` };
        }
        
        set((state) => ({
          symbols: [...state.symbols, upperSymbol]
        }));
        
        // Fetch peers for the new symbol (with error handling)
        try {
          get().fetchPeersFor(upperSymbol);
        } catch (error) {
          console.warn('Could not fetch peers:', error);
        }
        
        return { success: true, message: `Added ${upperSymbol} to watchlist` };
      },
      
      removeFromWatchlist: (symbol) => {
        const { symbols } = get();
        const upperSymbol = symbol.toUpperCase();
        
        if (!symbols.includes(upperSymbol)) {
          return { success: false, message: 'Symbol not found in watchlist' };
        }
        
        set((state) => ({
          symbols: state.symbols.filter(s => s !== upperSymbol),
          eventFlags: Object.fromEntries(
            Object.entries(state.eventFlags).filter(([key]) => !key.startsWith(upperSymbol + '_'))
          ),
          // Clean up peer data for removed symbol
          peersBySymbol: Object.fromEntries(
            Object.entries(state.peersBySymbol).filter(([key]) => key !== upperSymbol)
          ),
          peersInfo: Object.fromEntries(
            Object.entries(state.peersInfo).filter(([key]) => key !== upperSymbol)
          ),
          peerFetchFailed: Object.fromEntries(
            Object.entries(state.peerFetchFailed).filter(([key]) => key !== upperSymbol)
          )
        }));
        
        return { success: true, message: `Removed ${upperSymbol} from watchlist` };
      },
      
      getWatchlist: () => {
        return get().symbols;
      },
      
      // Event flag management
      setEventFlag: (symbol, eventType = 'volume_spike') => {
        const today = new Date().toDateString();
        set((state) => ({
          eventFlags: {
            ...state.eventFlags,
            [`${symbol}_${eventType}_${today}`]: true
          }
        }));
      },
      
      hasEventFiredToday: (symbol, eventType = 'volume_spike') => {
        const today = new Date().toDateString();
        const { eventFlags } = get();
        return eventFlags[`${symbol}_${eventType}_${today}`] || false;
      },
      
      // Clear old event flags (run daily)
      clearOldEventFlags: () => {
        const today = new Date().toDateString();
        const { lastNotificationDate } = get();
        
        // Only clear if it's a new day
        if (lastNotificationDate !== today) {
          set({
            eventFlags: {},
            lastNotificationDate: today
          });
        }
      },
      
      // Get watchlist stats
      getWatchlistStats: () => {
        const { symbols } = get();
        return {
          count: symbols.length,
          remaining: MAX_WATCHLIST_SYMBOLS - symbols.length,
          maxReached: symbols.length >= MAX_WATCHLIST_SYMBOLS
        };
      },
      
      // Clear all symbols (for testing/reset)
      clearWatchlist: () => {
        set({
          symbols: [],
          eventFlags: {},
          peersBySymbol: {},
          peersInfo: {},
          peerFetchFailed: {}
        });
      },

      // Peer management functions
      fetchPeersFor: async (symbol) => {
        const upperSymbol = symbol.toUpperCase();
        
        try {
          console.log(`🔍 Fetching peers for ${upperSymbol}...`);
          
          // Get peer symbols using the new wrapped getPeers function
          const peerSymbols = await getCachedPeers(upperSymbol);
          
          // Check if we got demo tickers (indicates API failure)
          const isDemoData = peerSymbols.length === 5 && 
            peerSymbols.every(peer => peer.startsWith('DEMO'));
          
          // Get peer info
          const peersWithInfo = await getPeersWithInfo(peerSymbols);
          
          // Update store with fallback flag
          set((state) => ({
            peersBySymbol: {
              ...state.peersBySymbol,
              [upperSymbol]: peerSymbols
            },
            peersInfo: {
              ...state.peersInfo,
              [upperSymbol]: peersWithInfo
            },
            peerFetchFailed: {
              ...state.peerFetchFailed,
              [upperSymbol]: isDemoData
            }
          }));
          
          if (isDemoData) {
            console.log(`⚠️ Using demo peers for ${upperSymbol} due to API failure`);
          } else {
            console.log(`✅ Fetched ${peerSymbols.length} peers for ${upperSymbol}:`, peerSymbols);
          }
          
          return { success: true, peers: peerSymbols, isDemoData };
          
        } catch (error) {
          console.error(`❌ Error fetching peers for ${upperSymbol}:`, error);
          
          // Set fallback demo peers on complete failure
          const demoPeers = ['DEMO1', 'DEMO2', 'DEMO3', 'DEMO4', 'DEMO5'];
          const demoInfo = await getPeersWithInfo(demoPeers);
          
          set((state) => ({
            peersBySymbol: {
              ...state.peersBySymbol,
              [upperSymbol]: demoPeers
            },
            peersInfo: {
              ...state.peersInfo,
              [upperSymbol]: demoInfo
            },
            peerFetchFailed: {
              ...state.peerFetchFailed,
              [upperSymbol]: true
            }
          }));
          
          return { success: false, error: error.message, peers: demoPeers, isDemoData: true };
        }
      },

      // Get peers for a symbol
      getPeersFor: (symbol) => {
        const upperSymbol = symbol.toUpperCase();
        const { peersBySymbol } = get();
        return peersBySymbol[upperSymbol] || [];
      },

      // Get peer info for a symbol
      getPeersInfoFor: (symbol) => {
        const upperSymbol = symbol.toUpperCase();
        const { peersInfo } = get();
        return peersInfo[upperSymbol] || [];
      },

      // Initialize peers for all current symbols
      initializePeers: async () => {
        const { symbols, fetchPeersFor } = get();
        console.log('🚀 Initializing peers for all watchlist symbols...');
        
        for (const symbol of symbols) {
          await fetchPeersFor(symbol);
          // Add delay to avoid hitting API rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('✅ Peer initialization complete');
      },

      // Get all peers data
      getAllPeersData: () => {
        const { peersBySymbol, peersInfo, peerFetchFailed } = get();
        return {
          peersBySymbol,
          peersInfo,
          peerFetchFailed
        };
      },

      // Check if peer data is fallback/demo data
      isPeerDataFallback: (symbol) => {
        const upperSymbol = symbol.toUpperCase();
        const { peerFetchFailed } = get();
        return peerFetchFailed[upperSymbol] || false;
      }
    }),
    {
      name: 'watchlist-storage', // localStorage key
      partialize: (state) => ({
        symbols: state.symbols,
        peersBySymbol: state.peersBySymbol,
        peersInfo: state.peersInfo,
        peerFetchFailed: state.peerFetchFailed,
        eventFlags: state.eventFlags,
        lastNotificationDate: state.lastNotificationDate
      })
    }
  )
);