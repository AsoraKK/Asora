import { getTargetDatabase } from '@shared/clients/cosmos';
import type { UserDocument } from '@auth/types';
import {
  getLimitsForTier,
  normalizeTier,
  type TierLimits,
  type UserTier,
} from './tierLimits';

export type TierTruthSource = 'user_document' | 'jwt_fallback' | 'expired_manual_grant';

export interface EffectiveEntitlements {
  tier: UserTier;
  limits: TierLimits;
  source: TierTruthSource;
  manualGrantExpiresAt: string | null;
  manualGrantReviewAt: string | null;
}

function isExpired(value: unknown, now: Date): boolean {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp <= now.getTime();
}

export function resolveTierFromUserDocument(
  user: Pick<UserDocument, 'tier' | 'tierGrant'> | null | undefined,
  claimedTier: string | null | undefined,
  now = new Date()
): Omit<EffectiveEntitlements, 'limits'> {
  if (!user) {
    return {
      tier: normalizeTier(claimedTier),
      source: 'jwt_fallback',
      manualGrantExpiresAt: null,
      manualGrantReviewAt: null,
    };
  }

  const grant = user.tierGrant;
  if (grant && isExpired(grant.expiresAt, now)) {
    return {
      tier: 'free',
      source: 'expired_manual_grant',
      manualGrantExpiresAt: grant.expiresAt,
      manualGrantReviewAt: grant.reviewAt,
    };
  }

  return {
    tier: normalizeTier(grant?.tier ?? user.tier),
    source: 'user_document',
    manualGrantExpiresAt: grant?.expiresAt ?? null,
    manualGrantReviewAt: grant?.reviewAt ?? null,
  };
}

export async function getEffectiveEntitlements(
  userId: string,
  claimedTier?: string | null,
  now = new Date()
): Promise<EffectiveEntitlements> {
  let user: UserDocument | null = null;
  try {
    const { resource } = await getTargetDatabase().users
      .item(userId, userId)
      .read<UserDocument>();
    user = resource ?? null;
  } catch {
    // Authenticated availability is preserved during a Cosmos read failure,
    // but the fallback is normalized and never accepts unknown tiers.
  }

  const resolved = resolveTierFromUserDocument(user, claimedTier, now);
  return {
    ...resolved,
    limits: getLimitsForTier(resolved.tier),
  };
}
