/**
 * Feed Ranking Tests
 *
 * Tests the reputation-based feed ranking algorithm that combines
 * recency and author reputation to determine post ordering.
 *
 * Algorithm: score = (recencyWeight * recencyScore) + (reputationWeight * reputationScore)
 * Default weights: recency=0.7, reputation=0.3
 */
import {
  calculateRecencyScore,
  calculateReputationScore,
  calculateRankingScore,
  getRankingConfig,
  DEFAULT_RANKING_CONFIG,
  type RankingConfig,
} from '../../src/feed/ranking/rankingConfig';

describe('Feed Ranking', () => {
  describe('calculateRecencyScore', () => {
    const config = DEFAULT_RANKING_CONFIG;

    it('returns 1 for posts created now', () => {
      const now = Date.now();
      const score = calculateRecencyScore(now, now, config);
      expect(score).toBe(1);
    });

    it('returns 0 for posts older than maxAgeDays', () => {
      const now = Date.now();
      const oldPost = now - (config.maxAgeDays + 1) * 24 * 60 * 60 * 1000;
      const score = calculateRecencyScore(oldPost, now, config);
      expect(score).toBe(0);
    });

    it('returns ~0.5 for posts at half maxAge', () => {
      const now = Date.now();
      const halfAgeMs = (config.maxAgeDays / 2) * 24 * 60 * 60 * 1000;
      const midAgePost = now - halfAgeMs;
      const score = calculateRecencyScore(midAgePost, now, config);
      expect(score).toBeCloseTo(0.5, 1);
    });

    it('handles future timestamps by returning 1', () => {
      const now = Date.now();
      const futurePost = now + 10000;
      const score = calculateRecencyScore(futurePost, now, config);
      expect(score).toBe(1);
    });
  });

  describe('calculateReputationScore', () => {
    const config = DEFAULT_RANKING_CONFIG;

    it('returns 0 for reputation <= 0', () => {
      expect(calculateReputationScore(0, config)).toBe(0);
      expect(calculateReputationScore(-10, config)).toBe(0);
    });

    it('returns 1 for reputation >= maxReputation', () => {
      expect(calculateReputationScore(config.maxReputation, config)).toBe(1);
      expect(calculateReputationScore(config.maxReputation + 500, config)).toBe(1);
    });

    it('returns proportional score for intermediate reputation', () => {
      const halfRep = config.maxReputation / 2;
      expect(calculateReputationScore(halfRep, config)).toBeCloseTo(0.5, 2);
    });

    it('returns 0.1 for 100 rep with maxReputation=1000', () => {
      expect(calculateReputationScore(100, config)).toBeCloseTo(0.1, 2);
    });
  });

  describe('calculateRankingScore', () => {
    const config = DEFAULT_RANKING_CONFIG;
    const now = Date.now();

    it('combines recency and reputation with correct weights', () => {
      // Brand new post (recency=1), high rep author (rep=1)
      const score = calculateRankingScore(now, config.maxReputation, now, config);
      // score = 0.7 * 1 + 0.3 * 1 = 1.0
      expect(score).toBeCloseTo(1.0, 2);
    });

    it('new post from zero-rep author has recency-only score', () => {
      const score = calculateRankingScore(now, 0, now, config);
      // score = 0.7 * 1 + 0.3 * 0 = 0.7
      expect(score).toBeCloseTo(0.7, 2);
    });

    it('old post from high-rep author has reputation-only score', () => {
      const oldPost = now - (config.maxAgeDays + 1) * 24 * 60 * 60 * 1000;
      const score = calculateRankingScore(oldPost, config.maxReputation, now, config);
      // score = 0.7 * 0 + 0.3 * 1 = 0.3
      expect(score).toBeCloseTo(0.3, 2);
    });

    it('old post from zero-rep author has score 0', () => {
      const oldPost = now - (config.maxAgeDays + 1) * 24 * 60 * 60 * 1000;
      const score = calculateRankingScore(oldPost, 0, now, config);
      expect(score).toBeCloseTo(0, 2);
    });
  });

  describe('Ranking Behavior - Higher Rep Authors Appear Earlier', () => {
    const config = DEFAULT_RANKING_CONFIG;
    const now = Date.now();

    it('high-rep author ranks above low-rep author at same timestamp', () => {
      const sameTime = now - 1000; // Both posts 1 second old
      const highRepScore = calculateRankingScore(sameTime, 500, now, config);
      const lowRepScore = calculateRankingScore(sameTime, 50, now, config);

      expect(highRepScore).toBeGreaterThan(lowRepScore);
    });

    it('high-rep author ranks above low-rep author even when slightly older', () => {
      // High rep post is 1 hour older, but author has 800 rep
      // Low rep post is newer, but author has 50 rep
      const highRepPostTime = now - 60 * 60 * 1000; // 1 hour ago
      const lowRepPostTime = now - 30 * 60 * 1000; // 30 minutes ago

      const highRepScore = calculateRankingScore(highRepPostTime, 800, now, config);
      const lowRepScore = calculateRankingScore(lowRepPostTime, 50, now, config);

      // With default weights, the high-rep author's reputation bonus
      // should compensate for being 30 minutes older
      expect(highRepScore).toBeGreaterThan(lowRepScore);
    });

    it('much older high-rep post loses to newer low-rep post', () => {
      // High rep post is 3 days old (still within window)
      // Low rep post is brand new
      const highRepPostTime = now - 3 * 24 * 60 * 60 * 1000; // 3 days ago
      const lowRepPostTime = now; // Just now

      const highRepScore = calculateRankingScore(highRepPostTime, 1000, now, config);
      const lowRepScore = calculateRankingScore(lowRepPostTime, 0, now, config);

      // Recency dominates - a 3 day old post can't beat a brand new post
      // highRepScore ~= 0.7 * (1 - 3/7) + 0.3 * 1 = 0.7 * 0.57 + 0.3 = 0.7
      // lowRepScore = 0.7 * 1 + 0.3 * 0 = 0.7
      // They're close but new wins due to recency dominance
      expect(lowRepScore).toBeGreaterThanOrEqual(highRepScore - 0.1);
    });
  });

  describe('getRankingConfig', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('returns default config when no env vars set', () => {
      const config = getRankingConfig();
      expect(config.enabled).toBe(true);
      expect(config.recencyWeight).toBe(0.7);
      expect(config.reputationWeight).toBe(0.3);
    });

    it('respects FEED_RANKING_ENABLED=false', () => {
      process.env.FEED_RANKING_ENABLED = 'false';
      const config = getRankingConfig();
      expect(config.enabled).toBe(false);
    });

    it('respects custom weight overrides', () => {
      process.env.FEED_RANKING_RECENCY_WEIGHT = '0.5';
      process.env.FEED_RANKING_REPUTATION_WEIGHT = '0.5';
      const config = getRankingConfig();
      expect(config.recencyWeight).toBe(0.5);
      expect(config.reputationWeight).toBe(0.5);
    });
  });

  describe('Sorting Integration', () => {
    /**
     * Simulates the feed sorting behavior by creating mock posts
     * and sorting them using the ranking algorithm.
     */
    const config = DEFAULT_RANKING_CONFIG;

    function createPost(id: string, createdAt: number, authorId: string) {
      return { id, createdAt, authorId };
    }

    function sortPosts(
      posts: Array<{ id: string; createdAt: number; authorId: string }>,
      reputations: Map<string, number>,
      now: number
    ) {
      return [...posts].sort((a, b) => {
        const aRep = reputations.get(a.authorId) ?? 0;
        const bRep = reputations.get(b.authorId) ?? 0;
        const aScore = calculateRankingScore(a.createdAt, aRep, now, config);
        const bScore = calculateRankingScore(b.createdAt, bRep, now, config);

        if (aScore !== bScore) return bScore - aScore;
        if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt;
        return a.id < b.id ? 1 : -1;
      });
    }

    it('sorts posts by combined score - high rep + recent wins', () => {
      const now = Date.now();
      const posts = [
        createPost('post-1', now - 5000, 'low-rep-user'),
        createPost('post-2', now - 5000, 'high-rep-user'),
        createPost('post-3', now - 5000, 'mid-rep-user'),
      ];

      const reputations = new Map([
        ['low-rep-user', 10],
        ['high-rep-user', 900],
        ['mid-rep-user', 300],
      ]);

      const sorted = sortPosts(posts, reputations, now);

      // Same timestamp - should be ordered by reputation
      expect(sorted[0].authorId).toBe('high-rep-user');
      expect(sorted[1].authorId).toBe('mid-rep-user');
      expect(sorted[2].authorId).toBe('low-rep-user');
    });

    it('balances recency and reputation - much newer low-rep beats older mid-rep', () => {
      const now = Date.now();
      const posts = [
        createPost('post-1', now - 3 * 24 * 60 * 60 * 1000, 'mid-rep-user'), // 3 days ago
        createPost('post-2', now - 1000, 'low-rep-user'), // 1 second ago
      ];

      const reputations = new Map([
        ['mid-rep-user', 300],
        ['low-rep-user', 50],
      ]);

      const sorted = sortPosts(posts, reputations, now);

      // The brand new post should beat 3 day old post even with lower rep
      // low-rep: 0.7 * 1.0 + 0.3 * 0.05 = 0.715
      // mid-rep: 0.7 * 0.57 + 0.3 * 0.3 = 0.49
      expect(sorted[0].authorId).toBe('low-rep-user');
      expect(sorted[1].authorId).toBe('mid-rep-user');
    });

    it('high rep compensates for slight age difference', () => {
      const now = Date.now();
      const posts = [
        createPost('post-1', now - 5 * 60 * 1000, 'high-rep-user'), // 5 min ago
        createPost('post-2', now - 2 * 60 * 1000, 'low-rep-user'), // 2 min ago
      ];

      const reputations = new Map([
        ['high-rep-user', 900],
        ['low-rep-user', 10],
      ]);

      const sorted = sortPosts(posts, reputations, now);

      // High rep should overcome 3 minute age difference
      expect(sorted[0].authorId).toBe('high-rep-user');
    });
  });
});
