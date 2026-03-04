/**
 * MODERATION WEIGHTS LOADER
 * 
 * Purpose: Load per-class moderation weights with user overrides from Cosmos DB
 * 
 * Flow:
 * 1. Load default weights from hive-classes-config.ts
 * 2. Check Cosmos DB for admin-customized weights
 * 3. Merge custom weights over defaults
 * 4. Return final weights object for HiveAIClient
 */

import { getDefaultWeights } from './hive-classes-config';

/**
 * Structure of weight override document in Cosmos DB
 */
export interface WeightOverride {
  id: string; // Primary key: e.g., "text_hate"
  className: string; // Hive class name (e.g., "hate")
  apiType: 'text' | 'image' | 'deepfake';
  customWeight: number; // Admin's override (0-1)
  defaultWeight: number; // Original default (for reference)
  lastModifiedBy: string; // Admin user ID
  lastModifiedAt: string; // ISO timestamp
  changeReason?: string; // Optional notes
  active: boolean; // Can disable without deleting
}

/**
 * Load moderation weights with optional Cosmos DB overrides
 * 
 * Usage:
 * ```typescript
 * // Without overrides (uses defaults only)
 * const weights = await loadModerationWeights();
 * 
 * // With Cosmos DB overrides (future Control Panel integration)
 * const weights = await loadModerationWeights(cosmosClient, 'ModerationWeights');
 * ```
 * 
 * @param cosmosContainer - Optional Cosmos DB container for overrides
 * @returns Record of class name → weight (0-1)
 */
export async function loadModerationWeights(
  cosmosContainer?: any
): Promise<Record<string, number>> {
  // Start with defaults from config file
  const weights = getDefaultWeights();

  // If Cosmos DB container provided, load user overrides
  if (cosmosContainer) {
    try {
      const query = 'SELECT * FROM c WHERE c.active = true';
      const { resources: overrides } = await (cosmosContainer.items
        .query(query) as any)
        .fetchAll();

      // Merge custom weights over defaults
      for (const override of overrides as WeightOverride[]) {
        if (override.className && typeof override.customWeight === 'number') {
          weights[override.className] = override.customWeight;
        }
      }

      console.log(`Loaded ${overrides.length} weight overrides from Cosmos DB`);
    } catch (error) {
      console.error('Failed to load weight overrides from Cosmos DB:', error);
      // Fall back to defaults on error
    }
  }

  return weights;
}

/**
 * Save a weight override to Cosmos DB (for Control Panel)
 * 
 * Usage:
 * ```typescript
 * await saveWeightOverride(
 *   cosmosContainer,
 *   'hate',
 *   0.90,
 *   'admin@lythaus.com',
 *   'Too many false positives'
 * );
 * ```
 */
export async function saveWeightOverride(
  cosmosContainer: any,
  className: string,
  newWeight: number,
  adminUserId: string,
  reason?: string
): Promise<void> {
  const defaultWeights = getDefaultWeights();
  const defaultWeight = defaultWeights[className];

  if (!defaultWeight) {
    throw new Error(`Unknown class name: ${className}`);
  }

  // Validate weight is within bounds
  if (newWeight < 0 || newWeight > 1) {
    throw new Error(`Weight must be between 0 and 1, got: ${newWeight}`);
  }

  // Determine API type from class name prefix or lookup
  let apiType: 'text' | 'image' | 'deepfake' = 'text';
  if (className.includes('image') || className.includes('nudity') || className.includes('gore')) {
    apiType = 'image';
  } else if (className.includes('deepfake')) {
    apiType = 'deepfake';
  }

  const override: WeightOverride = {
    id: `${apiType}_${className}`,
    className,
    apiType,
    customWeight: newWeight,
    defaultWeight,
    lastModifiedBy: adminUserId,
    lastModifiedAt: new Date().toISOString(),
    changeReason: reason,
    active: true,
  };

  await cosmosContainer.items.upsert(override);
  console.log(`Saved weight override: ${className} = ${newWeight}`);
}

/**
 * Reset a class back to default weight (delete override)
 */
export async function resetWeightToDefault(
  cosmosContainer: any,
  className: string
): Promise<void> {
  // Find all matching overrides
  const query = `SELECT * FROM c WHERE c.className = '${className}'`;
  const { resources: overrides } = await (cosmosContainer.items
    .query(query) as any)
    .fetchAll();

  for (const override of overrides as WeightOverride[]) {
    await cosmosContainer.item(override.id).delete();
  }

  console.log(`Reset ${className} to default weight`);
}

/**
 * Example: Initialize HiveAIClient with weight overrides
 * 
 * This is what your Azure Functions would call when handling moderation requests
 */
export async function createHiveClientWithWeights(
  apiKey: string,
  cosmosContainer?: any
): Promise<any> {
  const { HiveAIClient } = await import('./hive-client');
  
  // Load weights (defaults + any Cosmos DB overrides)
  const classWeights = await loadModerationWeights(cosmosContainer);

  return new HiveAIClient({
    apiKey,
    classWeights, // Per-class weights loaded from config + DB
  });
}
