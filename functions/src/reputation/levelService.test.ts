import {
  computeLevel,
  computeLevelFromThresholds,
  getLevelName,
  getLevelBand,
  levelToTrustWeight,
  resetThresholdCache,
} from './levelService';
import { ReputationLevel } from './types';
import { getCosmosDatabase } from '@shared/clients/cosmos';

jest.mock('@shared/clients/cosmos', () => ({
  getCosmosDatabase: jest.fn(),
}));

const DEFAULT_THRESHOLDS = [0, 10, 50, 200, 500, 1000];

describe('levelService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetThresholdCache();
  });

  // ── computeLevelFromThresholds ────────────────────────────────────────
  describe('computeLevelFromThresholds', () => {
    it('returns Level 0 for score below first non-zero threshold', () => {
      expect(computeLevelFromThresholds(0, DEFAULT_THRESHOLDS)).toBe(ReputationLevel.New);
      expect(computeLevelFromThresholds(9, DEFAULT_THRESHOLDS)).toBe(ReputationLevel.New);
    });

    it('returns Level 1 at exactly first threshold (10)', () => {
      expect(computeLevelFromThresholds(10, DEFAULT_THRESHOLDS)).toBe(ReputationLevel.Verified);
    });

    it('returns Level 2 at exactly second threshold (50)', () => {
      expect(computeLevelFromThresholds(50, DEFAULT_THRESHOLDS)).toBe(ReputationLevel.Trusted);
    });

    it('returns Level 5 for score above max threshold', () => {
      expect(computeLevelFromThresholds(9999, DEFAULT_THRESHOLDS)).toBe(ReputationLevel.HighlyCredible);
    });

    it('returns Level 5 at exactly max threshold (1000)', () => {
      expect(computeLevelFromThresholds(1000, DEFAULT_THRESHOLDS)).toBe(ReputationLevel.HighlyCredible);
    });

    it('returns Level 0 for negative score', () => {
      expect(computeLevelFromThresholds(-10, DEFAULT_THRESHOLDS)).toBe(ReputationLevel.New);
    });
  });

  // ── computeLevel (async with Cosmos config) ───────────────────────────
  describe('computeLevel', () => {
    it('uses default thresholds when config container is unavailable', async () => {
      const mockRead = jest.fn().mockRejectedValue(new Error('Container not found'));
      (getCosmosDatabase as jest.Mock).mockReturnValue({
        container: jest.fn().mockReturnValue({
          item: jest.fn().mockReturnValue({ read: mockRead }),
        }),
      });

      const level = await computeLevel(25);
      expect(level).toBe(ReputationLevel.Verified); // 25 ≥ 10 but < 50 → Level 1 (Verified)
    });

    it('uses thresholds from Cosmos config when available', async () => {
      const customThresholds = [0, 5, 20, 100, 300, 700];
      const mockRead = jest.fn().mockResolvedValue({
        resource: { id: 'reputation.levelThresholds', value: customThresholds },
      });
      (getCosmosDatabase as jest.Mock).mockReturnValue({
        container: jest.fn().mockReturnValue({
          item: jest.fn().mockReturnValue({ read: mockRead }),
        }),
      });

      const level = await computeLevel(7);
      expect(level).toBe(ReputationLevel.Verified); // 7 ≥ 5 (threshold[1])
    });

    it('caches thresholds after first load', async () => {
      const mockRead = jest.fn().mockResolvedValue({
        resource: { id: 'reputation.levelThresholds', value: DEFAULT_THRESHOLDS },
      });
      (getCosmosDatabase as jest.Mock).mockReturnValue({
        container: jest.fn().mockReturnValue({
          item: jest.fn().mockReturnValue({ read: mockRead }),
        }),
      });

      await computeLevel(5);
      await computeLevel(5);
      // Cosmos should have been called only once due to in-memory cache
      expect(mockRead).toHaveBeenCalledTimes(1);
    });
  });

  // ── getLevelName ──────────────────────────────────────────────────────
  describe('getLevelName', () => {
    it.each([
      [ReputationLevel.New, 'New'],
      [ReputationLevel.Verified, 'Verified'],
      [ReputationLevel.Trusted, 'Trusted'],
      [ReputationLevel.Established, 'Established'],
      [ReputationLevel.Credible, 'Credible'],
      [ReputationLevel.HighlyCredible, 'Highly Credible'],
    ])('returns correct name for level %i', (level, expected) => {
      expect(getLevelName(level)).toBe(expected);
    });
  });

  // ── getLevelBand ──────────────────────────────────────────────────────
  describe('getLevelBand', () => {
    it('returns a non-empty band string for all levels', () => {
      for (let i = 0; i <= 5; i++) {
        const band = getLevelBand(i as ReputationLevel);
        expect(typeof band).toBe('string');
        expect(band.length).toBeGreaterThan(0);
      }
    });
  });

  // ── levelToTrustWeight ────────────────────────────────────────────────
  describe('levelToTrustWeight', () => {
    it('returns 0.3 for Level 0', () => {
      expect(levelToTrustWeight(ReputationLevel.New)).toBeCloseTo(0.3);
    });

    it('returns 1.0 for Level 5', () => {
      expect(levelToTrustWeight(ReputationLevel.HighlyCredible)).toBeCloseTo(1.0);
    });

    it('returns increasing weights across levels', () => {
      const weights = [0, 1, 2, 3, 4, 5].map(lvl => levelToTrustWeight(lvl as ReputationLevel));
      for (let i = 1; i < weights.length; i++) {
        expect(weights[i]).toBeGreaterThanOrEqual(weights[i - 1]);
      }
    });
  });
});
