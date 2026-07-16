/**
 * Tier Limits Configuration
 *
 * Defines per-tier daily limits for various actions.
 * Tiers are stored in user's JWT token as the `tier` claim.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type UserTier = 'free' | 'premium' | 'black';
export type NewsBoardAccessLevel = 'preview' | 'full';
export type RewardChoiceBreadth = 'limited' | 'increased' | 'full';

export interface TierLimits {
  /** Maximum posts per day */
  dailyPosts: number;
  /** Maximum comments per day */
  dailyComments: number;
  /** Maximum likes per day */
  dailyLikes: number;
  /** Maximum reactions per day (canonical name; dailyLikes is the legacy alias) */
  dailyReactions: number;
  /** Maximum appeals per day */
  dailyAppeals: number;
  /** Minimum cooldown between exports, in days */
  exportCooldownDays: number;
  /** Maximum media file size in MB */
  maxMediaSizeMB: number;
  /** Maximum media attachments per post */
  maxMediaPerPost: number;
  /** Maximum custom feeds the user can create */
  maxCustomFeeds: number;
  /** News Board access level. Free is preview-only; paid tiers receive the full board. */
  newsBoardAccessLevel: NewsBoardAccessLevel;
  /** Whether a News Board preview is available */
  newsBoardPreview: boolean;
  /** Whether normal posting is product-limited beyond abuse controls */
  postingRestricted: boolean;
  /** Highest reputation reward level available to this tier */
  rewardLevelCap: number;
  /** Reward options per level; null means all eligible rewards */
  rewardOptionsPerLevel: number | null;
  /** Plain categorical reward-choice entitlement */
  rewardChoiceBreadth: RewardChoiceBreadth;
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-tier limits serve as the single source of truth for entitlements.
 * Increasing any of these values weakens tier separation and should be approved via a product + security review.
 */
export const TIER_LIMITS: Record<UserTier, TierLimits> = {
  free: {
    dailyPosts: parseInt(process.env.TIER_FREE_DAILY_POSTS ?? '5', 10),
    dailyComments: parseInt(process.env.TIER_FREE_DAILY_COMMENTS ?? '20', 10),
    dailyLikes: parseInt(process.env.TIER_FREE_DAILY_LIKES ?? '100', 10),
    dailyReactions: parseInt(process.env.TIER_FREE_DAILY_LIKES ?? '100', 10),
    dailyAppeals: parseInt(process.env.TIER_FREE_DAILY_APPEALS ?? '1', 10),
    exportCooldownDays: parseInt(process.env.TIER_FREE_EXPORT_COOLDOWN_DAYS ?? '30', 10),
    maxMediaSizeMB: 10,
    maxMediaPerPost: 1,
    maxCustomFeeds: 1,
    newsBoardAccessLevel: 'preview',
    newsBoardPreview: true,
    postingRestricted: true,
    rewardLevelCap: 3,
    rewardOptionsPerLevel: 1,
    rewardChoiceBreadth: 'limited',
  },
  premium: {
    dailyPosts: parseInt(process.env.TIER_PREMIUM_DAILY_POSTS ?? '20', 10),
    dailyComments: parseInt(process.env.TIER_PREMIUM_DAILY_COMMENTS ?? '100', 10),
    dailyLikes: parseInt(process.env.TIER_PREMIUM_DAILY_LIKES ?? '1000', 10),
    dailyReactions: parseInt(process.env.TIER_PREMIUM_DAILY_LIKES ?? '1000', 10),
    dailyAppeals: parseInt(process.env.TIER_PREMIUM_DAILY_APPEALS ?? '3', 10),
    exportCooldownDays: parseInt(process.env.TIER_PREMIUM_EXPORT_COOLDOWN_DAYS ?? '7', 10),
    maxMediaSizeMB: 25,
    maxMediaPerPost: 4,
    maxCustomFeeds: 2,
    newsBoardAccessLevel: 'full',
    newsBoardPreview: true,
    postingRestricted: false,
    rewardLevelCap: 5,
    rewardOptionsPerLevel: 1,
    rewardChoiceBreadth: 'increased',
  },
  black: {
    dailyPosts: parseInt(process.env.TIER_BLACK_DAILY_POSTS ?? '50', 10),
    dailyComments: parseInt(process.env.TIER_BLACK_DAILY_COMMENTS ?? '300', 10),
    dailyLikes: parseInt(process.env.TIER_BLACK_DAILY_LIKES ?? '1500', 10),
    dailyReactions: parseInt(process.env.TIER_BLACK_DAILY_LIKES ?? '1500', 10),
    dailyAppeals: parseInt(process.env.TIER_BLACK_DAILY_APPEALS ?? '10', 10),
    exportCooldownDays: parseInt(process.env.TIER_BLACK_EXPORT_COOLDOWN_DAYS ?? '1', 10),
    maxMediaSizeMB: 25,
    maxMediaPerPost: 5,
    maxCustomFeeds: 3,
    newsBoardAccessLevel: 'full',
    newsBoardPreview: true,
    postingRestricted: false,
    rewardLevelCap: 5,
    rewardOptionsPerLevel: null,
    rewardChoiceBreadth: 'full',
  },
};

/**
 * The tier defaults above define entitlements for posting, custom feeds, News Board access, rewards, and export cooldown intervals.
 */

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

  // `admin` is an internal role, never a commercial tier. Legacy tier claims
  // fail safely to Free; authorization continues to use roles.
  if (normalized === 'admin') {
    return 'free';
  }

  if (['free', 'premium', 'black'].includes(normalized)) {
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

export function getDailyReactionLimit(tier: string | undefined | null): number {
  const normalizedTier = normalizeTier(tier);
  return TIER_LIMITS[normalizedTier].dailyReactions;
}

/**
 * Get the daily appeal limit for a user tier
 */
export function getDailyAppealLimit(tier: string | undefined | null): number {
  const normalizedTier = normalizeTier(tier);
  return TIER_LIMITS[normalizedTier].dailyAppeals;
}

/**
 * Get the export cooldown interval in days for a tier
 */
export function getExportCooldownDays(tier: string | undefined | null): number {
  const normalizedTier = normalizeTier(tier);
  return TIER_LIMITS[normalizedTier].exportCooldownDays;
}

/**
 * Get the maximum media file size in MB for a tier
 */
export function getMaxMediaSizeMB(tier: string | undefined | null): number {
  const normalizedTier = normalizeTier(tier);
  return TIER_LIMITS[normalizedTier].maxMediaSizeMB;
}

/**
 * Get the maximum number of media attachments per post for a tier
 */
export function getMaxMediaPerPost(tier: string | undefined | null): number {
  const normalizedTier = normalizeTier(tier);
  return TIER_LIMITS[normalizedTier].maxMediaPerPost;
}

/**
 * Get the maximum number of custom feeds for a tier
 */
export function getMaxCustomFeeds(tier: string | undefined | null): number {
  const normalizedTier = normalizeTier(tier);
  return TIER_LIMITS[normalizedTier].maxCustomFeeds;
}

/**
 * News Board access level for the tier.
 */
export function getNewsBoardAccessLevel(
  tier: string | undefined | null
): NewsBoardAccessLevel {
  const normalizedTier = normalizeTier(tier);
  return TIER_LIMITS[normalizedTier].newsBoardAccessLevel;
}

export function hasFullNewsBoardAccess(tier: string | undefined | null): boolean {
  return getNewsBoardAccessLevel(tier) === 'full';
}

export function hasNewsBoardPreview(tier: string | undefined | null): boolean {
  const normalizedTier = normalizeTier(tier);
  return TIER_LIMITS[normalizedTier].newsBoardPreview;
}
