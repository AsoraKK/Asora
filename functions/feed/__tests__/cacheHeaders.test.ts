/**
 * Test suite for feed endpoint cache headers
 * Tests cache header configuration for different authentication states
 */

import { getCacheHeaders } from '../get';

// Mock the cache configuration module
jest.mock('../../shared/cacheConfig', () => ({
    getCacheConfig: jest.fn(),
    isEdgeCacheEnabled: jest.fn(),
    isRedisCacheEnabled: jest.fn(),
    shouldCollectTelemetry: jest.fn()
}));

import { getCacheConfig, isEdgeCacheEnabled, isRedisCacheEnabled, shouldCollectTelemetry } from '../../shared/cacheConfig';

describe('Feed Cache Headers', () => {
    const mockGetCacheConfig = getCacheConfig as jest.MockedFunction<typeof getCacheConfig>;
    const mockIsEdgeCacheEnabled = isEdgeCacheEnabled as jest.MockedFunction<typeof isEdgeCacheEnabled>;
    const mockIsRedisCacheEnabled = isRedisCacheEnabled as jest.MockedFunction<typeof isRedisCacheEnabled>;
    const mockShouldCollectTelemetry = shouldCollectTelemetry as jest.MockedFunction<typeof shouldCollectTelemetry>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getCacheHeaders', () => {
        it('should return edge cache headers for anonymous users when edge caching is enabled', () => {
            mockIsEdgeCacheEnabled.mockReturnValue(true);
            mockGetCacheConfig.mockReturnValue({
                backend: 'edge',
                ttlSeconds: 30,
                enableTelemetry: true
            });

            const headers = getCacheHeaders(false); // isAuthenticated = false

            expect(headers).toEqual({
                'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
                'Vary': 'Authorization, x-user-id',
                'X-Cache-Backend': 'edge'
            });
        });

        it('should return private cache headers for authenticated users', () => {
            mockIsEdgeCacheEnabled.mockReturnValue(true);
            mockGetCacheConfig.mockReturnValue({
                backend: 'edge',
                ttlSeconds: 30,
                enableTelemetry: true
            });

            const headers = getCacheHeaders(true); // isAuthenticated = true

            expect(headers).toEqual({
                'Cache-Control': 'private, no-store, must-revalidate',
                'Vary': 'Authorization, x-user-id',
                'X-Cache-Backend': 'none'
            });
        });

        it('should return redis cache headers for anonymous users when redis caching is enabled', () => {
            mockIsEdgeCacheEnabled.mockReturnValue(false);
            mockIsRedisCacheEnabled.mockReturnValue(true);
            mockGetCacheConfig.mockReturnValue({
                backend: 'redis',
                ttlSeconds: 300,
                enableTelemetry: true
            });

            const headers = getCacheHeaders(false); // isAuthenticated = false

            expect(headers).toEqual({
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
                'Vary': 'Authorization, x-user-id',
                'X-Cache-Backend': 'redis'
            });
        });

        it('should return no-cache headers when caching is disabled', () => {
            mockIsEdgeCacheEnabled.mockReturnValue(false);
            mockIsRedisCacheEnabled.mockReturnValue(false);
            mockGetCacheConfig.mockReturnValue({
                backend: 'none',
                ttlSeconds: 0,
                enableTelemetry: true
            });

            const headers = getCacheHeaders(false); // isAuthenticated = false

            expect(headers).toEqual({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Vary': 'Authorization, x-user-id',
                'X-Cache-Backend': 'none'
            });
        });

        it('should always return private headers for authenticated users regardless of cache config', () => {
            mockIsEdgeCacheEnabled.mockReturnValue(true);
            mockGetCacheConfig.mockReturnValue({
                backend: 'edge',
                ttlSeconds: 30,
                enableTelemetry: true
            });

            const headers = getCacheHeaders(true); // isAuthenticated = true

            expect(headers).toEqual({
                'Cache-Control': 'private, no-store, must-revalidate',
                'Vary': 'Authorization, x-user-id',
                'X-Cache-Backend': 'none'
            });
        });
    });

    describe('Feed Endpoint Response Headers Integration', () => {
        // These tests would require a more complex setup to mock the actual feed endpoint
        // For now, we focus on testing the header generation logic

        it('should include stale-while-revalidate for better user experience', () => {
            mockIsEdgeCacheEnabled.mockReturnValue(true);
            mockGetCacheConfig.mockReturnValue({
                backend: 'edge',
                ttlSeconds: 30,
                enableTelemetry: true
            });

            const headers = getCacheHeaders(false);
            
            expect(headers['Cache-Control']).toContain('stale-while-revalidate=60');
        });

        it('should vary on Authorization and x-user-id headers for proper cache segregation', () => {
            mockIsEdgeCacheEnabled.mockReturnValue(true);
            
            const headers = getCacheHeaders(false);
            
            expect(headers.Vary).toBe('Authorization, x-user-id');
        });

        it('should indicate cache backend in response headers for debugging', () => {
            mockIsEdgeCacheEnabled.mockReturnValue(true);
            mockGetCacheConfig.mockReturnValue({
                backend: 'edge',
                ttlSeconds: 30,
                enableTelemetry: true
            });

            const headers = getCacheHeaders(false);
            
            expect(headers['X-Cache-Backend']).toBe('edge');
        });
    });
});
