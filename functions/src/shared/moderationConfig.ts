/**
 * ASORA PLATFORM CONTEXT
 *
 * Real-time moderation configuration override system
 * Used by AI moderation, appeal logic, and admin dashboard tools.
 *
 * If no override is found in the Cosmos DB "moderationConfig" document,
 * fallback to policy.ts defaults.
 *
 * Supports:
 * - Category thresholds (e.g. nudity: 0.3, violence: 0.2)
 * - Score visibility toggles
 * - Appeal window and voting thresholds
 * - AI generation detection rules
 *
 * CACHE: Loaded once and cached for 5 minutes to minimize Cosmos calls.
 *
 * Dependencies:
 * - CosmosClient from shared/cosmosClient
 * - policy.ts fallback constants
 */

import { CHARACTER_LIMITS, AI_SCORE_THRESHOLDS, MODERATION_SCORE_THRESHOLDS, MODERATION_VISIBILITY, DEFAULT_MODERATION_CATEGORIES } from './policy';
import { getContainer } from './cosmosClient';

let cachedConfig: any = null;
let lastFetchTime = 0;

/**
 * Dynamic moderation configuration interface
 */
export interface ModerationConfig {
  thresholds: {
    safe: number;
    warned: number;
    blocked: number;
  };
  visibility: {
    showScorecardIfFlagged: boolean;
    alwaysShowIfOptedIn: boolean;
    showOnRequest: boolean;
  };
  appeal: {
    autoHide: number;
    appealWindowDays: number;
    reviewWindowMinutes: number;
    voteThresholdPercent: number;
  };
  charLimits: {
    post: number;
    comment: number;
    aiDetectionThreshold: number;
  };
  categories: readonly string[];
  categoryThresholds?: {
    [category: string]: number;
  };
}

/**
 * Fetch moderation configuration with 5-minute caching
 * Falls back to policy.ts defaults if Cosmos DB is unreachable
 */
export async function getModerationConfig(): Promise<ModerationConfig> {
  const now = Date.now();
  
  // Return cached config if within 5-minute window
  if (cachedConfig && now - lastFetchTime < 5 * 60 * 1000) {
    return cachedConfig;
  }

  try {
    const container = getContainer('config');
    const { resource } = await container.item('moderation', 'moderation').read();
    
    if (resource) {
      // Validate and merge with defaults
      const config: ModerationConfig = {
        thresholds: resource.thresholds || AI_SCORE_THRESHOLDS,
        visibility: resource.visibility || MODERATION_VISIBILITY,
        appeal: resource.appeal || MODERATION_SCORE_THRESHOLDS,
        charLimits: resource.charLimits || CHARACTER_LIMITS,
        categories: resource.categories || DEFAULT_MODERATION_CATEGORIES,
        categoryThresholds: resource.categoryThresholds || {}
      };
      
      cachedConfig = config;
      lastFetchTime = now;
      console.log('✅ Moderation config loaded from Cosmos DB');
      return config;
    }
  } catch (err) {
    console.warn('[moderationConfig] Cosmos DB unavailable, fallback to static policy.ts:', err);
  }

  // Fallback to static policy configuration
  const fallbackConfig: ModerationConfig = {
    thresholds: AI_SCORE_THRESHOLDS,
    visibility: MODERATION_VISIBILITY,
    appeal: MODERATION_SCORE_THRESHOLDS,
    charLimits: CHARACTER_LIMITS,
    categories: DEFAULT_MODERATION_CATEGORIES
  };

  cachedConfig = fallbackConfig;
  lastFetchTime = now;
  console.log('📋 Using fallback moderation config from policy.ts');
  return fallbackConfig;
}

/**
 * Get content visibility based on dynamic thresholds
 */
export async function getDynamicContentVisibility(aiScore: number): Promise<'public' | 'warned' | 'blocked'> {
  const config = await getModerationConfig();
  
  if (aiScore >= config.thresholds.blocked) return 'blocked';
  if (aiScore >= config.thresholds.safe) return 'warned';
  return 'public';
}

/**
 * Check if AI moderation should run based on dynamic settings
 */
export async function shouldRunDynamicAIDetection(contentLength: number): Promise<boolean> {
  const config = await getModerationConfig();
  return contentLength >= config.charLimits.aiDetectionThreshold;
}

/**
 * Get category-specific threshold if configured
 */
export async function getCategoryThreshold(category: string): Promise<number | null> {
  const config = await getModerationConfig();
  return config.categoryThresholds?.[category] || null;
}


