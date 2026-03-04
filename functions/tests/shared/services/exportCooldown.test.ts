/**
 * Tests for exportCooldownService
 */

// Mock cosmos client
jest.mock('@shared/clients/cosmos', () => ({
  getCosmosDatabase: jest.fn(),
}));

// Mock error utilities
jest.mock('@shared/errorUtils', () => ({
  isNotFoundError: jest.fn(),
}));

// Mock tierLimits
jest.mock('../../../src/shared/services/tierLimits', () => ({
  normalizeTier: jest.fn((tier: string | null | undefined) => tier ?? 'basic'),
}));

import {
  ExportCooldownActiveError,
  getLastExportTimestamp,
  recordExportTimestamp,
  enforceExportCooldown,
  __testing,
} from '../../../src/shared/services/exportCooldownService';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { isNotFoundError } from '@shared/errorUtils';
import { normalizeTier } from '../../../src/shared/services/tierLimits';

const mockGetCosmosDatabase = getCosmosDatabase as jest.MockedFunction<typeof getCosmosDatabase>;
const mockIsNotFoundError = isNotFoundError as jest.MockedFunction<typeof isNotFoundError>;
const mockNormalizeTier = normalizeTier as jest.MockedFunction<typeof normalizeTier>;

describe('exportCooldownService', () => {
  let mockContainer: {
    item: jest.Mock;
    items: { upsert: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockContainer = {
      item: jest.fn(),
      items: { upsert: jest.fn().mockResolvedValue({}) },
    };

    mockGetCosmosDatabase.mockReturnValue({
      container: jest.fn().mockReturnValue(mockContainer),
    } as unknown as ReturnType<typeof getCosmosDatabase>);

    mockNormalizeTier.mockImplementation((tier) => tier ?? 'basic');
    mockIsNotFoundError.mockReturnValue(false);
  });

  describe('ExportCooldownActiveError', () => {
    it('creates error with correct properties', () => {
      const futureDate = new Date(Date.now() + 3600 * 1000);
      const error = new ExportCooldownActiveError(futureDate, 'premium');

      expect(error.name).toBe('ExportCooldownActiveError');
      expect(error.statusCode).toBe(429);
      expect(error.payloadCode).toBe('EXPORT_COOLDOWN_ACTIVE');
      expect(error.tier).toBe('premium');
      expect(error.nextAvailableAt).toBe(futureDate);
      expect(error.retryAfterSeconds).toBeGreaterThan(0);
      expect(error.retryAfterSeconds).toBeLessThanOrEqual(3600);
    });

    it('formats message with ISO timestamp', () => {
      const futureDate = new Date('2025-12-31T12:00:00.000Z');
      const error = new ExportCooldownActiveError(futureDate, 'basic');

      expect(error.message).toBe('Export cooldown active until 2025-12-31T12:00:00.000Z');
    });

    it('toResponse returns structured payload', () => {
      const futureDate = new Date(Date.now() + 7200 * 1000);
      const error = new ExportCooldownActiveError(futureDate, 'enterprise');

      const response = error.toResponse();

      expect(response).toMatchObject({
        code: 'EXPORT_COOLDOWN_ACTIVE',
        tier: 'enterprise',
        nextAvailableAt: futureDate.toISOString(),
        message: expect.stringContaining('Export cooldown active'),
      });
      expect(response.retryAfterSeconds).toBeGreaterThan(0);
    });

    it('clamps retryAfterSeconds to 0 for past dates', () => {
      const pastDate = new Date(Date.now() - 1000);
      const error = new ExportCooldownActiveError(pastDate, 'basic');

      expect(error.retryAfterSeconds).toBe(0);
    });
  });

  describe('__testing.buildExportId', () => {
    it('creates composite ID from userId', () => {
      const id = __testing.buildExportId('user-123');
      expect(id).toBe('user-123:export');
    });
  });

  describe('getLastExportTimestamp', () => {
    it('returns timestamp when document exists', async () => {
      const mockRead = jest.fn().mockResolvedValue({
        resource: { lastExportAt: 1735300000000 },
      });
      mockContainer.item.mockReturnValue({ read: mockRead });

      const result = await getLastExportTimestamp('user-123');

      expect(result).toBe(1735300000000);
      expect(mockContainer.item).toHaveBeenCalledWith('user-123:export', 'user-123');
    });

    it('returns null when document not found', async () => {
      const notFoundError = { code: 404 };
      const mockRead = jest.fn().mockRejectedValue(notFoundError);
      mockContainer.item.mockReturnValue({ read: mockRead });
      mockIsNotFoundError.mockReturnValue(true);

      const result = await getLastExportTimestamp('user-456');

      expect(result).toBeNull();
    });

    it('returns null when document has no lastExportAt', async () => {
      const mockRead = jest.fn().mockResolvedValue({ resource: {} });
      mockContainer.item.mockReturnValue({ read: mockRead });

      const result = await getLastExportTimestamp('user-789');

      expect(result).toBeNull();
    });

    it('throws non-404 errors', async () => {
      const dbError = new Error('Connection failed');
      const mockRead = jest.fn().mockRejectedValue(dbError);
      mockContainer.item.mockReturnValue({ read: mockRead });
      mockIsNotFoundError.mockReturnValue(false);

      await expect(getLastExportTimestamp('user-err')).rejects.toThrow('Connection failed');
    });
  });

  describe('recordExportTimestamp', () => {
    it('upserts export document with correct structure', async () => {
      const beforeCall = Date.now();
      await recordExportTimestamp('user-123');
      const afterCall = Date.now();

      expect(mockContainer.items.upsert).toHaveBeenCalledTimes(1);
      const upsertedDoc = mockContainer.items.upsert.mock.calls[0][0];

      expect(upsertedDoc).toMatchObject({
        id: 'user-123:export',
        userId: 'user-123',
        counterType: 'export',
        ttl: 365 * 24 * 60 * 60,
      });
      expect(upsertedDoc.lastExportAt).toBeGreaterThanOrEqual(beforeCall);
      expect(upsertedDoc.lastExportAt).toBeLessThanOrEqual(afterCall);
      expect(upsertedDoc.updatedAt).toBe(upsertedDoc.lastExportAt);
    });

    it('disables automatic ID generation', async () => {
      await recordExportTimestamp('user-456');

      expect(mockContainer.items.upsert).toHaveBeenCalledWith(
        expect.any(Object),
        { disableAutomaticIdGeneration: true }
      );
    });
  });

  describe('enforceExportCooldown', () => {
    it('does nothing when cooldownDays is 0', async () => {
      await enforceExportCooldown('user-123', 'premium', 0);

      expect(mockContainer.item).not.toHaveBeenCalled();
    });

    it('does nothing when cooldownDays is negative', async () => {
      await enforceExportCooldown('user-123', 'premium', -5);

      expect(mockContainer.item).not.toHaveBeenCalled();
    });

    it('does nothing when no previous export exists', async () => {
      const notFoundError = { code: 404 };
      const mockRead = jest.fn().mockRejectedValue(notFoundError);
      mockContainer.item.mockReturnValue({ read: mockRead });
      mockIsNotFoundError.mockReturnValue(true);

      await enforceExportCooldown('user-123', 'basic', 7);

      // Should not throw
    });

    it('does nothing when cooldown has expired', async () => {
      const oldTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days ago
      const mockRead = jest.fn().mockResolvedValue({
        resource: { lastExportAt: oldTimestamp },
      });
      mockContainer.item.mockReturnValue({ read: mockRead });

      await enforceExportCooldown('user-123', 'basic', 7);

      // Should not throw
    });

    it('throws ExportCooldownActiveError when within cooldown period', async () => {
      const recentTimestamp = Date.now() - 3 * 24 * 60 * 60 * 1000; // 3 days ago
      const mockRead = jest.fn().mockResolvedValue({
        resource: { lastExportAt: recentTimestamp },
      });
      mockContainer.item.mockReturnValue({ read: mockRead });

      await expect(
        enforceExportCooldown('user-123', 'premium', 7)
      ).rejects.toThrow(ExportCooldownActiveError);
    });

    it('normalizes tier in thrown error', async () => {
      const recentTimestamp = Date.now() - 1 * 24 * 60 * 60 * 1000; // 1 day ago
      const mockRead = jest.fn().mockResolvedValue({
        resource: { lastExportAt: recentTimestamp },
      });
      mockContainer.item.mockReturnValue({ read: mockRead });

      try {
        await enforceExportCooldown('user-123', undefined, 7);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ExportCooldownActiveError);
        expect((error as ExportCooldownActiveError).tier).toBe('basic');
      }
    });

    it('calculates correct next available date', async () => {
      const exportTime = Date.now() - 2 * 24 * 60 * 60 * 1000; // 2 days ago
      const mockRead = jest.fn().mockResolvedValue({
        resource: { lastExportAt: exportTime },
      });
      mockContainer.item.mockReturnValue({ read: mockRead });

      try {
        await enforceExportCooldown('user-123', 'basic', 5);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ExportCooldownActiveError);
        const cooldownError = error as ExportCooldownActiveError;
        // Expected next available: exportTime + 5 days
        const expectedNextAvailable = exportTime + 5 * 24 * 60 * 60 * 1000;
        expect(cooldownError.nextAvailableAt.getTime()).toBe(expectedNextAvailable);
      }
    });
  });
});
