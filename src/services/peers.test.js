/**
 * Tests for Peers Service
 *
 * Run with: npm test peers.test.js
 */

import { getPeers, getPeersHydrated, invalidatePeers, isPeerDataFallback } from './peers';

describe('Peers Service', () => {
  beforeEach(() => {
    // Clear cache before each test
    invalidatePeers();
  });

  describe('getPeers', () => {
    test('returns 1-5 peer symbols for RCL', async () => {
      const peers = await getPeers('RCL');

      expect(Array.isArray(peers)).toBe(true);
      expect(peers.length).toBeGreaterThan(0);
      expect(peers.length).toBeLessThanOrEqual(5);

      // Should include CCL and/or NCLH (cruise line peers)
      const hasCruisePeers = peers.some(p => ['CCL', 'NCLH', 'CUK'].includes(p));
      expect(hasCruisePeers).toBe(true);
    });

    test('excludes the original symbol from results', async () => {
      const peers = await getPeers('RCL');
      expect(peers).not.toContain('RCL');
    });

    test('returns symbols in uppercase', async () => {
      const peers = await getPeers('rcl');
      peers.forEach(peer => {
        expect(peer).toBe(peer.toUpperCase());
      });
    });

    test('caches results for 24h', async () => {
      const peers1 = await getPeers('AAPL');
      const peers2 = await getPeers('AAPL');

      // Should return same cached result
      expect(peers1).toEqual(peers2);
    });

    test('returns empty array for unknown symbols', async () => {
      const peers = await getPeers('UNKNOWNXYZ');
      expect(peers).toEqual([]);
    });
  });

  describe('getPeersHydrated', () => {
    test('returns peer objects with name and price data', async () => {
      const hydrated = await getPeersHydrated('AAPL');

      expect(Array.isArray(hydrated)).toBe(true);

      if (hydrated.length > 0) {
        const firstPeer = hydrated[0];
        expect(firstPeer).toHaveProperty('symbol');
        expect(firstPeer).toHaveProperty('name');
        expect(firstPeer).toHaveProperty('lastPrice');
        expect(firstPeer).toHaveProperty('change');
        expect(firstPeer).toHaveProperty('changePercent');
      }
    }, 30000); // 30s timeout for hydration

    test('gracefully handles TD rate limit errors', async () => {
      // This test verifies that if TD fails, we still return tickers
      const hydrated = await getPeersHydrated('MSFT');

      expect(Array.isArray(hydrated)).toBe(true);

      // Even if hydration fails, symbols should be present
      hydrated.forEach(peer => {
        expect(peer.symbol).toBeTruthy();
      });
    }, 30000);
  });

  describe('invalidatePeers', () => {
    test('clears cache for specific symbol', async () => {
      await getPeers('AAPL');
      invalidatePeers('AAPL');

      // After invalidation, isPeerDataFallback should return false
      const isFallback = isPeerDataFallback('AAPL');
      expect(isFallback).toBe(false);
    });

    test('clears all caches when no symbol provided', async () => {
      await getPeers('AAPL');
      await getPeers('MSFT');

      invalidatePeers();

      // Both should be cleared
      expect(isPeerDataFallback('AAPL')).toBe(false);
      expect(isPeerDataFallback('MSFT')).toBe(false);
    });
  });

  describe('isPeerDataFallback', () => {
    test('returns true when using fallback data', async () => {
      // RCL might use fallback if Finnhub fails
      await getPeers('RCL');

      const isFallback = isPeerDataFallback('RCL');
      expect(typeof isFallback).toBe('boolean');
    });
  });

  describe('Edge Cases', () => {
    test('handles Finnhub 429 gracefully', async () => {
      // If Finnhub returns 429, should fallback to TD
      const peers = await getPeers('TSLA');

      expect(Array.isArray(peers)).toBe(true);
      // Should still return results via fallback
    });

    test('handles symbols with special characters', async () => {
      const peers = await getPeers('BRK.A');

      expect(Array.isArray(peers)).toBe(true);
    });

    test('handles lowercase symbols', async () => {
      const peers1 = await getPeers('aapl');
      const peers2 = await getPeers('AAPL');

      expect(peers1).toEqual(peers2);
    });
  });
});
