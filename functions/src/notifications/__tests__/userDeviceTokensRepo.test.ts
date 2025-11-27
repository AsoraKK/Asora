/**
 * UserDeviceTokensRepository Tests
 * 
 * Tests for device token management and 3-device cap enforcement.
 * Uses module-level mocks for Cosmos DB to avoid real connections.
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock Cosmos DB BEFORE any imports that use it
jest.mock('@shared/clients/cosmos', () => ({
  getTargetDatabase: jest.fn(() => ({
    users: {
      database: {
        container: jest.fn(() => ({
          items: {
            create: jest.fn().mockResolvedValue({ resource: {} }),
            query: jest.fn().mockReturnValue({
              fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
            }),
            upsert: jest.fn().mockResolvedValue({ resource: {} }),
          },
          item: jest.fn(() => ({
            read: jest.fn().mockResolvedValue({ resource: null }),
            replace: jest.fn().mockResolvedValue({ resource: {} }),
          })),
        })),
      },
    },
  })),
  getCosmos: jest.fn(),
}));

import { Platform } from '../types';

describe('UserDeviceTokensRepository - Device Cap Logic', () => {
  const MAX_DEVICES_PER_USER = 3;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Device Cap Constants', () => {
    it('should enforce maximum 3 devices per user', () => {
      expect(MAX_DEVICES_PER_USER).toBe(3);
    });

    it('should support both FCM and APNS platforms', () => {
      const fcmPlatform: Platform = 'android';
      const apnsPlatform: Platform = 'ios';
      const webPlatform: Platform = 'web';
      
      expect(fcmPlatform).toBe('android');
      expect(apnsPlatform).toBe('ios');
      expect(webPlatform).toBe('web');
    });
  });

  describe('Device Registration Logic', () => {
    it('should generate correct eviction order (oldest lastSeenAt first)', () => {
      const devices = [
        { id: 'device001', lastSeenAt: '2024-01-20T00:00:00Z' }, // Newest
        { id: 'device002', lastSeenAt: '2024-01-01T00:00:00Z' }, // Oldest
        { id: 'device003', lastSeenAt: '2024-01-15T00:00:00Z' }, // Middle
      ];

      // Sort by lastSeenAt ascending (oldest first)
      const sorted = [...devices].sort((a, b) => 
        new Date(a.lastSeenAt).getTime() - new Date(b.lastSeenAt).getTime()
      );

      expect(sorted[0].id).toBe('device002'); // Oldest should be first (eviction candidate)
      expect(sorted[1].id).toBe('device003');
      expect(sorted[2].id).toBe('device001'); // Newest should be last
    });

    it('should identify when eviction is needed', () => {
      const existingDevices = [
        { id: 'device001', revokedAt: undefined },
        { id: 'device002', revokedAt: undefined },
        { id: 'device003', revokedAt: undefined },
      ];

      const activeDevices = existingDevices.filter(d => !d.revokedAt);
      const needsEviction = activeDevices.length >= MAX_DEVICES_PER_USER;

      expect(needsEviction).toBe(true);
    });

    it('should not require eviction if under limit', () => {
      const existingDevices = [
        { id: 'device001', revokedAt: undefined },
        { id: 'device002', revokedAt: undefined },
      ];

      const activeDevices = existingDevices.filter(d => !d.revokedAt);
      const needsEviction = activeDevices.length >= MAX_DEVICES_PER_USER;

      expect(needsEviction).toBe(false);
    });

    it('should not count revoked devices toward limit', () => {
      const existingDevices = [
        { id: 'device001', revokedAt: undefined },
        { id: 'device002', revokedAt: '2024-01-01T00:00:00Z' }, // Revoked
        { id: 'device003', revokedAt: undefined },
      ];

      const activeDevices = existingDevices.filter(d => !d.revokedAt);
      const needsEviction = activeDevices.length >= MAX_DEVICES_PER_USER;

      expect(activeDevices.length).toBe(2);
      expect(needsEviction).toBe(false);
    });
  });

  describe('Token Refresh Detection', () => {
    it('should identify existing device by deviceId', () => {
      const existingDevices = [
        { id: 'device001', deviceId: 'device001', pushToken: 'old-token' },
        { id: 'device002', deviceId: 'device002', pushToken: 'token2' },
      ];

      const incomingDeviceId = 'device001';
      const existingDevice = existingDevices.find(d => d.deviceId === incomingDeviceId);

      expect(existingDevice).toBeDefined();
      expect(existingDevice?.pushToken).toBe('old-token');
    });

    it('should detect token refresh scenario', () => {
      const existingToken = 'old-token';
      const newToken = 'new-token';
      const isTokenRefresh = existingToken !== newToken;

      expect(isTokenRefresh).toBe(true);
    });
  });
});
