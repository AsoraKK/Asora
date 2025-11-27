import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UserDeviceTokensRepository } from '../repositories/userDeviceTokensRepo';
import { UserDeviceToken } from '../types';

// Mock Cosmos DB container
const mockContainer = {
  items: {
    create: jest.fn(),
    query: jest.fn(),
  },
  item: jest.fn(),
};

jest.mock('../../shared/cosmos', () => ({
  getContainer: jest.fn(() => mockContainer),
}));

describe('UserDeviceTokensRepository - Device Cap Logic', () => {
  let repository: UserDeviceTokensRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new UserDeviceTokensRepository();
  });

  describe('registerOrUpdateDevice', () => {
    it('should register first device without eviction', async () => {
      const userId = 'user123';
      const deviceToken: Partial<UserDeviceToken> = {
        deviceId: 'device001',
        pushToken: 'token123',
        platform: 'fcm',
        label: 'Android Phone',
      };

      // Mock existing devices query - empty
      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [],
        }),
      });

      mockContainer.items.create.mockResolvedValue({
        resource: { id: 'device001', ...deviceToken },
      });

      const result = await repository.registerOrUpdateDevice(userId, deviceToken as UserDeviceToken);

      expect(mockContainer.items.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          deviceId: 'device001',
          pushToken: 'token123',
        })
      );
      expect(result.id).toBe('device001');
    });

    it('should evict oldest device when registering 4th device', async () => {
      const userId = 'user123';
      const newDevice: Partial<UserDeviceToken> = {
        deviceId: 'device004',
        pushToken: 'token004',
        platform: 'fcm',
        label: 'New Phone',
      };

      // Mock existing devices - 3 devices already registered
      const existingDevices = [
        {
          id: 'device001',
          deviceId: 'device001',
          userId,
          lastSeenAt: new Date('2024-01-01'), // Oldest
          revokedAt: null,
        },
        {
          id: 'device002',
          deviceId: 'device002',
          userId,
          lastSeenAt: new Date('2024-01-15'),
          revokedAt: null,
        },
        {
          id: 'device003',
          deviceId: 'device003',
          userId,
          lastSeenAt: new Date('2024-01-20'), // Newest
          revokedAt: null,
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: existingDevices,
        }),
      });

      // Mock item update for revocation
      const mockReplace = jest.fn().mockResolvedValue({
        resource: { ...existingDevices[0], revokedAt: new Date() },
      });
      mockContainer.item.mockReturnValue({
        replace: mockReplace,
      });

      mockContainer.items.create.mockResolvedValue({
        resource: { id: 'device004', ...newDevice },
      });

      const result = await repository.registerOrUpdateDevice(userId, newDevice as UserDeviceToken);

      // Should revoke oldest device (device001)
      expect(mockContainer.item).toHaveBeenCalledWith('device001', userId);
      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({
          revokedAt: expect.any(Date),
        })
      );

      // Should create new device
      expect(mockContainer.items.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'device004',
        })
      );
      expect(result.deviceId).toBe('device004');
    });

    it('should update existing device without eviction', async () => {
      const userId = 'user123';
      const existingDevice = {
        id: 'device001',
        deviceId: 'device001',
        userId,
        pushToken: 'old-token',
        platform: 'fcm',
        label: 'Android Phone',
        lastSeenAt: new Date('2024-01-01'),
        revokedAt: null,
      };

      const updatedToken: Partial<UserDeviceToken> = {
        deviceId: 'device001', // Same device ID
        pushToken: 'new-token', // Updated token
        platform: 'fcm',
        label: 'Android Phone',
      };

      // Mock existing devices - includes the device being updated
      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [existingDevice],
        }),
      });

      const mockReplace = jest.fn().mockResolvedValue({
        resource: { ...existingDevice, pushToken: 'new-token', lastSeenAt: new Date() },
      });
      mockContainer.item.mockReturnValue({
        replace: mockReplace,
      });

      const result = await repository.registerOrUpdateDevice(userId, updatedToken as UserDeviceToken);

      // Should update existing device, NOT create new one
      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({
          pushToken: 'new-token',
          lastSeenAt: expect.any(Date),
        })
      );
      expect(mockContainer.items.create).not.toHaveBeenCalled();
    });
  });

  describe('queryActiveByUserId', () => {
    it('should return only active (non-revoked) devices', async () => {
      const userId = 'user123';
      const devices = [
        {
          id: 'device001',
          userId,
          pushToken: 'token001',
          revokedAt: null, // Active
        },
        {
          id: 'device002',
          userId,
          pushToken: 'token002',
          revokedAt: new Date(), // Revoked
        },
        {
          id: 'device003',
          userId,
          pushToken: 'token003',
          revokedAt: null, // Active
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: devices,
        }),
      });

      const result = await repository.queryActiveByUserId(userId);

      // Should filter out revoked device
      expect(result).toHaveLength(2);
      expect(result.map(d => d.id)).toEqual(['device001', 'device003']);
    });
  });
});
