/**
 * Tier Limits Configuration
 *
 * Defines per-tier daily limits for various actions.
 * Tiers are stored in user's JWT token as the `tier` claim.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type UserTier = 'free' | 'premium' | 'black' | 'admin';

export interface TierLimits {
  /** Maximum posts per day */
  dailyPosts: number;
  /** Maximum comments per day */
  dailyComments: number;
  /** Maximum likes per day */
  dailyLikes: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tier limit configuration
 * Can be overridden via environment variables for operational flexibility
 */
export const TIER_LIMITS: Record<UserTier, TierLimits> = {
  free: {
    dailyPosts: parseInt(process.env.TIER_FREE_DAILY_POSTS ?? '5', 10),
    dailyComments: parseInt(process.env.TIER_FREE_DAILY_COMMENTS ?? '50', 10),
    dailyLikes: parseInt(process.env.TIER_FREE_DAILY_LIKES ?? '100', 10),
  },
  premium: {
    dailyPosts: parseInt(process.env.TIER_PREMIUM_DAILY_POSTS ?? '20', 10),
    dailyComments: parseInt(process.env.TIER_PREMIUM_DAILY_COMMENTS ?? '500', 10),
    dailyLikes: parseInt(process.env.TIER_PREMIUM_DAILY_LIKES ?? '1000', 10),
  },
  black: {
    dailyPosts: parseInt(process.env.TIER_BLACK_DAILY_POSTS ?? '50', 10),
    dailyComments: parseInt(process.env.TIER_BLACK_DAILY_COMMENTS ?? '750', 10),
    dailyLikes: parseInt(process.env.TIER_BLACK_DAILY_LIKES ?? '1500', 10),
  },
  admin: {
    // Admins have effectively unlimited (very high) limits
    dailyPosts: 10000,
    dailyComments: 10000,
    dailyLikes: 10000,
  },
};

/**
 * Default tier for users without an explicit tier claim
 */
export const DEFAULT_TIER: UserTier = 'free';

// ─────────────────────────────────────────────────────────────────────────────
// Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize tier string to valid UserTier
 * Returns DEFAULT_TIER for unknown/missing values
 */
export function normalizeTier(tier: string | undefined | null): UserTier {
  if (!tier) {
    return DEFAULT_TIER;
  }

  const normalized = tier.toLowerCase().trim();

  // Handle legacy tier names
  if (normalized === 'freemium') {
    return 'free';
  }

  // Legacy mobile tier names mapped to new limits
  if (['bronze', 'herald', 'iron'].includes(normalized)) {
    return 'free';
  }

  if (['silver', 'gold', 'platinum'].includes(normalized)) {
    return 'premium';
  }

  if (['free', 'premium', 'black', 'admin'].includes(normalized)) {
    return normalized as UserTier;
  }

  return DEFAULT_TIER;
}

/**
 * Get limits for a given tier
 */
export function getLimitsForTier(tier: UserTier): TierLimits {
  return TIER_LIMITS[tier] ?? TIER_LIMITS[DEFAULT_TIER];
}

/**
 * Get the daily post limit for a user tier
 */
export function getDailyPostLimit(tier: string | undefined | null): number {
  const normalizedTier = normalizeTier(tier);
  return TIER_LIMITS[normalizedTier].dailyPosts;
}

/**
 * Get the daily comment limit for a user tier
 */
export function getDailyCommentLimit(tier: string | undefined | null): number {
  const normalizedTier = normalizeTier(tier);
  return TIER_LIMITS[normalizedTier].dailyComments;
}

/**
 * Get the daily like limit for a user tier
 */
export function getDailyLikeLimit(tier: string | undefined | null): number {
  const normalizedTier = normalizeTier(tier);
  return TIER_LIMITS[normalizedTier].dailyLikes;
}
