import { v4 as uuidv4 } from 'uuid';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { computeLevel, getLevelBand } from '../reputation/levelService';
import { REWARD_CATALOG, getTierRewardAccess } from './rewardCatalog';
import type {
  RewardRedemption,
  RewardsMeResponse,
  SubscriptionTier,
  RewardOffer,
  RewardCatalogItem,
} from './types';

const ACCOUNT_MATURITY_DAYS = 7;

interface UserSnapshot {
  id: string;
  tier?: string;
  subscriptionTier?: string;
  reputationScore?: number;
  rewardEligibilityStatus?: string;
  fraudRiskStatus?: string;
  createdAt?: string;
}

function normalizeTier(raw?: string): SubscriptionTier {
  const value = (raw ?? '').toLowerCase().trim();
  if (value === 'free' || value === 'premium' || value === 'black' || value === 'editorial') {
    return value;
  }
  if (value === 'bronze') return 'free';
  if (value === 'silver' || value === 'gold') return 'premium';
  if (value === 'platinum') return 'black';
  return 'guest';
}

function accountAgeDays(createdAt?: string): number {
  if (!createdAt) return ACCOUNT_MATURITY_DAYS;
  const createdMs = Date.parse(createdAt);
  if (Number.isNaN(createdMs)) return ACCOUNT_MATURITY_DAYS;
  const delta = Date.now() - createdMs;
  return Math.floor(delta / (24 * 60 * 60 * 1000));
}

async function getUser(userId: string): Promise<UserSnapshot | null> {
  const db = getCosmosDatabase();
  const { resource } = await db.container('users').item(userId, userId).read<UserSnapshot>();
  return resource ?? null;
}

async function getUserRedemptions(userId: string): Promise<RewardRedemption[]> {
  const db = getCosmosDatabase();
  const { resources } = await db
    .container('reward_redemptions')
    .items.query<RewardRedemption>({
      query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.redeemedAt DESC',
      parameters: [{ name: '@userId', value: userId }],
    })
    .fetchAll();
  return resources ?? [];
}

function countRedemptionsByLevel(redemptions: RewardRedemption[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const redemption of redemptions) {
    map.set(redemption.rewardLevel, (map.get(redemption.rewardLevel) ?? 0) + 1);
  }
  return map;
}

function lockReasonForOffer(
  offer: RewardCatalogItem,
  availableRewardLevels: number[],
  maxOptionsPerLevel: number,
  redemptionsByLevel: Map<number, number>,
  rewardEligibilityBlocked: boolean,
  redemptionRestricted: boolean
): string | undefined {
  if (redemptionRestricted) {
    return 'Redemption is temporarily restricted while account safety checks complete.';
  }
  if (rewardEligibilityBlocked) {
    return 'Your account is currently not eligible for reward redemption.';
  }
  if (!availableRewardLevels.includes(offer.rewardLevel)) {
    return 'Your current subscription tier does not include this reward level.';
  }

  const redeemedAtLevel = redemptionsByLevel.get(offer.rewardLevel) ?? 0;
  if (maxOptionsPerLevel > 0 && redeemedAtLevel >= maxOptionsPerLevel) {
    return 'You have reached your redemption limit for this reward level.';
  }

  return undefined;
}

export async function getRewardsSnapshot(userId: string, tierHint?: string): Promise<RewardsMeResponse> {
  const user = await getUser(userId);
  const subscriptionTier = normalizeTier(tierHint ?? user?.subscriptionTier ?? user?.tier);
  const reputationLevel = await computeLevel(user?.reputationScore ?? 0);
  const reputationBand = getLevelBand(reputationLevel);

  const { availableRewardLevels, maxOptionsPerLevel } = getTierRewardAccess(subscriptionTier);

  const rewardEligibilityStatus = (user?.rewardEligibilityStatus ?? 'eligible').toLowerCase();
  const fraudRiskStatus = (user?.fraudRiskStatus ?? 'normal').toLowerCase();
  const ageDays = accountAgeDays(user?.createdAt);

  const rewardEligibilityBlocked = rewardEligibilityStatus !== 'eligible';
  const redemptionRestricted = fraudRiskStatus !== 'normal' || ageDays < ACCOUNT_MATURITY_DAYS;
  const redemptionStatus = redemptionRestricted ? 'restricted' : 'active';

  const redemptionHistory = await getUserRedemptions(userId);
  const redeemedIds = new Set(redemptionHistory.map((r) => r.rewardId));
  const redemptionsByLevel = countRedemptionsByLevel(redemptionHistory);

  const offers: RewardOffer[] = REWARD_CATALOG.map((offer) => {
    const lockReason = lockReasonForOffer(
      offer,
      availableRewardLevels,
      maxOptionsPerLevel,
      redemptionsByLevel,
      rewardEligibilityBlocked,
      redemptionRestricted
    );

    return {
      id: offer.id,
      rewardLevel: offer.rewardLevel,
      title: offer.title,
      description: offer.description,
      partnerName: offer.partnerName,
      locked: Boolean(lockReason),
      lockReason,
      redeemed: redeemedIds.has(offer.id),
    };
  });

  return {
    subscriptionTier,
    reputationLevel,
    reputationBand,
    availableRewardLevels,
    maxOptionsPerLevel,
    redemptionStatus,
    fraudRiskStatus,
    offers,
    redemptionHistory,
    affiliateDisclosure:
      'Some reward links may include affiliate relationships. Lythaus may earn from eligible redemptions.',
  };
}

export async function redeemReward(
  userId: string,
  rewardId: string,
  tierHint?: string
): Promise<RewardRedemption> {
  const snapshot = await getRewardsSnapshot(userId, tierHint);
  const offer = snapshot.offers.find((item) => item.id === rewardId);
  if (!offer) {
    throw Object.assign(new Error('Reward not found'), { statusCode: 404 });
  }

  if (offer.redeemed) {
    throw Object.assign(new Error('Reward already redeemed'), { statusCode: 409 });
  }

  if (offer.locked) {
    throw Object.assign(new Error(offer.lockReason ?? 'Reward is locked'), { statusCode: 403 });
  }

  const now = new Date().toISOString();
  const redemption: RewardRedemption = {
    id: uuidv4(),
    userId,
    rewardId: offer.id,
    rewardLevel: offer.rewardLevel,
    rewardTitle: offer.title,
    redeemedAt: now,
    status: 'redeemed',
  };

  const db = getCosmosDatabase();
  await db.container('reward_redemptions').items.create(redemption);

  return redemption;
}
