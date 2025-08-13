/**
 * Configuration service for tier policies and platform settings
 * 
 * This service provides centralized access to tier policies that can be
 * dynamically updated via a Master Admin Dashboard in the future.
 * 
 * Current implementation uses fallback defaults, but infrastructure is
 * prepared for database-driven configuration.
 */

import { getContainer } from './cosmosClient';
import { UserTier, TierLimits } from './tierLimits';

interface TierPolicyConfig {
  dailyPostLimitByTier: Record<UserTier, number>;
  attachmentLimitByTier: Record<UserTier, number>;
  hourlyRateLimitByTier?: Record<UserTier, number>;
  maxTextLengthByTier?: Record<UserTier, number>;
  lastUpdated: string;
  updatedBy?: string;
  version: number;
}

// Cache for configuration to avoid repeated database calls
let configCache: TierPolicyConfig | null = null;
let configCacheExpiry: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Default fallback configuration
const DEFAULT_CONFIG: TierPolicyConfig = {
  dailyPostLimitByTier: {
    Free: 10,
    Black: 50,
    Premium: 100,
    Enterprise: Infinity
  },
  attachmentLimitByTier: {
    Free: 1,
    Black: 3,
    Premium: 5,
    Enterprise: 10
  },
  hourlyRateLimitByTier: {
    Free: 50,
    Black: 200,
    Premium: 500,
    Enterprise: 1000
  },
  maxTextLengthByTier: {
    Free: 500,
    Black: 1000,
    Premium: 2000,
    Enterprise: 5000
  },
  lastUpdated: '2024-01-01T00:00:00.000Z',
  version: 1
};

/**
 * Retrieves tier policy configuration from database or cache
 * 
 * TODO: Wire this to Master Admin Dashboard APIs for dynamic updates
 * TODO: Add audit logging for configuration changes
 * TODO: Implement configuration validation and rollback capabilities
 */
export async function getTierPolicy(): Promise<TierPolicyConfig> {
  const now = Date.now();
  
  // Return cached config if still valid
  if (configCache && now < configCacheExpiry) {
    return configCache;
  }
  
  try {
    // TODO: Uncomment when config container is available in Cosmos DB
    // const configContainer = getContainer('config');
    // const querySpec = {
    //   query: "SELECT * FROM c WHERE c.id = @id",
    //   parameters: [{ name: "@id", value: "config:tiers" }]
    // };
    // 
    // const { resources } = await configContainer.items.query<TierPolicyConfig>(querySpec).fetchAll();
    // 
    // if (resources.length > 0) {
    //   configCache = resources[0];
    //   configCacheExpiry = now + CACHE_TTL_MS;
    //   console.log(`Loaded tier policy config v${configCache.version} from database`);
    //   return configCache;
    // }
    
    // For now, use fallback defaults
    console.log('Using fallback tier policy configuration (database config not available)');
    configCache = DEFAULT_CONFIG;
    configCacheExpiry = now + CACHE_TTL_MS;
    return configCache;
    
  } catch (error) {
    console.error('Failed to load tier policy configuration:', error);
    console.log('Falling back to default configuration');
    return DEFAULT_CONFIG;
  }
}

/**
 * Get daily post limit for a specific tier from configuration
 * 
 * This will eventually be controlled by Master Admin Dashboard
 */
export async function getConfigurableDailyPostLimit(tier: UserTier | string): Promise<number> {
  const config = await getTierPolicy();
  const normalizedTier = (tier || 'Free') as UserTier;
  return config.dailyPostLimitByTier[normalizedTier] || config.dailyPostLimitByTier.Free;
}

/**
 * Get attachment limit for a specific tier from configuration
 * 
 * This will eventually be controlled by Master Admin Dashboard
 */
export async function getConfigurableAttachmentLimit(tier: UserTier | string): Promise<number> {
  const config = await getTierPolicy();
  const normalizedTier = (tier || 'Free') as UserTier;
  return config.attachmentLimitByTier[normalizedTier] || config.attachmentLimitByTier.Free;
}

/**
 * Clear configuration cache (for testing or after admin updates)
 */
export function clearTierPolicyCache(): void {
  configCache = null;
  configCacheExpiry = 0;
}

/**
 * TODO: Future Master Admin Dashboard APIs
 * 
 * These functions will be implemented when the admin interface is built:
 * 
 * export async function updateTierPolicy(
 *   config: Partial<TierPolicyConfig>,
 *   adminUserId: string
 * ): Promise<void> {
 *   // Validate configuration
 *   // Update database
 *   // Clear cache
 *   // Log audit entry
 *   // Notify other instances
 * }
 * 
 * export async function getTierPolicyHistory(): Promise<TierPolicyConfig[]> {
 *   // Return configuration change history for auditing
 * }
 * 
 * export async function rollbackTierPolicy(version: number): Promise<void> {
 *   // Rollback to previous configuration version
 * }
 */
