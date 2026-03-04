export type Tier = 'free' | 'pro' | 'admin' | 'dev';

export interface TierLimits {
  maxChars: number;
  maxMedia: number;
  postsPerHour: number;
  reputationOnPublish: number;
}

export const DEFAULT_TIER: Tier = 'free';

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: { maxChars: 500, maxMedia: 1, postsPerHour: 5, reputationOnPublish: 2 },
  pro: { maxChars: 2000, maxMedia: 4, postsPerHour: 20, reputationOnPublish: 3 },
  admin: { maxChars: 5000, maxMedia: 10, postsPerHour: 100, reputationOnPublish: 0 },
  dev: { maxChars: 5000, maxMedia: 10, postsPerHour: 100, reputationOnPublish: 0 },
};
