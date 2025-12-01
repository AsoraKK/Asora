/// <reference types="jest" />
/**
 * Tier Limits Tests
 *
 * Tests for tier configuration and limit lookups.
 */

// Save original env
const originalEnv = process.env;

// Reset env before importing module
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterAll(() => {
  process.env = originalEnv;
});

describe('Tier Limits', () => {
  describe('normalizeTier', () => {
    let normalizeTier: typeof import('@shared/services/tierLimits').normalizeTier;

    beforeEach(async () => {
      const module = await import('@shared/services/tierLimits');
      normalizeTier = module.normalizeTier;
    });

    it('should return free for undefined tier', () => {
      expect(normalizeTier(undefined)).toBe('free');
    });

    it('should return free for null tier', () => {
      expect(normalizeTier(null)).toBe('free');
    });

    it('should return free for empty string', () => {
      expect(normalizeTier('')).toBe('free');
    });

    it('should normalize freemium to free', () => {
      expect(normalizeTier('freemium')).toBe('free');
    });

    it('should return free tier correctly', () => {
      expect(normalizeTier('free')).toBe('free');
    });

    it('should return premium tier correctly', () => {
      expect(normalizeTier('premium')).toBe('premium');
    });

    it('should return admin tier correctly', () => {
      expect(normalizeTier('admin')).toBe('admin');
    });

    it('should return black tier correctly', () => {
      expect(normalizeTier('black')).toBe('black');
    });

    it('should be case insensitive', () => {
      expect(normalizeTier('FREE')).toBe('free');
      expect(normalizeTier('Premium')).toBe('premium');
      expect(normalizeTier('ADMIN')).toBe('admin');
    });

    it('should handle whitespace', () => {
      expect(normalizeTier('  free  ')).toBe('free');
      expect(normalizeTier(' premium ')).toBe('premium');
    });

    it('should return free for unknown tier', () => {
      expect(normalizeTier('unknown')).toBe('free');
      expect(normalizeTier('enterprise')).toBe('free');
    });
  });

  describe('getDailyPostLimit', () => {
    let getDailyPostLimit: typeof import('@shared/services/tierLimits').getDailyPostLimit;
    
    beforeEach(async () => {
      const module = await import('@shared/services/tierLimits');
      getDailyPostLimit = module.getDailyPostLimit;
    });

    it('should return 10 for free tier by default', () => {
      expect(getDailyPostLimit('free')).toBe(5);
    });

    it('should return 100 for premium tier by default', () => {
      expect(getDailyPostLimit('premium')).toBe(20);
    });

    it('should return 10000 for admin tier', () => {
      expect(getDailyPostLimit('admin')).toBe(10000);
    });

    it('should return 50 for black tier by default', () => {
      expect(getDailyPostLimit('black')).toBe(50);
    });

    it('should return free limit for undefined tier', () => {
      expect(getDailyPostLimit(undefined)).toBe(5);
    });

    it('should return free limit for null tier', () => {
      expect(getDailyPostLimit(null)).toBe(5);
    });

    it('should normalize freemium to free', () => {
      expect(getDailyPostLimit('freemium')).toBe(5);
    });
  });

  describe('environment variable overrides', () => {
    it('should allow overriding free daily posts via env', async () => {
      process.env.TIER_FREE_DAILY_POSTS = '5';
      const { getDailyPostLimit } = await import('@shared/services/tierLimits');
      expect(getDailyPostLimit('free')).toBe(5);
    });

    it('should allow overriding premium daily posts via env', async () => {
      process.env.TIER_PREMIUM_DAILY_POSTS = '200';
      const { getDailyPostLimit } = await import('@shared/services/tierLimits');
      expect(getDailyPostLimit('premium')).toBe(200);
    });

    it('should allow overriding black daily posts via env', async () => {
      process.env.TIER_BLACK_DAILY_POSTS = '75';
      const { getDailyPostLimit } = await import('@shared/services/tierLimits');
      expect(getDailyPostLimit('black')).toBe(75);
    });
  });

  describe('getLimitsForTier', () => {
    let getLimitsForTier: typeof import('@shared/services/tierLimits').getLimitsForTier;

    beforeEach(async () => {
      const module = await import('@shared/services/tierLimits');
      getLimitsForTier = module.getLimitsForTier;
    });

    it('should return full limits object for free tier', () => {
      const limits = getLimitsForTier('free');
      expect(limits).toHaveProperty('dailyPosts');
      expect(limits).toHaveProperty('dailyComments');
      expect(limits).toHaveProperty('dailyLikes');
    });

    it('should return higher limits for premium', () => {
      const freeLimits = getLimitsForTier('free');
      const premiumLimits = getLimitsForTier('premium');
      expect(premiumLimits.dailyPosts).toBeGreaterThan(freeLimits.dailyPosts);
      expect(premiumLimits.dailyComments).toBeGreaterThan(freeLimits.dailyComments);
      expect(premiumLimits.dailyLikes).toBeGreaterThan(freeLimits.dailyLikes);
    });
  });
});
