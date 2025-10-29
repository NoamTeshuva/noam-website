/**
 * Fetch top 5 peer stocks for a given symbol
 * NOTE: Finnhub API removed - using predefined peer mappings only
 * @param {string} symbol - Stock symbol
 * @returns {Promise<string[]>} - Array of up to 5 peer symbols
 */
export const getPeers = async (symbol) => {
  console.log(`🔍 Fetching peers for ${symbol}...`);

  // Use predefined peer mappings for common stocks
  const fallbackPeers = getFallbackPeers(symbol);
  if (fallbackPeers.length > 0) {
    console.log(`📋 Using fallback peers for ${symbol}:`, fallbackPeers);
    return fallbackPeers;
  }

  // Return empty array if no peers found
  console.log(`⚠️ No peers defined for ${symbol}`);
  return [];
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
 * Get peer info with basic data for display
 * @param {string[]} peerSymbols - Array of peer symbols
 * @returns {Promise<Object[]>} - Array of peer objects with symbol and basic info
 */
export const getPeersWithInfo = async (peerSymbols) => {
  if (!peerSymbols || peerSymbols.length === 0) return [];
  
  try {
    const peersWithInfo = peerSymbols.map(symbol => ({
      symbol: symbol,
      name: getCompanyName(symbol),
      sector: getSector(symbol),
      isLoading: false
    }));
    
    return peersWithInfo;
  } catch (error) {
    console.error('Error getting peer info:', error);
    return peerSymbols.map(symbol => ({
      symbol: symbol,
      name: `${symbol} Inc.`,
      sector: 'Technology',
      isLoading: false
    }));
  }
};

/**
 * Get company name for common symbols
 * @param {string} symbol - Stock symbol
 * @returns {string} - Company name
 */
const getCompanyName = (symbol) => {
  const names = {
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corporation',
    'GOOGL': 'Alphabet Inc.',
    'META': 'Meta Platforms Inc.',
    'AMZN': 'Amazon.com Inc.',
    'TSLA': 'Tesla Inc.',
    'NVDA': 'NVIDIA Corporation',
    'AMD': 'Advanced Micro Devices',
    'INTC': 'Intel Corporation',
    'NFLX': 'Netflix Inc.',
    'KO': 'The Coca-Cola Company',
    'PEP': 'PepsiCo Inc.',
    'JPM': 'JPMorgan Chase & Co.',
    'BAC': 'Bank of America Corp',
    'WMT': 'Walmart Inc.',
    'JNJ': 'Johnson & Johnson',
    'PFE': 'Pfizer Inc.',
    'XOM': 'Exxon Mobil Corporation',
    'CVX': 'Chevron Corporation',
    'NIO': 'NIO Inc.',
    'F': 'Ford Motor Company',
    'GM': 'General Motors Company',
    'DIS': 'The Walt Disney Company',
    'ROKU': 'Roku Inc.',
    'SNAP': 'Snap Inc.',
    'SPOT': 'Spotify Technology S.A.',
    'MNST': 'Monster Beverage Corporation',
    'RIVN': 'Rivian Automotive Inc.',
    'LCID': 'Lucid Group Inc.'
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
    'AAPL': 'Technology',
    'MSFT': 'Technology', 
    'GOOGL': 'Technology',
    'META': 'Technology',
    'AMZN': 'Consumer Discretionary',
    'TSLA': 'Consumer Discretionary',
    'NVDA': 'Technology',
    'AMD': 'Technology',
    'INTC': 'Technology',
    'NFLX': 'Communication Services',
    'KO': 'Consumer Staples',
    'PEP': 'Consumer Staples',
    'JPM': 'Financials',
    'BAC': 'Financials',
    'WMT': 'Consumer Staples',
    'JNJ': 'Healthcare',
    'PFE': 'Healthcare',
    'XOM': 'Energy',
    'CVX': 'Energy',
    'NIO': 'Consumer Discretionary',
    'F': 'Consumer Discretionary',
    'GM': 'Consumer Discretionary',
    'DIS': 'Communication Services'
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