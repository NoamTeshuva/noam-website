/**
 * NOTE: This file is deprecated - use src/services/peers.js instead
 * Kept for backward compatibility
 */

import { getPeers as getNewPeers, isPeerDataFallback as checkFallback } from '../services/peers';

/**
 * Fetch top 5 peer stocks for a given symbol
 * Now uses Finnhub as primary source with TD fallback
 * @param {string} symbol - Stock symbol
 * @returns {Promise<string[]>} - Array of up to 5 peer symbols
 */
export const getPeers = async (symbol) => {
  return getNewPeers(symbol);
};

/**
 * Predefined peer mappings for major stocks
 * @param {string} symbol - Stock symbol
 * @returns {string[]} - Array of peer symbols
 */
const getFallbackPeers = (symbol) => {
  const peerMappings = {
    // Tech Giants
    'AAPL': ['MSFT', 'GOOGL', 'META', 'AMZN', 'TSLA'],
    'MSFT': ['AAPL', 'GOOGL', 'AMZN', 'META', 'ORCL'],
    'GOOGL': ['AAPL', 'MSFT', 'META', 'AMZN', 'NFLX'],
    'META': ['GOOGL', 'SNAP', 'TWTR', 'PINS', 'SPOT'],
    'AMZN': ['AAPL', 'MSFT', 'GOOGL', 'WMT', 'EBAY'],
    
    // EV & Auto
    'TSLA': ['NIO', 'RIVN', 'LCID', 'F', 'GM'],
    'NIO': ['TSLA', 'LI', 'XPEV', 'RIVN', 'LCID'],
    'F': ['GM', 'TSLA', 'STLA', 'TM', 'HMC'],
    
    // Semiconductors
    'NVDA': ['AMD', 'INTC', 'TSM', 'QCOM', 'AVGO'],
    'AMD': ['NVDA', 'INTC', 'QCOM', 'MU', 'TSM'],
    'INTC': ['AMD', 'NVDA', 'QCOM', 'TSM', 'MU'],
    
    // Streaming & Entertainment  
    'NFLX': ['DIS', 'PARA', 'WBD', 'ROKU', 'SPOT'],
    'DIS': ['NFLX', 'PARA', 'WBD', 'CMCSA', 'T'],
    
    // Beverages
    'KO': ['PEP', 'MNST', 'DPS', 'GIS', 'KDP'],
    'PEP': ['KO', 'MNST', 'DPS', 'GIS', 'KHC'],
    
    // Banking
    'JPM': ['BAC', 'WFC', 'C', 'GS', 'MS'],
    'BAC': ['JPM', 'WFC', 'C', 'USB', 'PNC'],
    
    // Energy
    'XOM': ['CVX', 'COP', 'EOG', 'SLB', 'MPC'],
    'CVX': ['XOM', 'COP', 'EOG', 'PSX', 'VLO'],
    
    // Retail
    'WMT': ['TGT', 'HD', 'LOW', 'COST', 'AMZN'],
    'TGT': ['WMT', 'HD', 'LOW', 'COST', 'KSS'],
    
    // Healthcare
    'JNJ': ['PFE', 'UNH', 'ABBV', 'MRK', 'BMY'],
    'PFE': ['JNJ', 'MRK', 'ABBV', 'LLY', 'BMY']
  };
  
  return peerMappings[symbol.toUpperCase()] || [];
};

/**
 * Get peer info with basic data (no live quotes to avoid rate limits)
 * @param {string[]} peerSymbols - Array of peer symbols
 * @returns {Promise<Object[]>} - Array of peer objects with basic info
 */
export const getPeersWithInfo = async (peerSymbols) => {
  if (!peerSymbols || peerSymbols.length === 0) return [];

  try {
    // Return basic info without fetching quotes (to avoid TD rate limits)
    // The watchlist already fetches quotes for main symbols
    const peersWithInfo = peerSymbols.map(symbol => ({
      symbol: symbol,
      name: getCompanyName(symbol),
      sector: getSector(symbol),
      isLoading: false
    }));

    return peersWithInfo;

  } catch (error) {
    console.error('Error getting peer info:', error);

    // Fallback to minimal info
    return peerSymbols.map(symbol => ({
      symbol: symbol,
      name: `${symbol} Inc.`,
      sector: 'Technology',
      isLoading: false
    }));
  }
};

/**
 * Check if peer data is from fallback source
 * @param {string} symbol - Stock symbol
 * @returns {boolean} - True if from fallback
 */
export const isPeerDataFallback = (symbol) => {
  return checkFallback(symbol);
};

/**
 * Get company name for common symbols
 * @param {string} symbol - Stock symbol
 * @returns {string} - Company name
 */
const getCompanyName = (symbol) => {
  const names = {
    // Tech Giants
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corporation',
    'GOOGL': 'Alphabet Inc.',
    'META': 'Meta Platforms Inc.',
    'AMZN': 'Amazon.com Inc.',

    // Hardware & Semiconductors
    'NVDA': 'NVIDIA Corporation',
    'AMD': 'Advanced Micro Devices',
    'INTC': 'Intel Corporation',
    'DELL': 'Dell Technologies Inc.',
    'HPE': 'Hewlett Packard Enterprise',
    'HPQ': 'HP Inc.',
    'SMCI': 'Super Micro Computer Inc.',
    'WDC': 'Western Digital Corporation',
    'PSTG': 'Pure Storage Inc.',
    'NTAP': 'NetApp Inc.',

    // EV & Auto
    'TSLA': 'Tesla Inc.',
    'NIO': 'NIO Inc.',
    'F': 'Ford Motor Company',
    'GM': 'General Motors Company',
    'RIVN': 'Rivian Automotive Inc.',
    'LCID': 'Lucid Group Inc.',

    // Cruise & Travel
    'RCL': 'Royal Caribbean Group',
    'CCL': 'Carnival Corporation',
    'NCLH': 'Norwegian Cruise Line Holdings',
    'CUK': 'Carnival plc',
    'BKNG': 'Booking Holdings Inc.',
    'ABNB': 'Airbnb Inc.',
    'MAR': 'Marriott International',
    'HLT': 'Hilton Worldwide Holdings',
    'EXPE': 'Expedia Group Inc.',

    // Entertainment & Streaming
    'NFLX': 'Netflix Inc.',
    'DIS': 'The Walt Disney Company',
    'ROKU': 'Roku Inc.',
    'SNAP': 'Snap Inc.',
    'SPOT': 'Spotify Technology S.A.',

    // Food & Beverage
    'KO': 'The Coca-Cola Company',
    'PEP': 'PepsiCo Inc.',
    'MNST': 'Monster Beverage Corporation',

    // Banking & Finance
    'JPM': 'JPMorgan Chase & Co.',
    'BAC': 'Bank of America Corp',
    'WFC': 'Wells Fargo & Company',
    'C': 'Citigroup Inc.',
    'GS': 'Goldman Sachs Group Inc.',
    'MS': 'Morgan Stanley',

    // Healthcare & Pharma
    'JNJ': 'Johnson & Johnson',
    'PFE': 'Pfizer Inc.',
    'UNH': 'UnitedHealth Group',
    'ABBV': 'AbbVie Inc.',
    'MRK': 'Merck & Co.',

    // Energy
    'XOM': 'Exxon Mobil Corporation',
    'CVX': 'Chevron Corporation',

    // Retail
    'WMT': 'Walmart Inc.',
    'TGT': 'Target Corporation',
    'HD': 'The Home Depot Inc.',
    'LOW': 'Lowe\'s Companies Inc.',
    'COST': 'Costco Wholesale Corporation'
  };

  return names[symbol.toUpperCase()] || `${symbol} Inc.`;
};

/**
 * Get sector for common symbols
 * @param {string} symbol - Stock symbol
 * @returns {string} - Sector name
 */
const getSector = (symbol) => {
  const sectors = {
    // Technology
    'AAPL': 'Technology',
    'MSFT': 'Technology',
    'GOOGL': 'Technology',
    'META': 'Technology',
    'NVDA': 'Technology',
    'AMD': 'Technology',
    'INTC': 'Technology',
    'DELL': 'Technology',
    'HPE': 'Technology',
    'HPQ': 'Technology',
    'SMCI': 'Technology',
    'WDC': 'Technology',
    'PSTG': 'Technology',
    'NTAP': 'Technology',

    // Consumer Discretionary (Retail, Auto, Travel)
    'AMZN': 'Consumer Discretionary',
    'TSLA': 'Consumer Discretionary',
    'NIO': 'Consumer Discretionary',
    'F': 'Consumer Discretionary',
    'GM': 'Consumer Discretionary',
    'RIVN': 'Consumer Discretionary',
    'LCID': 'Consumer Discretionary',
    'RCL': 'Consumer Discretionary',
    'CCL': 'Consumer Discretionary',
    'NCLH': 'Consumer Discretionary',
    'CUK': 'Consumer Discretionary',
    'BKNG': 'Consumer Discretionary',
    'ABNB': 'Consumer Discretionary',
    'MAR': 'Consumer Discretionary',
    'HLT': 'Consumer Discretionary',
    'EXPE': 'Consumer Discretionary',
    'WMT': 'Consumer Staples',
    'TGT': 'Consumer Discretionary',
    'HD': 'Consumer Discretionary',
    'LOW': 'Consumer Discretionary',
    'COST': 'Consumer Staples',

    // Communication Services
    'NFLX': 'Communication Services',
    'DIS': 'Communication Services',
    'ROKU': 'Communication Services',
    'SNAP': 'Communication Services',
    'SPOT': 'Communication Services',

    // Consumer Staples
    'KO': 'Consumer Staples',
    'PEP': 'Consumer Staples',
    'MNST': 'Consumer Staples',

    // Financials
    'JPM': 'Financials',
    'BAC': 'Financials',
    'WFC': 'Financials',
    'C': 'Financials',
    'GS': 'Financials',
    'MS': 'Financials',

    // Healthcare
    'JNJ': 'Healthcare',
    'PFE': 'Healthcare',
    'UNH': 'Healthcare',
    'ABBV': 'Healthcare',
    'MRK': 'Healthcare',

    // Energy
    'XOM': 'Energy',
    'CVX': 'Energy'
  };

  return sectors[symbol.toUpperCase()] || 'Technology';
};

/**
 * Validate peer symbols (ensure they're valid tickers)
 * @param {string[]} peers - Array of peer symbols
 * @returns {string[]} - Filtered valid peer symbols
 */
export const validatePeerSymbols = (peers) => {
  if (!Array.isArray(peers)) return [];
  
  return peers
    .filter(symbol => symbol && typeof symbol === 'string')
    .map(symbol => symbol.toUpperCase())
    .filter(symbol => symbol.length >= 1 && symbol.length <= 5)
    .slice(0, 5); // Limit to 5 peers max
};

/**
 * Cache peer data to avoid excessive API calls
 */
const peerCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const getCachedPeers = async (symbol) => {
  const cacheKey = symbol.toUpperCase();
  const cached = peerCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`📋 Using cached peers for ${symbol}:`, cached.peers);
    return cached.peers;
  }
  
  const peers = await getPeers(symbol);
  peerCache.set(cacheKey, {
    peers: peers,
    timestamp: Date.now()
  });
  
  return peers;
};