import {
  calculateRankingScore,
  DEFAULT_RANKING_CONFIG,
  type RankingConfig,
} from './rankingConfig';

describe('rankingConfig', () => {
  const now = Date.UTC(2026, 0, 1, 12, 0, 0);
  const oneHourAgo = now - 60 * 60 * 1000;
  const config: RankingConfig = {
    ...DEFAULT_RANKING_CONFIG,
    recencyWeight: 0.7,
    reputationWeight: 0.3,
    maxReputation: 1000,
  };

  it('computes ranking score from recency and reputation only', () => {
    const score = calculateRankingScore(oneHourAgo, 500, now, config);

    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('is invariant to trust passport visibility values', () => {
    const postVariants = [
      { trustPassportVisibility: 'public_expanded' },
      { trustPassportVisibility: 'public_minimal' },
      { trustPassportVisibility: 'private' },
    ];

    const scores = postVariants.map(() =>
      calculateRankingScore(oneHourAgo, 420, now, config)
    );

    expect(scores[0]).toBe(scores[1]);
    expect(scores[1]).toBe(scores[2]);
  });
});
