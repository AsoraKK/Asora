/**
 * Rewards module types — Phase 3
 */

export type SubscriptionTier = 'guest' | 'free' | 'premium' | 'black' | 'editorial';

export type RedemptionStatus = 'active' | 'restricted';

export interface RewardOffer {
  id: string;
  rewardLevel: number;
  title: string;
  description: string;
  partnerName: string;
  locked: boolean;
  lockReason?: string;
  redeemed: boolean;
}

export interface RewardRedemption {
  id: string;
  userId: string;
  rewardId: string;
  rewardLevel: number;
  rewardTitle: string;
  redeemedAt: string;
  status: 'redeemed';
}

export interface RewardsMeResponse {
  subscriptionTier: SubscriptionTier;
  reputationLevel: number;
  reputationBand: string;
  availableRewardLevels: number[];
  maxOptionsPerLevel: number;
  redemptionStatus: RedemptionStatus;
  fraudRiskStatus: string;
  offers: RewardOffer[];
  redemptionHistory: RewardRedemption[];
  affiliateDisclosure: string;
}

export interface RewardCatalogItem {
  id: string;
  rewardLevel: number;
  title: string;
  description: string;
  partnerName: string;
}
