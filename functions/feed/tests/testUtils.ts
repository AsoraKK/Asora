import { vi } from "vitest";
import { Candidate, FeedContext, OutputItem, ReputationLevel } from "../pipeline/types";

export const BASE_TIME = new Date("2024-01-01T00:00:00.000Z");

export function useFixedTime() {
  vi.useFakeTimers();
  vi.setSystemTime(BASE_TIME);
}

export function restoreTime() {
  vi.useRealTimers();
}

export function hoursAgo(hours: number): string {
  return new Date(BASE_TIME.getTime() - hours * 3_600_000).toISOString();
}

export function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  const base: Candidate = {
    id: "post-1",
    authorId: "author-1",
    createdAt: BASE_TIME.toISOString(),
    region: "US",
    topics: ["tech"],
    keywords: ["ai"],
    text: "Hello world",
    stats: {
      likes: 10,
      replies: 1,
      reshares: 0,
    },
    aiHumanScore: 0.9,
    aiLabeled: false,
    author: {
      authorId: "author-1",
      reputationLevel: 3,
      reputationNorm: 0.8,
      consistency: 0.6,
    },
  };

  return {
    ...base,
    ...overrides,
    stats: { ...base.stats, ...overrides.stats },
    author: { ...base.author, ...overrides.author },
  };
}

export function makeContext(overrides: Partial<FeedContext> = {}): FeedContext {
  return {
    mode: "personalized",
    pageSize: 10,
    region: "US",
    localToGlobalRatio: 0.6,
    hardFilters: {},
    userPrefs: { rankMode: "balanced" },
    featureFlags: {
      fairnessQuotas: true,
      explorationSlots: true,
    },
    ...overrides,
  };
}

export function makeOutputItem(
  overrides: Partial<OutputItem & { _cand?: unknown; _score?: number }> & {
    id: string;
    baseScore?: number;
    cohort?: ReputationLevel;
  }
): OutputItem & { _cand: unknown; _score: number } {
  const base: OutputItem & { _cand: unknown; _score: number } = {
    id: overrides.id,
    authorId: overrides.authorId ?? overrides.id,
    createdAt: overrides.createdAt ?? BASE_TIME.toISOString(),
    baseScore: overrides.baseScore ?? 1,
    cohort: overrides.cohort ?? 3,
    region: overrides.region ?? "US",
    topics: overrides.topics ?? ["tech"],
    _cand: overrides._cand ?? null,
    _score: overrides._score ?? (overrides.baseScore ?? 1),
  };

  return {
    ...base,
    ...overrides,
    topics: overrides.topics ?? base.topics,
    _cand: overrides._cand ?? base._cand,
    _score: overrides._score ?? base._score,
  };
}
