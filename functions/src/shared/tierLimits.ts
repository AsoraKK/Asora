/**
 * Centralized tier-based limits for Asora platform
 * 
 * This module centralizes all tier-based policy limits to allow
 * future admin control via configuration dashboard.
 * 
 * IMPORTANT: This module now integrates with configService.ts for
 * dynamic configuration. Future admin dashboard will control these
 * limits via database configuration.
 */

import { getConfigurableDailyPostLimit, getConfigurableAttachmentLimit } from './configService';

export interface TierLimits {
  dailyPostLimit: number;
  attachmentLimit: number;
  hourlyRateLimit?: number;
  maxTextLength?: number;
}

export type UserTier = 'Free' | 'Black' | 'Premium' | 'Enterprise';

// Legacy static defaults - kept for backward compatibility and testing
// TODO: Phase out these defaults once configService is fully integrated
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
 * 
 * This now uses configurable limits from the database when available.
 * Falls back to static defaults for backward compatibility.
 */
export function getAttachmentLimit(tier: UserTier | string): number {
  const normalizedTier = (tier || 'Free') as UserTier;
  return DEFAULT_TIER_LIMITS[normalizedTier]?.attachmentLimit || DEFAULT_TIER_LIMITS.Free.attachmentLimit;
}

/**
 * Async version that uses configurable limits from database
 * TODO: Replace getAttachmentLimit() with this once all callers are updated
 */
export async function getAttachmentLimitAsync(tier: UserTier | string): Promise<number> {
  return await getConfigurableAttachmentLimit(tier);
}

/**
 * Get the daily post limit for a user tier
 * 
 * This still uses static defaults for backward compatibility.
 * Use getDailyPostLimitAsync() for configurable limits.
 */
export function getDailyPostLimit(tier: UserTier | string): number {
  const normalizedTier = (tier || 'Free') as UserTier;
  return DEFAULT_TIER_LIMITS[normalizedTier]?.dailyPostLimit || DEFAULT_TIER_LIMITS.Free.dailyPostLimit;
}

/**
 * Async version that uses configurable limits from database
 * TODO: Replace getDailyPostLimit() with this once all callers are updated
 */
export async function getDailyPostLimitAsync(tier: UserTier | string): Promise<number> {
  return await getConfigurableDailyPostLimit(tier);
}

/**
 * Get all limits for a user tier (static version)
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

/**
 * Async version for future use with configurable limits
 * TODO: Use this in post/create.ts once admin dashboard is implemented
 */
export async function validateAttachmentCountAsync(tier: UserTier | string, attachmentCount: number): Promise<{
  valid: boolean;
  allowed: number;
  exceeded: number;
}> {
  const allowed = await getAttachmentLimitAsync(tier);
  const valid = attachmentCount <= allowed;
  const exceeded = Math.max(0, attachmentCount - allowed);
  
  return { valid, allowed, exceeded };
}
