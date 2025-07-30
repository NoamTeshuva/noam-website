// Alpha Vantage API configuration
const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const API_KEY = process.env.REACT_APP_ALPHA_VANTAGE_KEY;

// Finnhub API configuration  
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const FINNHUB_KEY = process.env.REACT_APP_FINNHUB_KEY;

// Alpha Vantage API functions
export const alphaVantageAPI = {
  // Search for stocks by symbol or name
  searchSymbol: async (keywords) => {
    try {
      const response = await fetch(
        `${ALPHA_VANTAGE_BASE_URL}?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(keywords)}&apikey=${API_KEY}`
      );
      const data = await response.json();
      
      if (data['Error Message']) {
        throw new Error(data['Error Message']);
      }
      
      return data.bestMatches || [];
    } catch (error) {
      console.error('Alpha Vantage search error:', error);
      throw error;
    }
  },

  // Get real-time quote
  getQuote: async (symbol) => {
    try {
      const response = await fetch(
        `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`
      );
      const data = await response.json();
      
      if (data['Error Message']) {
        throw new Error(data['Error Message']);
      }
      
      const quote = data['Global Quote'];
      if (!quote) {
        throw new Error('No quote data available');
      }

      return {
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: quote['10. change percent'].replace('%', ''),
        volume: parseInt(quote['06. volume']),
        previousClose: parseFloat(quote['08. previous close']),
        lastUpdated: new Date(quote['07. latest trading day'])
      };
    } catch (error) {
      console.error('Alpha Vantage quote error:', error);
      throw error;
    }
  },

  // Get company overview (fundamentals)
  getOverview: async (symbol) => {
    try {
      const response = await fetch(
        `${ALPHA_VANTAGE_BASE_URL}?function=OVERVIEW&symbol=${symbol}&apikey=${API_KEY}`
      );
      const data = await response.json();
      
      if (data['Error Message']) {
        throw new Error(data['Error Message']);
      }

      return {
        symbol: data.Symbol,
        name: data.Name,
        description: data.Description,
        sector: data.Sector,
        industry: data.Industry,
        marketCap: parseInt(data.MarketCapitalization) || 0,
        pe: parseFloat(data.PERatio) || null,
        pegRatio: parseFloat(data.PEGRatio) || null,
        bookValue: parseFloat(data.BookValue) || null,
        dividendYield: parseFloat(data.DividendYield) || null,
        eps: parseFloat(data.EPS) || null,
        beta: parseFloat(data.Beta) || null,
        week52High: parseFloat(data['52WeekHigh']) || null,
        week52Low: parseFloat(data['52WeekLow']) || null,
        sharesOutstanding: parseInt(data.SharesOutstanding) || 0,
        exchange: data.Exchange
      };
    } catch (error) {
      console.error('Alpha Vantage overview error:', error);
      throw error;
    }
  },

  // Get intraday data for volume calculations
  getIntraday: async (symbol, interval = '1min') => {
    try {
      const response = await fetch(
        `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=${interval}&apikey=${API_KEY}`
      );
      const data = await response.json();
      
      if (data['Error Message']) {
        throw new Error(data['Error Message']);
      }

      const timeSeries = data[`Time Series (${interval})`];
      if (!timeSeries) {
        throw new Error('No intraday data available');
      }

      // Convert to array format
      const intradayData = Object.entries(timeSeries).map(([timestamp, values]) => ({
        timestamp: new Date(timestamp),
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume'])
      }));

      return intradayData.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('Alpha Vantage intraday error:', error);
      throw error;
    }
  }
};

// Finnhub API functions
export const finnhubAPI = {
  // Get peer/competitor companies
  getPeers: async (symbol) => {
    try {
      const response = await fetch(
        `${FINNHUB_BASE_URL}/stock/peers?symbol=${symbol}&token=${FINNHUB_KEY}`
      );
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Return up to 5 peers, excluding the original symbol
      return data.filter(peer => peer !== symbol).slice(0, 5);
    } catch (error) {
      console.error('Finnhub peers error:', error);
      throw error;
    }
  },

  // Get company profile
  getProfile: async (symbol) => {
    try {
      const response = await fetch(
        `${FINNHUB_BASE_URL}/stock/profile2?symbol=${symbol}&token=${FINNHUB_KEY}`
      );
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return {
        symbol: symbol,
        name: data.name,
        country: data.country,
        currency: data.currency,
        exchange: data.exchange,
        ipo: data.ipo,
        marketCapitalization: data.marketCapitalization,
        shareOutstanding: data.shareOutstanding,
        logo: data.logo,
        phone: data.phone,
        weburl: data.weburl,
        industry: data.finnhubIndustry
      };
    } catch (error) {
      console.error('Finnhub profile error:', error);
      throw error;
    }
  }
};

// Utility functions
export const formatMarketCap = (marketCap) => {
  if (marketCap >= 1e12) {
    return `$${(marketCap / 1e12).toFixed(1)}T`;
  } else if (marketCap >= 1e9) {
    return `$${(marketCap / 1e9).toFixed(1)}B`;
  } else if (marketCap >= 1e6) {
    return `$${(marketCap / 1e6).toFixed(1)}M`;
  } else {
    return `$${marketCap.toLocaleString()}`;
  }
};

export const formatVolume = (volume) => {
  if (volume >= 1e9) {
    return `${(volume / 1e9).toFixed(1)}B`;
  } else if (volume >= 1e6) {
    return `${(volume / 1e6).toFixed(1)}M`;
  } else if (volume >= 1e3) {
    return `${(volume / 1e3).toFixed(1)}K`;
  } else {
    return volume.toLocaleString();
  }
};

export const calculateVolumeRatio = (currentVolume, historicalData) => {
  if (!historicalData || historicalData.length === 0) return 1;
  
  // Calculate average volume from historical data
  const avgVolume = historicalData.reduce((sum, data) => sum + data.volume, 0) / historicalData.length;
  
  return avgVolume > 0 ? currentVolume / avgVolume : 1;
};

// Error handling wrapper for API calls
export const withErrorHandling = async (apiCall, fallbackValue = null) => {
  try {
    return await apiCall();
  } catch (error) {
    console.error('API call failed:', error);
    return fallbackValue;
  }
};