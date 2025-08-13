/**
 * Test suite for cache configuration module
 * Tests feature flags, telemetry gating, and cache backend selection
 */

import {
  getCacheConfig,
  isRedisCacheEnabled,
  isEdgeCacheEnabled,
  shouldCollectTelemetry,
} from '../cacheConfig';

describe('Cache Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env for each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('getCacheConfig', () => {
    it('should return edge config when FEED_CACHE_BACKEND=edge', () => {
      process.env.FEED_CACHE_BACKEND = 'edge';

      const config = getCacheConfig();

      expect(config).toEqual({
        backend: 'edge',
        ttlSeconds: 30,
        enableTelemetry: true,
      });
    });

    it('should return redis config when FEED_CACHE_BACKEND=redis', () => {
      process.env.FEED_CACHE_BACKEND = 'redis';

      const config = getCacheConfig();

      expect(config).toEqual({
        backend: 'redis',
        ttlSeconds: 300,
        enableTelemetry: true,
      });
    });

    it('should return none config when FEED_CACHE_BACKEND=none', () => {
      process.env.FEED_CACHE_BACKEND = 'none';

      const config = getCacheConfig();

      expect(config).toEqual({
        backend: 'none',
        ttlSeconds: 0,
        enableTelemetry: true,
      });
    });

    it('should default to edge when FEED_CACHE_BACKEND is not set', () => {
      delete process.env.FEED_CACHE_BACKEND;

      const config = getCacheConfig();

      expect(config).toEqual({
        backend: 'edge',
        ttlSeconds: 30,
        enableTelemetry: true,
      });
    });

    it('should throw error when FEED_CACHE_BACKEND is invalid', () => {
      process.env.FEED_CACHE_BACKEND = 'invalid';

      expect(() => getCacheConfig()).toThrow(
        'Invalid FEED_CACHE_BACKEND: invalid. Must be one of: edge, redis, none'
      );
    });
  });

  describe('isRedisCacheEnabled', () => {
    it('should return true when FEED_CACHE_BACKEND=redis', () => {
      process.env.FEED_CACHE_BACKEND = 'redis';
      expect(isRedisCacheEnabled()).toBe(true);
    });

    it('should return false when FEED_CACHE_BACKEND=edge', () => {
      process.env.FEED_CACHE_BACKEND = 'edge';
      expect(isRedisCacheEnabled()).toBe(false);
    });

    it('should return false when FEED_CACHE_BACKEND=none', () => {
      process.env.FEED_CACHE_BACKEND = 'none';
      expect(isRedisCacheEnabled()).toBe(false);
    });

    it('should return false by default', () => {
      delete process.env.FEED_CACHE_BACKEND;
      expect(isRedisCacheEnabled()).toBe(false);
    });
  });

  describe('isEdgeCacheEnabled', () => {
    it('should return true when FEED_CACHE_BACKEND=edge', () => {
      process.env.FEED_CACHE_BACKEND = 'edge';
      expect(isEdgeCacheEnabled()).toBe(true);
    });

    it('should return false when FEED_CACHE_BACKEND=redis', () => {
      process.env.FEED_CACHE_BACKEND = 'redis';
      expect(isEdgeCacheEnabled()).toBe(false);
    });

    it('should return false when FEED_CACHE_BACKEND=none', () => {
      process.env.FEED_CACHE_BACKEND = 'none';
      expect(isEdgeCacheEnabled()).toBe(false);
    });

    it('should return true by default', () => {
      delete process.env.FEED_CACHE_BACKEND;
      expect(isEdgeCacheEnabled()).toBe(true);
    });
  });

  describe('shouldCollectTelemetry', () => {
    const mockRequest = (
      headers: Record<string, string> = {},
      query: Record<string, string> = {}
    ) =>
      ({
        headers,
        query,
      }) as any;

    beforeEach(() => {
      delete process.env.EDGE_TELEMETRY_SECRET;
    });

    it('should return true when telemetry=1 in query params', () => {
      const request = mockRequest({}, { telemetry: '1' });
      expect(shouldCollectTelemetry(request)).toBe(true);
    });

    it('should return true when x-debug-telemetry header is present with correct secret', () => {
      process.env.EDGE_TELEMETRY_SECRET = 'test-secret';
      const request = mockRequest({ 'x-debug-telemetry': 'test-secret' });
      expect(shouldCollectTelemetry(request)).toBe(true);
    });

    it('should return false when x-debug-telemetry header has wrong secret', () => {
      process.env.EDGE_TELEMETRY_SECRET = 'test-secret';
      const request = mockRequest({ 'x-debug-telemetry': 'wrong-secret' });
      expect(shouldCollectTelemetry(request)).toBe(false);
    });

    it('should return false when no telemetry indicators are present', () => {
      const request = mockRequest();
      expect(shouldCollectTelemetry(request)).toBe(false);
    });

    it('should return false when telemetry=0 in query params', () => {
      const request = mockRequest({}, { telemetry: '0' });
      expect(shouldCollectTelemetry(request)).toBe(false);
    });

    it('should return true when both telemetry=1 and debug header are present', () => {
      process.env.EDGE_TELEMETRY_SECRET = 'test-secret';
      const request = mockRequest({ 'x-debug-telemetry': 'test-secret' }, { telemetry: '1' });
      expect(shouldCollectTelemetry(request)).toBe(true);
    });

    it('should prioritize query param when both are present but header is wrong', () => {
      process.env.EDGE_TELEMETRY_SECRET = 'test-secret';
      const request = mockRequest({ 'x-debug-telemetry': 'wrong-secret' }, { telemetry: '1' });
      expect(shouldCollectTelemetry(request)).toBe(true);
    });
  });
});
