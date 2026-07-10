import { getAdminConfig } from '@admin/adminService';
import { withClient } from '@shared/clients/postgres';
import { HttpError } from '@shared/utils/errors';

export type AlphaStage =
  | 'technical_alpha'
  | 'controlled_alpha'
  | 'expanded_alpha'
  | 'paused'
  | 'closed';

export type AlphaFeature =
  | 'registrations'
  | 'inviteRedemption'
  | 'postCreation'
  | 'commentCreation'
  | 'reactions'
  | 'mediaUpload'
  | 'aiClassificationEnforcement'
  | 'customFeedCreation'
  | 'newsBoard'
  | 'reputationAwards'
  | 'communityVoting'
  | 'nonEssentialNotifications';

export interface AlphaFeatureFlags extends Record<AlphaFeature, boolean> {
  readOnlyMode: boolean;
}

export interface AlphaConfig {
  stage: AlphaStage;
  maxRegisteredAccounts: number;
  maxActiveInvites: number;
  maxRedeemedInvites: number;
  inviteExpiryDays: number;
  stageStartDate: string;
  stageReviewDate: string;
  stageEndDate: string;
  aiClassificationFailureMode: 'fail_closed' | 'under_review';
  features: AlphaFeatureFlags;
}

const STAGE_HARD_CAP: Record<AlphaStage, number> = {
  technical_alpha: 50,
  controlled_alpha: 100,
  expanded_alpha: 250,
  paused: 0,
  closed: 0,
};

const TEST_CONFIG: AlphaConfig = {
  stage: 'technical_alpha',
  maxRegisteredAccounts: 50,
  maxActiveInvites: 50,
  maxRedeemedInvites: 50,
  inviteExpiryDays: 14,
  stageStartDate: '2026-01-01T00:00:00.000Z',
  stageReviewDate: '2099-01-15T00:00:00.000Z',
  stageEndDate: '2099-02-01T00:00:00.000Z',
  aiClassificationFailureMode: 'under_review',
  features: {
    registrations: true,
    inviteRedemption: true,
    postCreation: true,
    commentCreation: true,
    reactions: true,
    mediaUpload: true,
    aiClassificationEnforcement: true,
    customFeedCreation: true,
    newsBoard: true,
    reputationAwards: true,
    communityVoting: true,
    nonEssentialNotifications: true,
    readOnlyMode: false,
  },
};

const FAIL_CLOSED_CONFIG: AlphaConfig = {
  ...TEST_CONFIG,
  stage: 'paused',
  maxRegisteredAccounts: 0,
  maxActiveInvites: 0,
  maxRedeemedInvites: 0,
  features: Object.fromEntries(
    Object.keys(TEST_CONFIG.features).map(key => [key, false])
  ) as unknown as AlphaFeatureFlags,
};

let cached: { config: AlphaConfig; expiresAt: number } | null = null;

function readDate(value: unknown): string | null {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    return null;
  }
  return new Date(value).toISOString();
}

function readPositiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : null;
}

function readNonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

export function parseAlphaConfig(value: unknown): AlphaConfig | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const raw = value as Record<string, unknown>;
  const stage = raw.stage as AlphaStage;
  if (!Object.prototype.hasOwnProperty.call(STAGE_HARD_CAP, stage)) {
    return null;
  }

  const start = readDate(raw.stageStartDate);
  const review = readDate(raw.stageReviewDate);
  const end = readDate(raw.stageEndDate);
  const maxRegisteredAccounts = readNonNegativeInteger(raw.maxRegisteredAccounts);
  const maxActiveInvites = readNonNegativeInteger(raw.maxActiveInvites);
  const maxRedeemedInvites = readNonNegativeInteger(raw.maxRedeemedInvites);
  const inviteExpiryDays = readPositiveInteger(raw.inviteExpiryDays);
  const features = raw.features;
  const failureMode = raw.aiClassificationFailureMode;

  if (
    !start ||
    !review ||
    !end ||
    Date.parse(start) >= Date.parse(review) ||
    Date.parse(review) >= Date.parse(end) ||
    maxRegisteredAccounts === null ||
    maxRegisteredAccounts > STAGE_HARD_CAP[stage] ||
    maxActiveInvites === null ||
    maxRedeemedInvites === null ||
    (STAGE_HARD_CAP[stage] > 0 &&
      (maxRegisteredAccounts === 0 || maxActiveInvites === 0 || maxRedeemedInvites === 0)) ||
    (STAGE_HARD_CAP[stage] === 0 &&
      (maxRegisteredAccounts !== 0 || maxActiveInvites !== 0 || maxRedeemedInvites !== 0)) ||
    !inviteExpiryDays ||
    inviteExpiryDays > 30 ||
    (failureMode !== 'fail_closed' && failureMode !== 'under_review') ||
    !features ||
    typeof features !== 'object'
  ) {
    return null;
  }

  const parsedFeatures = {} as AlphaFeatureFlags;
  for (const key of Object.keys(TEST_CONFIG.features) as Array<keyof AlphaFeatureFlags>) {
    const featureValue = (features as Record<string, unknown>)[key];
    if (typeof featureValue !== 'boolean') {
      return null;
    }
    parsedFeatures[key] = featureValue;
  }

  return {
    stage,
    maxRegisteredAccounts,
    maxActiveInvites,
    maxRedeemedInvites,
    inviteExpiryDays,
    stageStartDate: start,
    stageReviewDate: review,
    stageEndDate: end,
    aiClassificationFailureMode: failureMode,
    features: parsedFeatures,
  };
}

export async function getAlphaConfig(now = Date.now()): Promise<AlphaConfig> {
  if (cached && cached.expiresAt > now) {
    return cached.config;
  }

  if (process.env.NODE_ENV === 'test') {
    return TEST_CONFIG;
  }

  let config = FAIL_CLOSED_CONFIG;
  try {
    const adminConfig = await getAdminConfig();
    config = parseAlphaConfig(adminConfig?.payload.alpha) ?? FAIL_CLOSED_CONFIG;
  } catch {
    config = FAIL_CLOSED_CONFIG;
  }

  cached = { config, expiresAt: now + 15_000 };
  return config;
}

export function resetAlphaConfigCache(): void {
  cached = null;
}

export function assertAlphaWindow(config: AlphaConfig, now = new Date()): void {
  if (config.stage === 'paused' || config.stage === 'closed') {
    throw new HttpError(503, `Alpha stage is ${config.stage}`);
  }
  if (now < new Date(config.stageStartDate) || now >= new Date(config.stageEndDate)) {
    throw new HttpError(503, 'Alpha stage is outside its approved operating window');
  }
}

export async function assertAlphaFeature(feature: AlphaFeature): Promise<AlphaConfig> {
  const config = await getAlphaConfig();
  assertAlphaWindow(config);
  if (config.features.readOnlyMode || !config.features[feature]) {
    throw new HttpError(503, `${feature} is disabled for the current Alpha stage`);
  }
  return config;
}

export async function reserveAlphaCohortMembership(
  userId: string,
  inviteId: string
): Promise<{ inserted: boolean; count: number; cap: number }> {
  const config = await assertAlphaFeature('inviteRedemption');
  return withClient(async client => {
    await client.query('BEGIN');
    try {
      await client.query("SELECT pg_advisory_xact_lock(hashtext('lythaus-alpha-cohort'))");
      const existing = await client.query(
        'SELECT 1 FROM alpha_cohort_members WHERE user_id = $1 LIMIT 1',
        [userId]
      );
      const countResult = await client.query<{ count: string }>(
        'SELECT COUNT(*)::text AS count FROM alpha_cohort_members'
      );
      const count = Number.parseInt(countResult.rows[0]?.count ?? '0', 10);
      const cap = Math.min(config.maxRegisteredAccounts, config.maxRedeemedInvites);

      if ((existing.rowCount ?? 0) > 0) {
        await client.query('COMMIT');
        return { inserted: false, count, cap };
      }
      if (count >= cap) {
        await client.query('ROLLBACK');
        throw new HttpError(409, 'Alpha cohort capacity has been reached');
      }

      await client.query(
        `INSERT INTO alpha_cohort_members (user_id, invite_id, stage, activated_at)
         VALUES ($1, $2, $3, NOW())`,
        [userId, inviteId, config.stage]
      );
      await client.query('COMMIT');
      return { inserted: true, count: count + 1, cap };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    }
  });
}

export async function releaseAlphaCohortMembership(userId: string): Promise<void> {
  await withClient(async client => {
    await client.query('DELETE FROM alpha_cohort_members WHERE user_id = $1', [userId]);
  });
}

export async function getAlphaCohortSnapshot(): Promise<{
  stage: AlphaStage;
  registeredAccounts: number;
  capacity: number;
  remaining: number;
}> {
  const config = await getAlphaConfig();
  const registeredAccounts = await withClient(async client => {
    const result = await client.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM alpha_cohort_members'
    );
    return Number.parseInt(result.rows[0]?.count ?? '0', 10);
  });
  const capacity = Math.min(config.maxRegisteredAccounts, config.maxRedeemedInvites);
  return {
    stage: config.stage,
    registeredAccounts,
    capacity,
    remaining: Math.max(0, capacity - registeredAccounts),
  };
}

export const ALPHA_STAGE_HARD_CAPS = STAGE_HARD_CAP;
