/**
 * Tests for tier-based limits functionality
 */

import { 
  getAttachmentLimit, 
  getDailyPostLimit, 
  getTierLimits, 
  validateAttachmentCount,
  UserTier 
} from '../shared/tierLimits';

describe('Tier Limits', () => {
  describe('getAttachmentLimit', () => {
    it('should return correct attachment limits for each tier', () => {
      expect(getAttachmentLimit('Free')).toBe(1);
      expect(getAttachmentLimit('Black')).toBe(3);
      expect(getAttachmentLimit('Premium')).toBe(5);
      expect(getAttachmentLimit('Enterprise')).toBe(10);
    });

    it('should default to Free tier for invalid tiers', () => {
      expect(getAttachmentLimit('InvalidTier')).toBe(1);
      expect(getAttachmentLimit('')).toBe(1);
    });

    it('should handle undefined/null tier gracefully', () => {
      expect(getAttachmentLimit(undefined as any)).toBe(1);
    });
  });

  describe('getDailyPostLimit', () => {
    it('should return correct daily post limits for each tier', () => {
      expect(getDailyPostLimit('Free')).toBe(10);
      expect(getDailyPostLimit('Black')).toBe(50);
      expect(getDailyPostLimit('Premium')).toBe(100);
      expect(getDailyPostLimit('Enterprise')).toBe(Infinity);
    });

    it('should default to Free tier limits for invalid tiers', () => {
      expect(getDailyPostLimit('InvalidTier')).toBe(10);
      expect(getDailyPostLimit('')).toBe(10);
    });
  });

  describe('validateAttachmentCount', () => {
    it('should validate Free tier attachment limits', () => {
      expect(validateAttachmentCount('Free', 0)).toEqual({
        valid: true,
        allowed: 1,
        exceeded: 0
      });

      expect(validateAttachmentCount('Free', 1)).toEqual({
        valid: true,
        allowed: 1,
        exceeded: 0
      });

      expect(validateAttachmentCount('Free', 2)).toEqual({
        valid: false,
        allowed: 1,
        exceeded: 1
      });
    });

    it('should validate Black tier attachment limits', () => {
      expect(validateAttachmentCount('Black', 3)).toEqual({
        valid: true,
        allowed: 3,
        exceeded: 0
      });

      expect(validateAttachmentCount('Black', 4)).toEqual({
        valid: false,
        allowed: 3,
        exceeded: 1
      });
    });

    it('should validate Enterprise tier attachment limits', () => {
      expect(validateAttachmentCount('Enterprise', 10)).toEqual({
        valid: true,
        allowed: 10,
        exceeded: 0
      });

      expect(validateAttachmentCount('Enterprise', 15)).toEqual({
        valid: false,
        allowed: 10,
        exceeded: 5
      });
    });
  });

  describe('getTierLimits', () => {
    it('should return complete tier limits object', () => {
      const freeLimits = getTierLimits('Free');
      expect(freeLimits).toEqual({
        dailyPostLimit: 10,
        attachmentLimit: 1,
        hourlyRateLimit: 50,
        maxTextLength: 500
      });

      const blackLimits = getTierLimits('Black');
      expect(blackLimits).toEqual({
        dailyPostLimit: 50,
        attachmentLimit: 3,
        hourlyRateLimit: 200,
        maxTextLength: 1000
      });
    });
  });
});
