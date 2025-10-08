export type ReputationLevel = 1 | 2 | 3 | 4 | 5; // L1..L5

export interface AuthorSignals {
  authorId: string;
  reputationLevel: ReputationLevel; // provided by Reputation service
  reputationNorm?: number; // 0.2–1.0 after normalization
  consistency: number; // 0..1 posting cadence quality
}

export interface PostStats {
  likes: number;
  replies: number;
  reshares: number;
  impressions?: number;
}

export interface Post {
  id: string;
  authorId: string;
  createdAt: string; // ISO
  region?: string; // ISO country or market code
  topics?: string[];
  keywords?: string[];
  text?: string;
  stats: PostStats;
  aiHumanScore: number; // 0..1 (Hive human-likelihood). Low => AI-likely
  aiLabeled: boolean; // user tagged as AI
}

export interface Candidate extends Post {
  author: AuthorSignals;
}

export interface HardFilters {
  followOnly?: boolean;
  includeKeywords?: string[];
  excludeKeywords?: string[];
  includeTopics?: string[];
  regions?: string[]; // allowed regions
}

export interface UserPrefs {
  rankMode: 'balanced' | 'chronological' | 'qualityFirst';
}

export interface FeedContext {
  mode: 'discovery' | 'personalized';
  pageSize: number;
  region?: string;
  localToGlobalRatio: number; // 0..1
  hardFilters: HardFilters;
  userPrefs: UserPrefs;
  featureFlags: {
    fairnessQuotas: boolean;
    explorationSlots: boolean;
  };
}

export interface FeedResult {
  items: OutputItem[];
  nextCursor?: string;
  timingsMs?: Record<string, number>;
  meta?: Record<string, unknown>;
}

export interface OutputItem {
  id: string;
  authorId: string;
  createdAt: string;
  baseScore: number;
  cohort: ReputationLevel;
  region?: string;
  topics?: string[];
  // add signed fields later
}
