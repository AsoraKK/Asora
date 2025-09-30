import { Candidate, FeedContext } from "../pipeline/types";

export function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  const base: Candidate = {
    id: "post-1",
    authorId: "author-1",
    createdAt: new Date().toISOString(),
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

  return { ...base, ...overrides, author: { ...base.author, ...overrides.author } };
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
