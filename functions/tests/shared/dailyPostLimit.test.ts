/// <reference types="jest" />
/**
 * Daily Post Limit Service Tests
 *
 * Tests for tier-based daily post limits with counter tracking.
 */

// In-memory counter store
const counterStore = new Map<string, any>();

// Mock Cosmos
jest.mock('@shared/clients/cosmos', () => ({
  getCosmosDatabase: jest.fn(() => ({
    container: (name: string) => {
      if (name === 'counters') {
        return {
          item: jest.fn((id: string, partitionKey: string) => ({
            read: jest.fn(async () => {
              const counter = counterStore.get(id);
              if (!counter) {
                const error = new Error('Not found');
                (error as any).code = 404;
                throw error;
              }
              return { resource: { ...counter } };
            }),
            replace: jest.fn(async (doc: any) => {
              counterStore.set(doc.id, { ...doc });
              return { resource: doc };
            }),
          })),
          items: {
            create: jest.fn(async (doc: any) => {
              if (counterStore.has(doc.id)) {
                const error = new Error('Conflict');
                (error as any).code = 409;
                throw error;
              }
              counterStore.set(doc.id, { ...doc });
              return { resource: doc };
            }),
          },
        };
      }
      return {
        item: jest.fn(),
        items: { create: jest.fn() },
      };
    },
  })),
}));

// Mock logger
jest.mock('@shared/utils/logger', () => ({
  getAzureLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

import {
  getDailyPostCount,
  checkDailyPostLimit,
  incrementDailyPostCount,
  enforceDailyPostLimit,
  checkAndIncrementPostCount,
  DailyPostLimitExceededError,
  getUtcDateString,
  getNextUtcDateString,
} from '@shared/services/dailyPostLimitService';

describe('Daily Post Limit Service', () => {
  beforeEach(() => {
    counterStore.clear();
    jest.clearAllMocks();
  });

  describe('getUtcDateString', () => {
    it('should return YYYY-MM-DD format', () => {
      const date = new Date('2024-03-15T10:30:00Z');
      expect(getUtcDateString(date)).toBe('2024-03-15');
    });

    it('should use current date when not provided', () => {
      const result = getUtcDateString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getNextUtcDateString', () => {
    it('should return next day midnight ISO string', () => {
      const date = new Date('2024-03-15T10:30:00Z');
      const result = getNextUtcDateString(date);
      expect(result).toContain('2024-03-16');
      expect(result).toContain('T00:00:00');
    });
  });

  describe('getDailyPostCount', () => {
    it('should return 0 when no counter exists', async () => {
      const count = await getDailyPostCount('user-123');
      expect(count).toBe(0);
    });

    it('should return existing count', async () => {
      const date = getUtcDateString();
      counterStore.set(`user-123:post:${date}`, {
        id: `user-123:post:${date}`,
        userId: 'user-123',
        counterType: 'post',
        date,
        count: 5,
        updatedAt: Date.now(),
        ttl: 604800,
      });

      const count = await getDailyPostCount('user-123');
      expect(count).toBe(5);
    });
  });

  describe('checkDailyPostLimit', () => {
    it('should allow posts when under free tier limit', async () => {
      const result = await checkDailyPostLimit('user-123', 'free');
      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(0);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(5);
      expect(result.tier).toBe('free');
    });

    it('should allow posts when under premium tier limit', async () => {
      const result = await checkDailyPostLimit('user-456', 'premium');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(20);
      expect(result.tier).toBe('premium');
    });

    it('should deny posts when at free tier limit', async () => {
      const date = getUtcDateString();
      counterStore.set(`user-789:post:${date}`, {
        id: `user-789:post:${date}`,
        userId: 'user-789',
        counterType: 'post',
        date,
        count: 5,
        updatedAt: Date.now(),
        ttl: 604800,
      });

      const result = await checkDailyPostLimit('user-789', 'free');
      expect(result.allowed).toBe(false);
      expect(result.currentCount).toBe(5);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(0);
    });

    it('should allow premium user when over free limit', async () => {
      const date = getUtcDateString();
      counterStore.set(`user-premium:post:${date}`, {
        id: `user-premium:post:${date}`,
        userId: 'user-premium',
        counterType: 'post',
        date,
        count: 15,
        updatedAt: Date.now(),
        ttl: 604800,
      });

      const result = await checkDailyPostLimit('user-premium', 'premium');
      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(15);
      expect(result.limit).toBe(20);
      expect(result.remaining).toBe(5);
    });

    it('should allow black users near the limit', async () => {
      const date = getUtcDateString();
      counterStore.set(`black-user:post:${date}`, {
        id: `black-user:post:${date}`,
        userId: 'black-user',
        counterType: 'post',
        date,
        count: 48,
        updatedAt: Date.now(),
        ttl: 604800,
      });

      const result = await checkDailyPostLimit('black-user', 'black');
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(50);
      expect(result.remaining).toBe(2);
    });

    it('should default to free tier for undefined tier', async () => {
      const result = await checkDailyPostLimit('user-no-tier', undefined);
      expect(result.tier).toBe('free');
      expect(result.limit).toBe(5);
    });

    it('should normalize freemium to free tier', async () => {
      const result = await checkDailyPostLimit('user-freemium', 'freemium');
      expect(result.tier).toBe('free');
      expect(result.limit).toBe(5);
    });
  });

  describe('incrementDailyPostCount', () => {
    it('should create counter when none exists', async () => {
      const result = await incrementDailyPostCount('new-user', 'free');
      expect(result.success).toBe(true);
      expect(result.newCount).toBe(1);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(4);
    });

    it('should increment existing counter', async () => {
      const date = getUtcDateString();
      counterStore.set(`inc-user:post:${date}`, {
        id: `inc-user:post:${date}`,
        userId: 'inc-user',
        counterType: 'post',
        date,
        count: 3,
        updatedAt: Date.now(),
        ttl: 604800,
      });

      const result = await incrementDailyPostCount('inc-user', 'free');
      expect(result.success).toBe(true);
      expect(result.newCount).toBe(4);
      expect(result.remaining).toBe(1);
    });
  });

  describe('enforceDailyPostLimit', () => {
    it('should return result when under limit', async () => {
      const result = await enforceDailyPostLimit('enforce-user', 'free');
      expect(result.allowed).toBe(true);
    });

    it('should throw DailyPostLimitExceededError when at limit', async () => {
      const date = getUtcDateString();
      counterStore.set(`limit-user:post:${date}`, {
        id: `limit-user:post:${date}`,
        userId: 'limit-user',
        counterType: 'post',
        date,
        count: 5,
        updatedAt: Date.now(),
        ttl: 604800,
      });

      await expect(enforceDailyPostLimit('limit-user', 'free'))
        .rejects
        .toThrow(DailyPostLimitExceededError);
    });
  });

  describe('checkAndIncrementPostCount', () => {
    it('should increment and return result when under limit', async () => {
      const result = await checkAndIncrementPostCount('check-inc-user', 'free');
      expect(result.success).toBe(true);
      expect(result.newCount).toBe(1);
    });

    it('should throw error without incrementing when at limit', async () => {
      const date = getUtcDateString();
      counterStore.set(`at-limit-user:post:${date}`, {
        id: `at-limit-user:post:${date}`,
        userId: 'at-limit-user',
        counterType: 'post',
        date,
        count: 5,
        updatedAt: Date.now(),
        ttl: 604800,
      });

      await expect(checkAndIncrementPostCount('at-limit-user', 'free'))
        .rejects
        .toThrow(DailyPostLimitExceededError);

      // Verify counter wasn't incremented
      const counter = counterStore.get(`at-limit-user:post:${date}`);
      expect(counter.count).toBe(5);
    });

    it('should allow premium user to post more than free limit', async () => {
      const date = getUtcDateString();
      counterStore.set(`premium-user:post:${date}`, {
        id: `premium-user:post:${date}`,
        userId: 'premium-user',
        counterType: 'post',
        date,
        count: 15,
        updatedAt: Date.now(),
        ttl: 604800,
      });

      const result = await checkAndIncrementPostCount('premium-user', 'premium');
      expect(result.success).toBe(true);
      expect(result.newCount).toBe(16);
      expect(result.limit).toBe(20);
    });
  });

  describe('DailyPostLimitExceededError', () => {
    it('should have correct properties', () => {
      const result = {
        allowed: false,
        currentCount: 5,
        limit: 5,
        remaining: 0,
        tier: 'free' as const,
        resetDate: '2024-03-16T00:00:00.000Z',
      };

      const error = new DailyPostLimitExceededError(result);
      expect(error.code).toBe('daily_post_limit_reached');
      expect(error.statusCode).toBe(429);
      expect(error.limit).toBe(5);
      expect(error.currentCount).toBe(5);
      expect(error.tier).toBe('free');
    });

    it('should produce correct response object', () => {
      const result = {
        allowed: false,
        currentCount: 5,
        limit: 5,
        remaining: 0,
        tier: 'free' as const,
        resetDate: '2024-03-16T00:00:00.000Z',
      };

      const error = new DailyPostLimitExceededError(result);
      const response = error.toResponse();
      
      expect(response.error).toContain('Daily post limit reached');
      expect(response.code).toBe('daily_post_limit_reached');
      expect(response.limit).toBe(5);
      expect(response.current).toBe(5);
      expect(response.tier).toBe('free');
      expect(response.resetAt).toBe('2024-03-16T00:00:00.000Z');
    });
  });

  describe('Tier-based rate limiting scenarios', () => {
    it('free user hits limit at 5 posts', async () => {
      const userId = 'free-scenario-user';
      const date = getUtcDateString();

      // Post 5 times (should all succeed)
      for (let i = 0; i < 5; i++) {
        const result = await checkAndIncrementPostCount(userId, 'free');
        expect(result.success).toBe(true);
        expect(result.newCount).toBe(i + 1);
      }

      // 6th post should fail
      await expect(checkAndIncrementPostCount(userId, 'free'))
        .rejects
        .toThrow(DailyPostLimitExceededError);

      // Verify final count
      const counter = counterStore.get(`${userId}:post:${date}`);
      expect(counter.count).toBe(5);
    });

    it('premium user can post 15 times without hitting premium limit', async () => {
      const userId = 'premium-scenario-user';
      const date = getUtcDateString();

      // Post 15 times (should all succeed for premium)
      for (let i = 0; i < 15; i++) {
        const result = await checkAndIncrementPostCount(userId, 'premium');
        expect(result.success).toBe(true);
        expect(result.newCount).toBe(i + 1);
      }

      // Verify counter at 15
      const counter = counterStore.get(`${userId}:post:${date}`);
      expect(counter.count).toBe(15);
    });

    it('premium user hits limit at 20 posts', async () => {
      const userId = 'premium-limit-user';
      const date = getUtcDateString();

      // Pre-set counter to 19
      counterStore.set(`${userId}:post:${date}`, {
        id: `${userId}:post:${date}`,
        userId,
        counterType: 'post',
        date,
        count: 19,
        updatedAt: Date.now(),
        ttl: 604800,
      });

      // 20th post should succeed
      const result = await checkAndIncrementPostCount(userId, 'premium');
      expect(result.success).toBe(true);
      expect(result.newCount).toBe(20);

      // 21st post should fail
      await expect(checkAndIncrementPostCount(userId, 'premium'))
        .rejects
        .toThrow(DailyPostLimitExceededError);
    });

    it('black user hits limit at 50 posts', async () => {
      const userId = 'black-limit-user';
      const date = getUtcDateString();

      counterStore.set(`${userId}:post:${date}`, {
        id: `${userId}:post:${date}`,
        userId,
        counterType: 'post',
        date,
        count: 50,
        updatedAt: Date.now(),
        ttl: 604800,
      });

      await expect(checkAndIncrementPostCount(userId, 'black'))
        .rejects
        .toThrow(DailyPostLimitExceededError);
    });

    it('resets counts at UTC midnight', async () => {
      const userId = 'midnight-reset-user';
      jest.useFakeTimers({ now: new Date('2024-03-15T23:59:00Z').getTime() });
      try {
        for (let i = 0; i < 5; i++) {
          await checkAndIncrementPostCount(userId, 'free');
        }
        await expect(checkAndIncrementPostCount(userId, 'free'))
          .rejects
          .toThrow(DailyPostLimitExceededError);

        jest.setSystemTime(new Date('2024-03-16T00:01:00Z'));
        const result = await checkAndIncrementPostCount(userId, 'free');
        expect(result.success).toBe(true);
        expect(result.newCount).toBe(1);
      } finally {
        jest.useRealTimers();
      }
    });

    it('admin user has effectively unlimited posts', async () => {
      const userId = 'admin-user';
      const date = getUtcDateString();

      // Pre-set counter to very high number
      counterStore.set(`${userId}:post:${date}`, {
        id: `${userId}:post:${date}`,
        userId,
        counterType: 'post',
        date,
        count: 9999,
        updatedAt: Date.now(),
        ttl: 604800,
      });

      // Should still be allowed (admin limit is 10000)
      const result = await checkAndIncrementPostCount(userId, 'admin');
      expect(result.success).toBe(true);
      expect(result.newCount).toBe(10000);
    });
  });
});
