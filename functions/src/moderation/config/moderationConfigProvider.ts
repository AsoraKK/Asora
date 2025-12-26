/**
 * Moderation Configuration Provider
 * 
 * Loads moderation thresholds and settings from admin_config table.
 * Implements caching with configurable TTL to balance freshness vs performance.
 * 
 * This bridges the Admin API (Task 5) with the moderation runtime (Task 5.10).
 */

import { getPool } from '@shared/clients/postgres';

/**
 * Moderation configuration schema
 * Define the expected fields for moderation settings
 */
export interface ModerationConfig {
  // Flag thresholds
  flagAutoHideThreshold: number;
  
  // Reason priority scores (higher = more urgent)
  reasonPriorityScores: Record<string, number>;
  
  // Urgency multipliers
  urgencyMultipliers: Record<string, number>;
  
  // Appeal settings
  appealRequiredVotes: number;
  
  // AI moderation thresholds
  hiveAutoFlagThreshold?: number;
  hiveAutoRemoveThreshold?: number;
  
  // Feature flags
  enableAutoModeration: boolean;
}

/**
 * Default moderation configuration
 * Used when no config is set or as fallback values
 */
const DEFAULT_MODERATION_CONFIG: ModerationConfig = {
  flagAutoHideThreshold: 5,
  reasonPriorityScores: {
    violence: 10,
    hate_speech: 9,
    harassment: 8,
    adult_content: 7,
    misinformation: 6,
    spam: 5,
    privacy: 4,
    copyright: 3,
    other: 2,
  },
  urgencyMultipliers: {
    high: 2,
    medium: 1.5,
    low: 1,
  },
  appealRequiredVotes: 5,
  hiveAutoFlagThreshold: 0.8,
  hiveAutoRemoveThreshold: 0.95,
  enableAutoModeration: true,
};

/**
 * Cache entry with timestamp
 */
interface CacheEntry {
  config: ModerationConfig;
  cachedAt: number;
  version: number;
}

// In-memory cache
let cache: CacheEntry | null = null;

// Default TTL: 60 seconds (balance between freshness and DB load)
const CACHE_TTL_MS = parseInt(process.env.MODERATION_CONFIG_CACHE_TTL_MS || '60000', 10);

/**
 * Get moderation configuration
 * 
 * Reads from admin_config table with caching.
 * Falls back to defaults if config is not set or on error.
 * 
 * @param forceRefresh - Bypass cache and fetch fresh config
 * @returns Moderation configuration
 */
export async function getModerationConfig(forceRefresh = false): Promise<ModerationConfig> {
  const now = Date.now();
  
  // Return cached value if valid
  if (!forceRefresh && cache && (now - cache.cachedAt) < CACHE_TTL_MS) {
    return cache.config;
  }
  
  try {
    const pool = getPool();
    
    const result = await pool.query<{ version: number; payload_json: Record<string, unknown> }>(
      'SELECT version, payload_json FROM admin_config WHERE id = 1'
    );
    
    if (result.rows.length === 0) {
      // No config set, use defaults
      cache = {
        config: DEFAULT_MODERATION_CONFIG,
        cachedAt: now,
        version: 0,
      };
      return DEFAULT_MODERATION_CONFIG;
    }
    
    const row = result.rows[0]!;
    const payload = row.payload_json;
    
    // Extract moderation config from payload, merge with defaults
    const moderationPayload = (payload.moderation as Partial<ModerationConfig>) || {};
    
    const config: ModerationConfig = {
      flagAutoHideThreshold: 
        typeof moderationPayload.flagAutoHideThreshold === 'number' 
          ? moderationPayload.flagAutoHideThreshold 
          : DEFAULT_MODERATION_CONFIG.flagAutoHideThreshold,
      
      reasonPriorityScores: {
        ...DEFAULT_MODERATION_CONFIG.reasonPriorityScores,
        ...(moderationPayload.reasonPriorityScores || {}),
      },
      
      urgencyMultipliers: {
        ...DEFAULT_MODERATION_CONFIG.urgencyMultipliers,
        ...(moderationPayload.urgencyMultipliers || {}),
      },
      
      appealRequiredVotes:
        typeof moderationPayload.appealRequiredVotes === 'number'
          ? moderationPayload.appealRequiredVotes
          : DEFAULT_MODERATION_CONFIG.appealRequiredVotes,
      
      hiveAutoFlagThreshold:
        typeof moderationPayload.hiveAutoFlagThreshold === 'number'
          ? moderationPayload.hiveAutoFlagThreshold
          : DEFAULT_MODERATION_CONFIG.hiveAutoFlagThreshold,
      
      hiveAutoRemoveThreshold:
        typeof moderationPayload.hiveAutoRemoveThreshold === 'number'
          ? moderationPayload.hiveAutoRemoveThreshold
          : DEFAULT_MODERATION_CONFIG.hiveAutoRemoveThreshold,
      
      enableAutoModeration:
        typeof moderationPayload.enableAutoModeration === 'boolean'
          ? moderationPayload.enableAutoModeration
          : DEFAULT_MODERATION_CONFIG.enableAutoModeration,
    };
    
    // Update cache
    cache = {
      config,
      cachedAt: now,
      version: row.version,
    };
    
    return config;
  } catch (error) {
    // On error, return cached value if available, otherwise defaults
    if (cache) {
      return cache.config;
    }
    return DEFAULT_MODERATION_CONFIG;
  }
}

/**
 * Get a specific threshold value
 * Convenience method for common use cases
 */
export async function getFlagAutoHideThreshold(): Promise<number> {
  const config = await getModerationConfig();
  return config.flagAutoHideThreshold;
}

/**
 * Get reason priority score
 */
export async function getReasonPriorityScore(reason: string): Promise<number> {
  const config = await getModerationConfig();
  return config.reasonPriorityScores[reason] ?? config.reasonPriorityScores['other'] ?? 2;
}

/**
 * Get urgency multiplier
 */
export async function getUrgencyMultiplier(urgency: string): Promise<number> {
  const config = await getModerationConfig();
  return config.urgencyMultipliers[urgency] ?? 1;
}

/**
 * Check if auto-moderation is enabled
 */
export async function isAutoModerationEnabled(): Promise<boolean> {
  const config = await getModerationConfig();
  return config.enableAutoModeration;
}

/**
 * Invalidate cache (call after config update)
 */
export function invalidateModerationConfigCache(): void {
  cache = null;
}

/**
 * Get current cache info (for debugging/monitoring)
 */
export function getCacheInfo(): { 
  isCached: boolean; 
  version?: number; 
  ageMs?: number;
  ttlMs: number;
} {
  if (!cache) {
    return { isCached: false, ttlMs: CACHE_TTL_MS };
  }
  
  return {
    isCached: true,
    version: cache.version,
    ageMs: Date.now() - cache.cachedAt,
    ttlMs: CACHE_TTL_MS,
  };
}
