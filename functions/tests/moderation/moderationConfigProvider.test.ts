/// <reference types="jest" />
/**
 * Moderation Config Provider Tests
 *
 * Tests for dynamic config loading with TTL cache, stale cache fallback,
 * and observability events for Task 9 (runtime config without redeploy).
 */

import type { ModerationConfig } from '../../src/moderation/config/moderationConfigProvider';

// Track App Insights events
const trackEventCalls: Array<{ name: string; properties?: Record<string, any> }> = [];

// In-memory config store simulating admin_config table
let adminConfigPayload: any = null;
let adminConfigVersion = 1;
let shouldFailNextQuery = false;

// Mock the PostgreSQL pool
jest.mock('@shared/clients/postgres', () => ({
  getPool: jest.fn(() => ({
    query: jest.fn(async () => {
      if (shouldFailNextQuery) {
        shouldFailNextQuery = false;
        throw new Error('Simulated database failure');
      }
      if (adminConfigPayload) {
        return {
          rows: [{
            version: adminConfigVersion,
            payload_json: adminConfigPayload,
            updated_at: new Date(),
          }],
        };
      }
      return { rows: [] };
    }),
  })),
}));

// Mock App Insights
jest.mock('@shared/appInsights', () => ({
  trackAppEvent: jest.fn((payload: { name: string; properties?: Record<string, any> }) => {
    trackEventCalls.push({ name: payload.name, properties: payload.properties });
  }),
  trackAppMetric: jest.fn(),
  trackCacheTiming: jest.fn(),
}));

// Mock logger
jest.mock('@shared/utils/logger', () => ({
  getAzureLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    verbose: jest.fn(),
  }),
}));

// Import after mocks
import {
  getModerationConfigWithVersion,
  getModerationConfig,
  isAutoModerationEnabled,
  invalidateModerationConfigCache,
} from '../../src/moderation/config/moderationConfigProvider';

describe('ModerationConfigProvider', () => {
  beforeEach(() => {
    trackEventCalls.length = 0;
    adminConfigPayload = null;
    adminConfigVersion = 1;
    shouldFailNextQuery = false;
    invalidateModerationConfigCache();
  });

  describe('getModerationConfigWithVersion', () => {
    it('returns default config when no admin_config exists', async () => {
      const envelope = await getModerationConfigWithVersion();

      expect(envelope.config).toBeDefined();
      expect(envelope.config.enableAutoModeration).toBe(true);
      expect(envelope.config.hiveAutoRemoveThreshold).toBe(0.95);
      expect(envelope.config.hiveAutoFlagThreshold).toBe(0.8);
      expect(envelope.version).toBe(0);
      expect(envelope.updatedAt).toBeNull();
    });

    it('returns config from admin_config when available', async () => {
      adminConfigPayload = {
        moderation: {
          enableAutoModeration: true,
          hiveAutoRemoveThreshold: 0.9,
          hiveAutoFlagThreshold: 0.6,
          flagAutoHideThreshold: 10,
        },
      };

      const envelope = await getModerationConfigWithVersion();

      expect(envelope.config.hiveAutoRemoveThreshold).toBe(0.9);
      expect(envelope.config.hiveAutoFlagThreshold).toBe(0.6);
      expect(envelope.config.flagAutoHideThreshold).toBe(10);
      expect(envelope.version).toBeGreaterThan(0);
    });

    it('emits cache_miss event on first fetch', async () => {
      await getModerationConfigWithVersion();

      const cacheMissEvent = trackEventCalls.find(
        (e) => e.name === 'moderation.config.cache_miss'
      );
      expect(cacheMissEvent).toBeDefined();
    });

    it('emits cache_hit event when cache is fresh', async () => {
      // First call populates cache
      await getModerationConfigWithVersion();
      trackEventCalls.length = 0;

      // Second call should hit cache
      await getModerationConfigWithVersion();

      const cacheHitEvent = trackEventCalls.find(
        (e) => e.name === 'moderation.config.cache_hit'
      );
      expect(cacheHitEvent).toBeDefined();
    });

    it('uses stale cache when database fails', async () => {
      // First call populates cache
      adminConfigPayload = {
        moderation: { hiveAutoRemoveThreshold: 0.88 },
      };
      await getModerationConfigWithVersion();

      // Force cache expiration by calling forceRefresh
      trackEventCalls.length = 0;
      shouldFailNextQuery = true;

      // This should use stale cache
      const { config } = await getModerationConfigWithVersion(true);

      expect(config.hiveAutoRemoveThreshold).toBe(0.88);
      
      const staleCacheEvent = trackEventCalls.find(
        (e) => e.name === 'moderation.config.stale_cache_used'
      );
      expect(staleCacheEvent).toBeDefined();
    });

    // Note: Cache refresh testing requires module reload, covered in integration tests
  });

  describe('getModerationConfig (backward compatibility)', () => {
    it('returns just the config object without version', async () => {
      adminConfigPayload = {
        moderation: { hiveAutoRemoveThreshold: 0.92 },
      };

      const config = await getModerationConfig();

      expect(config.hiveAutoRemoveThreshold).toBe(0.92);
      expect((config as any).configVersion).toBeUndefined();
    });
  });

  describe('isAutoModerationEnabled', () => {
    it('returns true when enableAutoModeration is true', async () => {
      adminConfigPayload = {
        moderation: { enableAutoModeration: true },
      };

      const enabled = await isAutoModerationEnabled();
      expect(enabled).toBe(true);
    });

    it('returns false when enableAutoModeration is false', async () => {
      adminConfigPayload = {
        moderation: { enableAutoModeration: false },
      };

      const enabled = await isAutoModerationEnabled();
      expect(enabled).toBe(false);
    });
  });

  describe('config value types', () => {
    it('accepts numeric threshold values from admin_config', async () => {
      adminConfigPayload = {
        moderation: {
          hiveAutoRemoveThreshold: 0.75,
          hiveAutoFlagThreshold: 0.45,
        },
      };

      const { config } = await getModerationConfigWithVersion();

      expect(typeof config.hiveAutoRemoveThreshold).toBe('number');
      expect(typeof config.hiveAutoFlagThreshold).toBe('number');
      expect(config.hiveAutoRemoveThreshold).toBe(0.75);
      expect(config.hiveAutoFlagThreshold).toBe(0.45);
    });
  });
});
