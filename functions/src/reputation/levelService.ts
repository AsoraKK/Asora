/**
 * Reputation Level Service
 *
 * Computes a user's ReputationLevel (0–5) from their raw score.
 * Thresholds are config-driven (stored in the `config` Cosmos container)
 * and fall back to hardcoded defaults so the service works without a DB call.
 *
 * Editorial status is NOT handled here — it is a separate grant flow.
 */

import { getCosmosDatabase } from '@shared/clients/cosmos';
import { getAzureLogger } from '@shared/utils/logger';
import { ReputationLevel } from './types';

const logger = getAzureLogger('reputation/levelService');

// ─────────────────────────────────────────────────────────────────────────────
// Default thresholds (inclusive lower bounds per level)
// Level:       New  Verified  Trusted  Established  Credible  HighlyCredible
// Min score:     0        10       50          200       500            1000
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_THRESHOLDS: readonly number[] = [0, 10, 50, 200, 500, 1000];

let cachedThresholds: readonly number[] | null = null;
let thresholdCacheExpiresAt = 0;
const THRESHOLD_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function loadThresholds(): Promise<readonly number[]> {
  const now = Date.now();
  if (cachedThresholds && now < thresholdCacheExpiresAt) {
    return cachedThresholds;
  }

  try {
    const db = getCosmosDatabase();
    const config = db.container('config');
    const { resource } = await config.item('reputation.levelThresholds', 'reputation.levelThresholds').read<{
      id: string;
      value: number[];
    }>();

    if (resource?.value && Array.isArray(resource.value) && resource.value.length === 6) {
      cachedThresholds = resource.value as number[];
      thresholdCacheExpiresAt = now + THRESHOLD_CACHE_TTL_MS;
      return cachedThresholds;
    }
  } catch {
    // Config not present — fall through to defaults; do not throw
    logger.info('reputation.levelThresholds config not found; using defaults');
  }

  return DEFAULT_THRESHOLDS;
}

/** Expose for testing */
export function resetThresholdCache(): void {
  cachedThresholds = null;
  thresholdCacheExpiresAt = 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute ReputationLevel from a raw reputation score.
 * Thresholds are loaded from config on first call and cached for 5 minutes.
 */
export async function computeLevel(rawScore: number): Promise<ReputationLevel> {
  const thresholds = await loadThresholds();
  return computeLevelFromThresholds(rawScore, thresholds);
}

/**
 * Pure synchronous variant — useful in tests and where thresholds are already known.
 */
export function computeLevelFromThresholds(
  rawScore: number,
  thresholds: readonly number[]
): ReputationLevel {
  const score = Math.max(0, rawScore);

  // Walk from highest level down
  for (let i = thresholds.length - 1; i >= 0; i--) {
    const threshold = thresholds[i];
    if (threshold !== undefined && score >= threshold) {
      return i as ReputationLevel;
    }
  }

  return ReputationLevel.New;
}

/** Human-readable name for each level (spec §3). */
export function getLevelName(level: ReputationLevel): string {
  switch (level) {
    case ReputationLevel.New:
      return 'New';
    case ReputationLevel.Verified:
      return 'Verified';
    case ReputationLevel.Trusted:
      return 'Trusted';
    case ReputationLevel.Established:
      return 'Established';
    case ReputationLevel.Credible:
      return 'Credible';
    case ReputationLevel.HighlyCredible:
      return 'Highly Credible';
  }
}

/** Spec band name (used in API responses as `reputationBand`). */
export function getLevelBand(level: ReputationLevel): string {
  switch (level) {
    case ReputationLevel.New:
      return 'new';
    case ReputationLevel.Verified:
      return 'verified';
    case ReputationLevel.Trusted:
      return 'trusted';
    case ReputationLevel.Established:
      return 'established';
    case ReputationLevel.Credible:
      return 'credible';
    case ReputationLevel.HighlyCredible:
      return 'highly_credible';
  }
}

/**
 * Trust weight for feed ranking (Phase 2 use).
 * Level 0 → 0.3, Level 5 → 1.0, linear interpolation.
 */
export function levelToTrustWeight(level: ReputationLevel): number {
  const MIN_WEIGHT = 0.3;
  const MAX_WEIGHT = 1.0;
  const MAX_LEVEL = ReputationLevel.HighlyCredible; // 5
  return MIN_WEIGHT + (level / MAX_LEVEL) * (MAX_WEIGHT - MIN_WEIGHT);
}
