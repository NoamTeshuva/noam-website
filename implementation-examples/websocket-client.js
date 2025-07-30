// Enhanced WebSocket client with reconnection and error handling
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// WebSocket connection manager
class StreamingService {
  constructor() {
    this.connections = new Map();
    this.reconnectAttempts = new Map();
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  // Create connection to Finnhub WebSocket
  createFinnhubConnection(apiKey) {
    const ws = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);
    
    ws.onopen = () => {
      console.log('🔌 Finnhub WebSocket connected');
      this.reconnectAttempts.set('finnhub', 0);
      useStreamStore.getState().setConnectionStatus('finnhub', 'connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'trade') {
        data.data.forEach(trade => {
          useStreamStore.getState().updateQuote(trade.s, {
            price: trade.p,
            volume: trade.v,
            timestamp: trade.t,
            conditions: trade.c
          });
        });
      }
    };

    ws.onclose = (event) => {
      console.log('🔌 Finnhub WebSocket closed:', event.code);
      useStreamStore.getState().setConnectionStatus('finnhub', 'disconnected');
      this.handleReconnection('finnhub', apiKey);
    };

    ws.onerror = (error) => {
      console.error('🚨 Finnhub WebSocket error:', error);
      useStreamStore.getState().setConnectionStatus('finnhub', 'error');
    };

    this.connections.set('finnhub', ws);
    return ws;
  }

  // Subscribe to symbols
  subscribe(provider, symbols) {
    const ws = this.connections.get(provider);
    if (ws && ws.readyState === WebSocket.OPEN) {
      symbols.forEach(symbol => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          symbol: symbol
        }));
      });
    }
  }

  // Unsubscribe from symbols
  unsubscribe(provider, symbols) {
    const ws = this.connections.get(provider);
    if (ws && ws.readyState === WebSocket.OPEN) {
      symbols.forEach(symbol => {
        ws.send(JSON.stringify({
          type: 'unsubscribe',
          symbol: symbol
        }));
      });
    }
  }

  // Handle reconnection with exponential backoff
  handleReconnection(provider, apiKey) {
    const attempts = this.reconnectAttempts.get(provider) || 0;
    
    if (attempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(2, attempts);
      console.log(`🔄 Reconnecting ${provider} in ${delay}ms (attempt ${attempts + 1})`);
      
      setTimeout(() => {
        this.reconnectAttempts.set(provider, attempts + 1);
        if (provider === 'finnhub') {
          this.createFinnhubConnection(apiKey);
        }
      }, delay);
    } else {
      console.error(`❌ Max reconnection attempts reached for ${provider}`);
      useStreamStore.getState().setConnectionStatus(provider, 'failed');
    }
  }

  // Cleanup connections
  disconnect(provider) {
    const ws = this.connections.get(provider);
    if (ws) {
      ws.close();
      this.connections.delete(provider);
    }
  }

  disconnectAll() {
    this.connections.forEach((ws, provider) => {
      this.disconnect(provider);
    });
  }
}

// Zustand store for streaming data
export const useStreamStore = create(
  subscribeWithSelector((set, get) => ({
    // Connection status
    connections: {
      finnhub: 'disconnected',
      polygon: 'disconnected'
    },
    
    // Real-time quotes
    quotes: {},
    
    // Subscribed symbols
    subscribedSymbols: new Set(),
    
    // Actions
    setConnectionStatus: (provider, status) =>
      set(state => ({
        connections: { ...state.connections, [provider]: status }
      })),
    
    updateQuote: (symbol, data) =>
      set(state => ({
        quotes: {
          ...state.quotes,
          [symbol]: {
            ...state.quotes[symbol],
            ...data,
            lastUpdated: Date.now()
          }
        }
      })),
    
    subscribeToSymbols: (symbols) => {
      const { subscribedSymbols } = get();
      const newSymbols = symbols.filter(s => !subscribedSymbols.has(s));
      
      if (newSymbols.length > 0) {
        set(state => ({
          subscribedSymbols: new Set([...state.subscribedSymbols, ...newSymbols])
        }));
        
        // Subscribe via streaming service
        streamingService.subscribe('finnhub', newSymbols);
      }
    },
    
    unsubscribeFromSymbols: (symbols) => {
      set(state => {
        const newSubscribed = new Set(state.subscribedSymbols);
        symbols.forEach(s => newSubscribed.delete(s));
        return { subscribedSymbols: newSubscribed };
      });
      
      streamingService.unsubscribe('finnhub', symbols);
    }
  }))
);

// Singleton streaming service
export const streamingService = new StreamingService();

// React hook for using streaming data
export const useStreamingQuotes = (symbols) => {
  const quotes = useStreamStore(state => state.quotes);
  const connections = useStreamStore(state => state.connections);
  const subscribeToSymbols = useStreamStore(state => state.subscribeToSymbols);
  
  React.useEffect(() => {
    if (symbols && symbols.length > 0) {
      subscribeToSymbols(symbols);
    }
  }, [symbols, subscribeToSymbols]);
  
  return {
    quotes: symbols.reduce((acc, symbol) => {
      acc[symbol] = quotes[symbol] || null;
      return acc;
    }, {}),
    isConnected: connections.finnhub === 'connected',
    connectionStatus: connections
  };
};