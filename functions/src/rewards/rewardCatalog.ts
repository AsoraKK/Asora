import type { RewardCatalogItem, SubscriptionTier } from './types';

export const REWARD_CATALOG: readonly RewardCatalogItem[] = [
  {
    id: 'lvl1-privacy-basics',
    rewardLevel: 1,
    title: 'Privacy Starter Pack',
    description: 'Intro privacy tools and guides for secure everyday browsing.',
    partnerName: 'Lythaus Partner Network',
  },
  {
    id: 'lvl1-learning-trial',
    rewardLevel: 1,
    title: 'Learning Trial Access',
    description: 'Short trial access to curated learning content.',
    partnerName: 'Lythaus Learning',
  },
  {
    id: 'lvl2-password-suite',
    rewardLevel: 2,
    title: 'Password Manager Discount',
    description: 'Discount on a trusted password manager annual plan.',
    partnerName: 'SecureVault',
  },
  {
    id: 'lvl2-productivity-bundle',
    rewardLevel: 2,
    title: 'Productivity Bundle',
    description: 'Workspace and scheduling tools for focused publishing.',
    partnerName: 'FocusFlow',
  },
  {
    id: 'lvl3-research-pack',
    rewardLevel: 3,
    title: 'Research Toolkit Pack',
    description: 'Access bundle for source tracking and citation workflows.',
    partnerName: 'SourceKit',
  },
  {
    id: 'lvl3-events-pass',
    rewardLevel: 3,
    title: 'Community Events Pass',
    description: 'Priority registration for selected community sessions.',
    partnerName: 'Lythaus Events',
  },
  {
    id: 'lvl4-analytics-pro',
    rewardLevel: 4,
    title: 'Advanced Analytics Offer',
    description: 'Extended audience analytics and insight reporting credits.',
    partnerName: 'InsightBoard',
  },
  {
    id: 'lvl4-editorial-tools',
    rewardLevel: 4,
    title: 'Editorial Tools Bundle',
    description: 'Enhanced source and long-form drafting companion tools.',
    partnerName: 'WriteGrid',
  },
  {
    id: 'lvl5-pro-suite',
    rewardLevel: 5,
    title: 'Professional Creator Suite',
    description: 'High-trust pro tooling package for advanced contributors.',
    partnerName: 'CreatorOps',
  },
  {
    id: 'lvl5-invite-circle',
    rewardLevel: 5,
    title: 'Invite-Only Opportunity',
    description: 'Limited-access partner opportunity for top-tier users.',
    partnerName: 'Lythaus Circle',
  },
];

export function getTierRewardAccess(
  subscriptionTier: SubscriptionTier
): { availableRewardLevels: number[]; maxOptionsPerLevel: number } {
  switch (subscriptionTier) {
    case 'guest':
      return { availableRewardLevels: [], maxOptionsPerLevel: 0 };
    case 'free':
      return { availableRewardLevels: [1], maxOptionsPerLevel: 1 };
    case 'premium':
      return { availableRewardLevels: [1, 2, 3, 4, 5], maxOptionsPerLevel: 1 };
    case 'black':
      return { availableRewardLevels: [1, 2, 3, 4, 5], maxOptionsPerLevel: 999 };
    case 'editorial':
      return { availableRewardLevels: [1, 2, 3, 4, 5], maxOptionsPerLevel: 1 };
  }
}
