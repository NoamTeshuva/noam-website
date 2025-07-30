import { getPeers, validatePeerSymbols, getPeersWithInfo, getCachedPeers } from './peerFetcher';
import { finnhubAPI } from './api';

// Mock the API module
jest.mock('./api', () => ({
  finnhubAPI: {
    getPeers: jest.fn()
  }
}));

describe('peerFetcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Mock console.log
    console.error = jest.fn(); // Mock console.error
  });

  describe('getPeers', () => {
    it('should return peers from Finnhub API when available', async () => {
      const mockPeers = ['MSFT', 'GOOGL', 'META', 'AMZN', 'TSLA', 'NFLX'];
      finnhubAPI.getPeers.mockResolvedValue(mockPeers);

      const result = await getPeers('AAPL');

      expect(finnhubAPI.getPeers).toHaveBeenCalledWith('AAPL');
      expect(result).toEqual(['MSFT', 'GOOGL', 'META', 'AMZN', 'TSLA']); // First 5
      expect(result).toHaveLength(5);
    });

    it('should return fallback peers when Finnhub API fails', async () => {
      finnhubAPI.getPeers.mockRejectedValue(new Error('API Error'));

      const result = await getPeers('AAPL');

      expect(result).toEqual(['MSFT', 'GOOGL', 'META', 'AMZN', 'TSLA']);
      expect(result).toHaveLength(5);
    });

    it('should return fallback peers when Finnhub API returns empty array', async () => {
      finnhubAPI.getPeers.mockResolvedValue([]);

      const result = await getPeers('AAPL');

      expect(result).toEqual(['MSFT', 'GOOGL', 'META', 'AMZN', 'TSLA']);
      expect(result).toHaveLength(5);
    });

    it('should return empty array for unknown symbols with no fallback', async () => {
      finnhubAPI.getPeers.mockResolvedValue([]);

      const result = await getPeers('UNKNOWN');

      expect(result).toEqual([]);
    });

    it('should return exactly 5 peers for known symbols', async () => {
      finnhubAPI.getPeers.mockResolvedValue([]);

      const testSymbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'];
      
      for (const symbol of testSymbols) {
        const result = await getPeers(symbol);
        expect(result).toHaveLength(5);
        expect(Array.isArray(result)).toBe(true);
      }
    });

    it('should handle beverage stock peers correctly', async () => {
      finnhubAPI.getPeers.mockResolvedValue([]);

      const result = await getPeers('KO');

      expect(result).toEqual(['PEP', 'MNST', 'DPS', 'GIS', 'KDP']);
      expect(result).toHaveLength(5);
    });
  });

  describe('validatePeerSymbols', () => {
    it('should filter and validate peer symbols correctly', () => {
      const input = ['AAPL', 'msft', '', null, 'GOOGL', 'TOOLONGTICKER', 'AMD'];
      const result = validatePeerSymbols(input);

      expect(result).toEqual(['AAPL', 'MSFT', 'GOOGL', 'AMD']);
      expect(result).toHaveLength(4);
    });

    it('should limit to 5 peers maximum', () => {
      const input = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const result = validatePeerSymbols(input);

      expect(result).toHaveLength(5);
      expect(result).toEqual(['A', 'B', 'C', 'D', 'E']);
    });

    it('should handle non-array input gracefully', () => {
      expect(validatePeerSymbols(null)).toEqual([]);
      expect(validatePeerSymbols(undefined)).toEqual([]);
      expect(validatePeerSymbols('not an array')).toEqual([]);
    });

    it('should convert symbols to uppercase', () => {
      const input = ['aapl', 'msft', 'googl'];
      const result = validatePeerSymbols(input);

      expect(result).toEqual(['AAPL', 'MSFT', 'GOOGL']);
    });
  });

  describe('getPeersWithInfo', () => {
    it('should return peer objects with basic info', async () => {
      const peerSymbols = ['MSFT', 'GOOGL', 'META'];
      const result = await getPeersWithInfo(peerSymbols);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        sector: 'Technology',
        isLoading: false
      });
      expect(result[1]).toEqual({
        symbol: 'GOOGL',
        name: 'Alphabet Inc.',
        sector: 'Technology',
        isLoading: false
      });
      expect(result[2]).toEqual({
        symbol: 'META',
        name: 'Meta Platforms Inc.',
        sector: 'Technology',
        isLoading: false
      });
    });

    it('should handle empty peer symbols array', async () => {
      const result = await getPeersWithInfo([]);
      expect(result).toEqual([]);
    });

    it('should handle unknown symbols with default names', async () => {
      const peerSymbols = ['UNKNOWN1', 'UNKNOWN2'];
      const result = await getPeersWithInfo(peerSymbols);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        symbol: 'UNKNOWN1',
        name: 'UNKNOWN1 Inc.',
        sector: 'Technology',
        isLoading: false
      });
    });
  });

  describe('getCachedPeers', () => {
    it('should cache peer results', async () => {
      finnhubAPI.getPeers.mockResolvedValue(['MSFT', 'GOOGL', 'META', 'AMZN', 'TSLA']);

      // First call should hit the API
      const result1 = await getCachedPeers('AAPL');
      expect(finnhubAPI.getPeers).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(['MSFT', 'GOOGL', 'META', 'AMZN', 'TSLA']);

      // Second call should use cache
      const result2 = await getCachedPeers('AAPL');
      expect(finnhubAPI.getPeers).toHaveBeenCalledTimes(1); // Still only called once
      expect(result2).toEqual(['MSFT', 'GOOGL', 'META', 'AMZN', 'TSLA']);
    });

    it('should use fallback when API fails and cache the result', async () => {
      finnhubAPI.getPeers.mockRejectedValue(new Error('API Error'));

      const result = await getCachedPeers('AAPL');
      
      expect(result).toEqual(['MSFT', 'GOOGL', 'META', 'AMZN', 'TSLA']);
      
      // Second call should use cached fallback result
      const result2 = await getCachedPeers('AAPL');
      expect(result2).toEqual(['MSFT', 'GOOGL', 'META', 'AMZN', 'TSLA']);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete peer fetching workflow', async () => {
      finnhubAPI.getPeers.mockResolvedValue(['MSFT', 'GOOGL', 'META', 'AMZN', 'NFLX', 'TSLA']);

      // Get peers
      const peers = await getPeers('AAPL');
      expect(peers).toHaveLength(5);

      // Validate peers
      const validatedPeers = validatePeerSymbols(peers);
      expect(validatedPeers).toEqual(peers);

      // Get peer info
      const peersWithInfo = await getPeersWithInfo(validatedPeers);
      expect(peersWithInfo).toHaveLength(5);
      expect(peersWithInfo[0]).toHaveProperty('symbol');
      expect(peersWithInfo[0]).toHaveProperty('name');
      expect(peersWithInfo[0]).toHaveProperty('sector');
    });
  });
});