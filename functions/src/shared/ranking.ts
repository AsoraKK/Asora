/**
 * Feed ranking system for Asora platform
 *
 * Implements a weighted scoring algorithm to rank posts based on:
 * - Recency: How recent the post is (0-1 normalized from createdAt)
 * - Engagement: User interaction metrics (likes, comments, shares) clamped 0-1
 * - Author Reputation: Author's reputation score clamped 0-1
 *
 * Formula: score = 0.5 * recency + 0.3 * engagement + 0.2 * authorReputation
 */

export interface PostForRanking {
  id: string;
  authorId: string;
  createdAt: string;
  engagementScore: number;
  authorReputation: number;
}

export interface RankedPost extends PostForRanking {
  score: number;
  rankingFactors: {
    recency: number;
    normalizedEngagement: number;
    normalizedAuthorReputation: number;
  };
}

export interface RankingWeights {
  recency: number;
  engagement: number;
  authorReputation: number;
}

// Default ranking weights - can be made configurable later
const DEFAULT_WEIGHTS: RankingWeights = {
  recency: 0.5,
  engagement: 0.3,
  authorReputation: 0.2,
};

/**
 * Calculate recency score (0-1) based on post creation time
 * More recent posts get higher scores
 */
export function calculateRecencyScore(createdAt: string, referenceTime?: Date): number {
  const postTime = new Date(createdAt).getTime();
  const refTime = (referenceTime || new Date()).getTime();

  // If post is in the future, return 1 (highest recency)
  if (postTime > refTime) {
    return 1.0;
  }

  // Calculate age in hours
  const ageInHours = (refTime - postTime) / (1000 * 60 * 60);

  // Use exponential decay - posts older than 24 hours get significantly lower scores
  // Formula: e^(-age/24) ensures 24h old posts get ~0.37, 48h gets ~0.14
  const recencyScore = Math.exp(-ageInHours / 24);

  return Math.min(1.0, Math.max(0.0, recencyScore));
}

/**
 * Normalize and clamp engagement score to 0-1 range
 */
export function normalizeEngagementScore(engagementScore: number): number {
  if (engagementScore <= 0) return 0.0;

  // Use logarithmic scaling to prevent viral posts from dominating
  // Max engagement score of 10000 maps to 1.0
  const maxEngagement = 10000;
  const normalizedScore = Math.log(engagementScore + 1) / Math.log(maxEngagement + 1);

  return Math.min(1.0, Math.max(0.0, normalizedScore));
}

/**
 * Normalize and clamp author reputation to 0-1 range
 */
export function normalizeAuthorReputation(authorReputation: number): number {
  if (authorReputation <= 0) return 0.0;

  // Assume reputation scores range from 0-1000, with 1000 being perfect reputation
  const maxReputation = 1000;
  const normalizedReputation = authorReputation / maxReputation;

  return Math.min(1.0, Math.max(0.0, normalizedReputation));
}

/**
 * Calculate weighted ranking score for a single post
 */
export function calculatePostScore(
  post: PostForRanking,
  weights: RankingWeights = DEFAULT_WEIGHTS,
  referenceTime?: Date
): RankedPost {
  const recency = calculateRecencyScore(post.createdAt, referenceTime);
  const normalizedEngagement = normalizeEngagementScore(post.engagementScore);
  const normalizedAuthorReputation = normalizeAuthorReputation(post.authorReputation);

  const score =
    weights.recency * recency +
    weights.engagement * normalizedEngagement +
    weights.authorReputation * normalizedAuthorReputation;

  return {
    ...post,
    score,
    rankingFactors: {
      recency,
      normalizedEngagement,
      normalizedAuthorReputation,
    },
  };
}

/**
 * Rank a collection of posts and sort by score (descending)
 */
export function rankPosts(
  posts: PostForRanking[],
  weights: RankingWeights = DEFAULT_WEIGHTS,
  referenceTime?: Date
): RankedPost[] {
  const rankedPosts = posts.map(post => calculatePostScore(post, weights, referenceTime));

  // Sort by score descending (highest score first)
  return rankedPosts.sort((a, b) => b.score - a.score);
}

/**
 * Apply pagination to ranked posts
 */
export function paginateRankedPosts(
  rankedPosts: RankedPost[],
  page: number = 1,
  pageSize: number = 20
): {
  posts: RankedPost[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
} {
  const totalItems = rankedPosts.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  const posts = rankedPosts.slice(startIndex, endIndex);

  return {
    posts,
    pagination: {
      currentPage: page,
      pageSize,
      totalItems,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    },
  };
}

/**
 * Generate ranking telemetry data for monitoring
 */
export interface RankingTelemetry {
  requestId: string;
  totalPosts: number;
  rankedPosts: number;
  page: number;
  pageSize: number;
  averageScore: number;
  scoreDistribution: {
    min: number;
    max: number;
    p50: number;
    p90: number;
    p99: number;
  };
  weights: RankingWeights;
  processingTimeMs: number;
}

export function generateRankingTelemetry(
  rankedPosts: RankedPost[],
  page: number,
  pageSize: number,
  weights: RankingWeights,
  processingTimeMs: number,
  requestId: string
): RankingTelemetry {
  const scores = rankedPosts.map(p => p.score).sort((a, b) => a - b);
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length || 0;

  return {
    requestId,
    totalPosts: rankedPosts.length,
    rankedPosts: rankedPosts.length,
    page,
    pageSize,
    averageScore,
    scoreDistribution: {
      min: scores[0] || 0,
      max: scores[scores.length - 1] || 0,
      p50: scores[Math.floor(scores.length * 0.5)] || 0,
      p90: scores[Math.floor(scores.length * 0.9)] || 0,
      p99: scores[Math.floor(scores.length * 0.99)] || 0,
    },
    weights,
    processingTimeMs,
  };
}
