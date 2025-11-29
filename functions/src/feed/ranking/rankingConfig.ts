/**
 * Feed Ranking Configuration
 *
 * Defines the scoring weights and parameters for ranking feed posts.
 * The final score is computed as:
 *   score = (recencyWeight * recencyScore) + (reputationWeight * reputationScore)
 *
 * Where:
 *   - recencyScore: Normalized 0-1 based on post age vs maxAgeDays
 *   - reputationScore: Normalized 0-1 based on author reputation vs maxReputation
 *
 * Posts are sorted by score descending, with ID as tie-breaker.
 */

export interface RankingConfig {
  /**
   * Weight for recency component (0-1)
   * Higher values favor newer posts more strongly
   */
  recencyWeight: number;

  /**
   * Weight for author reputation component (0-1)
   * Higher values favor high-reputation authors more strongly
   */
  reputationWeight: number;

  /**
   * Maximum post age (in days) considered for recency scoring
   * Posts older than this get recencyScore = 0
   * @default 7
   */
  maxAgeDays: number;

  /**
   * Maximum reputation value for normalization
   * Authors at or above this get reputationScore = 1
   * @default 1000
   */
  maxReputation: number;

  /**
   * Default reputation score for authors not found in database
   * @default 0
   */
  defaultReputation: number;

  /**
   * Whether ranking by reputation is enabled
   * When false, posts are sorted purely by recency
   * @default true
   */
  enabled: boolean;
}

/**
 * Default ranking configuration
 * Tuned for slight reputation boost while keeping recency dominant
 */
export const DEFAULT_RANKING_CONFIG: RankingConfig = {
  // Recency is dominant (70%), reputation provides boost (30%)
  recencyWeight: 0.7,
  reputationWeight: 0.3,

  // Posts older than 7 days get no recency bonus
  maxAgeDays: 7,

  // Reputation normalized against 1000 (top users)
  maxReputation: 1000,

  // Unknown authors get zero reputation bonus
  defaultReputation: 0,

  // Ranking enabled by default
  enabled: true,
};

/**
 * Get the active ranking configuration
 * Can be extended to load from environment/config store
 */
export function getRankingConfig(): RankingConfig {
  // Environment overrides for tuning
  const enabled = process.env.FEED_RANKING_ENABLED !== 'false';
  const recencyWeight = parseFloat(process.env.FEED_RANKING_RECENCY_WEIGHT ?? '') || DEFAULT_RANKING_CONFIG.recencyWeight;
  const reputationWeight = parseFloat(process.env.FEED_RANKING_REPUTATION_WEIGHT ?? '') || DEFAULT_RANKING_CONFIG.reputationWeight;

  return {
    ...DEFAULT_RANKING_CONFIG,
    enabled,
    recencyWeight,
    reputationWeight,
  };
}

/**
 * Calculate recency score (0-1) based on post age
 * Newer posts score higher
 */
export function calculateRecencyScore(
  createdAt: number,
  now: number,
  config: RankingConfig
): number {
  const ageMs = now - createdAt;
  const maxAgeMs = config.maxAgeDays * 24 * 60 * 60 * 1000;

  if (ageMs <= 0) {
    return 1; // Future timestamps get max score
  }

  if (ageMs >= maxAgeMs) {
    return 0; // Old posts get no recency bonus
  }

  // Linear decay: 1 at creation, 0 at maxAge
  return 1 - (ageMs / maxAgeMs);
}

/**
 * Calculate reputation score (0-1) based on author reputation
 * Higher reputation authors score higher
 */
export function calculateReputationScore(
  reputation: number,
  config: RankingConfig
): number {
  if (reputation <= 0) {
    return 0;
  }

  if (reputation >= config.maxReputation) {
    return 1;
  }

  // Linear scale: 0 at rep=0, 1 at rep=maxReputation
  return reputation / config.maxReputation;
}

/**
 * Calculate combined ranking score for a post
 * Returns a number where higher = more visible in feed
 */
export function calculateRankingScore(
  createdAt: number,
  authorReputation: number,
  now: number,
  config: RankingConfig
): number {
  const recencyScore = calculateRecencyScore(createdAt, now, config);
  const reputationScore = calculateReputationScore(authorReputation, config);

  return (config.recencyWeight * recencyScore) + (config.reputationWeight * reputationScore);
}
