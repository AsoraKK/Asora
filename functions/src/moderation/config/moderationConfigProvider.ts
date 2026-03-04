/**
 * Moderation Configuration Provider
 * 
 * Loads moderation thresholds and settings from admin_config table.
 * Implements caching with configurable TTL to balance freshness vs performance.
 * 
 * This bridges the Admin API (Task 5) with the moderation runtime (Task 5.10).
 */

import { getPool } from '@shared/clients/postgres';
import { trackAppEvent } from '@shared/appInsights';

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
  hiveAutoFlagThreshold: number;
  hiveAutoRemoveThreshold: number;
  
  // Feature flags
  enableAutoModeration: boolean;
}

/**
 * Configuration envelope with metadata
 * Returned by getModerationConfigWithVersion for decision logging
 */
export interface ModerationConfigEnvelope {
  config: ModerationConfig;
  version: number;
  updatedAt: string | null;
  fetchedAt: number;
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
  updatedAt: string | null;
}

// In-memory cache
let cache: CacheEntry | null = null;

// Default TTL: 30 seconds (balance between freshness and DB load)
const CACHE_TTL_MS = parseInt(process.env.MODERATION_CONFIG_CACHE_TTL_MS || '30000', 10);

// Stale cache grace period: TTL * 5 (allow stale cache on failure)
const STALE_CACHE_GRACE_MS = CACHE_TTL_MS * 5;

/**
 * Get moderation configuration envelope with version info
 * 
 * Use this method when logging decisions to include config version.
 * 
 * @param forceRefresh - Bypass cache and fetch fresh config
 * @returns Configuration envelope with version and timing metadata
 */
export async function getModerationConfigWithVersion(
  forceRefresh = false
): Promise<ModerationConfigEnvelope> {
  const now = Date.now();
  
  // Return cached value if valid
  if (!forceRefresh && cache && (now - cache.cachedAt) < CACHE_TTL_MS) {
    trackAppEvent({
      name: 'moderation.config.cache_hit',
      properties: {
        version: cache.version.toString(),
        ageMs: (now - cache.cachedAt).toString(),
      },
    });
    
    return {
      config: cache.config,
      version: cache.version,
      updatedAt: cache.updatedAt,
      fetchedAt: cache.cachedAt,
    };
  }
  
  const isRefresh = cache !== null;
  
  try {
    const pool = getPool();
    
    const result = await pool.query<{ 
      version: number; 
      updated_at: Date;
      payload_json: Record<string, unknown>;
    }>(
      'SELECT version, updated_at, payload_json FROM admin_config WHERE id = 1'
    );
    
    let config: ModerationConfig;
    let version: number;
    let updatedAt: string | null;
    
    if (result.rows.length === 0) {
      // No config set, use defaults
      config = DEFAULT_MODERATION_CONFIG;
      version = 0;
      updatedAt = null;
    } else {
      const row = result.rows[0]!;
      const payload = row.payload_json;
      
      // Extract moderation config from payload, merge with defaults
      const moderationPayload = (payload.moderation as Partial<ModerationConfig>) || {};
      
      config = {
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
      
      version = row.version;
      updatedAt = row.updated_at.toISOString();
    }
    
    // Update cache
    cache = {
      config,
      cachedAt: now,
      version,
      updatedAt,
    };
    
    trackAppEvent({
      name: isRefresh ? 'moderation.config.cache_refresh' : 'moderation.config.cache_miss',
      properties: {
        version: version.toString(),
      },
    });
    
    return {
      config,
      version,
      updatedAt,
      fetchedAt: now,
    };
  } catch (error) {
    // On error, return cached value if available and not too stale
    if (cache && (now - cache.cachedAt) < STALE_CACHE_GRACE_MS) {
      trackAppEvent({
        name: 'moderation.config.stale_cache_used',
        properties: {
          version: cache.version.toString(),
          ageMs: (now - cache.cachedAt).toString(),
          error: (error as Error).message,
        },
      });
      
      console.warn(
        `[moderationConfig] Using stale cache (age: ${now - cache.cachedAt}ms) due to error: ${(error as Error).message}`
      );
      
      return {
        config: cache.config,
        version: cache.version,
        updatedAt: cache.updatedAt,
        fetchedAt: cache.cachedAt,
      };
    }
    
    // No valid cache, use defaults (fail closed)
    trackAppEvent({
      name: 'moderation.config.fallback_to_defaults',
      properties: {
        error: (error as Error).message,
        hadCache: String(cache !== null),
      },
    });
    
    console.warn(
      `[moderationConfig] Falling back to defaults due to error: ${(error as Error).message}`
    );
    
    return {
      config: DEFAULT_MODERATION_CONFIG,
      version: 0,
      updatedAt: null,
      fetchedAt: now,
    };
  }
}

/**
 * Get a specific threshold value
 * Convenience method for common use cases
 */
export async function getFlagAutoHideThreshold(): Promise<number> {
  const { config } = await getModerationConfigWithVersion();
  return config.flagAutoHideThreshold;
}

/**
 * Get moderation configuration (convenience wrapper)
 * For backwards compatibility - prefer getModerationConfigWithVersion for decision logging
 */
export async function getModerationConfig(forceRefresh = false): Promise<ModerationConfig> {
  const { config } = await getModerationConfigWithVersion(forceRefresh);
  return config;
}

/**
 * Get reason priority score
 */
export async function getReasonPriorityScore(reason: string): Promise<number> {
  const { config } = await getModerationConfigWithVersion();
  return config.reasonPriorityScores[reason] ?? config.reasonPriorityScores['other'] ?? 2;
}

/**
 * Get urgency multiplier
 */
export async function getUrgencyMultiplier(urgency: string): Promise<number> {
  const { config } = await getModerationConfigWithVersion();
  return config.urgencyMultipliers[urgency] ?? 1;
}

/**
 * Check if auto-moderation is enabled
 */
export async function isAutoModerationEnabled(): Promise<boolean> {
  const { config } = await getModerationConfigWithVersion();
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
