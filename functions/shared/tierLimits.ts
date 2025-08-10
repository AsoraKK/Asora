/**
 * Centralized tier-based limits for Asora platform
 * 
 * This module centralizes all tier-based policy limits to allow
 * future admin control via configuration dashboard.
 */

export interface TierLimits {
  dailyPostLimit: number;
  attachmentLimit: number;
  hourlyRateLimit?: number;
  maxTextLength?: number;
}

export type UserTier = 'Free' | 'Black' | 'Premium' | 'Enterprise';

// Default tier limits - will be moved to dynamic config in future
const DEFAULT_TIER_LIMITS: Record<UserTier, TierLimits> = {
  Free: {
    dailyPostLimit: 10,
    attachmentLimit: 1, // max 1 image
    hourlyRateLimit: 50,
    maxTextLength: 500
  },
  Black: {
    dailyPostLimit: 50,
    attachmentLimit: 3, // max 3 images
    hourlyRateLimit: 200,
    maxTextLength: 1000
  },
  Premium: {
    dailyPostLimit: 100,
    attachmentLimit: 5,
    hourlyRateLimit: 500,
    maxTextLength: 2000
  },
  Enterprise: {
    dailyPostLimit: Infinity,
    attachmentLimit: 10,
    hourlyRateLimit: 1000,
    maxTextLength: 5000
  }
};

/**
 * Get the maximum number of attachments allowed for a user tier
 */
export function getAttachmentLimit(tier: UserTier | string): number {
  const normalizedTier = (tier || 'Free') as UserTier;
  return DEFAULT_TIER_LIMITS[normalizedTier]?.attachmentLimit || DEFAULT_TIER_LIMITS.Free.attachmentLimit;
}

/**
 * Get the daily post limit for a user tier
 */
export function getDailyPostLimit(tier: UserTier | string): number {
  const normalizedTier = (tier || 'Free') as UserTier;
  return DEFAULT_TIER_LIMITS[normalizedTier]?.dailyPostLimit || DEFAULT_TIER_LIMITS.Free.dailyPostLimit;
}

/**
 * Get all limits for a user tier
 */
export function getTierLimits(tier: UserTier | string): TierLimits {
  const normalizedTier = (tier || 'Free') as UserTier;
  return DEFAULT_TIER_LIMITS[normalizedTier] || DEFAULT_TIER_LIMITS.Free;
}

/**
 * Validate if attachment count is within tier limits
 */
export function validateAttachmentCount(tier: UserTier | string, attachmentCount: number): {
  valid: boolean;
  allowed: number;
  exceeded: number;
} {
  const allowed = getAttachmentLimit(tier);
  const valid = attachmentCount <= allowed;
  const exceeded = Math.max(0, attachmentCount - allowed);
  
  return { valid, allowed, exceeded };
}
