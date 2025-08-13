/**
 * ASORA PLATFORM POLICY CONFIGURATION
 * 
 * Global policy constants for Asora moderation and AI detection.
 * This file codifies the platform rules and should remain static 
 * unless overridden by moderationConfig.ts at runtime.
 * 
 * PLATFORM CONTEXT:
 * Social network prioritizing authentic, human-created content
 * Stack: Azure Functions + TypeScript + Cosmos DB + Hive AI
 */

/**
 * Content length limits across the platform
 */
export const CHARACTER_LIMITS = {
  post: 2000,           // Maximum characters for posts
  comment: 600,         // Maximum characters for comments  
  aiDetectionThreshold: 250, // Minimum length before AI analysis
} as const;

/**
 * AI moderation score thresholds for automated content decisions
 * Used by Hive AI integration in post/create.ts
 */
export const AI_SCORE_THRESHOLDS = {
  safe: 0.3,         // < 0.3 = visible, reputation allowed
  warned: 0.7,       // 0.3–0.7 = visible with warning label
  blocked: 1.0       // > 0.7 = reject content
} as const;

/**
 * Human moderation and community appeals system
 */
export const MODERATION_SCORE_THRESHOLDS = {
  autoHide: 0.9,              // Score threshold for automatic hiding
  appealWindowDays: 7,        // Days users have to appeal decisions
  reviewWindowMinutes: 5,     // Time limit for live community review
  voteThresholdPercent: 60,   // Percentage of upvotes needed to overturn moderation
} as const;

/**
 * User tier system with posting limits and features
 * Matches the implementation in functions/post/create.ts
 */
export const USER_TIERS = {
  Free: {
    dailyPostLimit: 10,       // 10 posts per day for free users
    priorityProcessing: false
  },
  Premium: {
    dailyPostLimit: 100,      // 100 posts per day for premium users
    priorityProcessing: true
  },
  Enterprise: {
    dailyPostLimit: Infinity, // Unlimited posting for enterprise
    priorityProcessing: true,
    customModerationRules: true
  }
} as const;

/**
 * Content categories monitored by AI moderation
 * Used with Hive AI for comprehensive content analysis
 */
export const DEFAULT_MODERATION_CATEGORIES = [
  "nudity",
  "violence", 
  "hate",
  "self_harm",
  "sexual_activity",
  "graphic",
  "spam"
] as const;

/**
 * Moderation transparency and user control settings
 */
export const MODERATION_VISIBILITY = {
  showScorecardIfFlagged: true,    // Show AI scores when content is flagged
  alwaysShowIfOptedIn: true,       // Show scores for users who opt-in
  showOnRequest: true              // Allow users to request score visibility
} as const;

/**
 * Community-driven appeal and review system
 */
export const APPEAL_FEED = {
  enabled: true,                   // Enable community appeals
  liveReviewMinutes: 5,           // Time window for live community review
  voteThreshold: 60               // Percentage needed to overturn moderation decision
} as const;

/**
 * Helper function to get posting limit by tier
 */
export function getDailyPostLimit(tier: keyof typeof USER_TIERS): number {
  return USER_TIERS[tier]?.dailyPostLimit || USER_TIERS.Free.dailyPostLimit;
}

/**
 * Helper function to determine content visibility based on AI score
 */
export function getContentVisibility(aiScore: number): 'public' | 'warned' | 'blocked' {
  if (aiScore >= AI_SCORE_THRESHOLDS.blocked) return 'blocked';
  if (aiScore >= AI_SCORE_THRESHOLDS.safe) return 'warned';
  return 'public';
}


