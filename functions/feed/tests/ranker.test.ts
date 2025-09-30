import { describe, expect, it } from "vitest";
import { Ranker } from "../pipeline/ranker";
import { makeCandidate, makeContext, useFixedTime, restoreTime, hoursAgo } from "./testUtils";

const ranker = new Ranker();

describe("Ranker", () => {
  beforeEach(() => {
    useFixedTime();
  });

  afterEach(() => {
    restoreTime();
  });

  it("scores recent posts higher than stale ones", () => {
    const fresh = makeCandidate({ id: "fresh", createdAt: hoursAgo(0) });
    const mid = makeCandidate({ id: "mid", createdAt: hoursAgo(6) });
    const stale = makeCandidate({ id: "stale", createdAt: hoursAgo(24) });

    const scores = ranker.scoreAll([fresh, mid, stale], makeContext());
    const lookup = Object.fromEntries(scores.map((s) => [s.id, s._score]));

    expect(lookup.fresh).toBeGreaterThan(lookup.mid);
    expect(lookup.mid).toBeGreaterThan(lookup.stale);
  });

  it("normalizes engagement into capped range", () => {
    const zero = makeCandidate({ id: "zero", stats: { likes: 0, replies: 0, reshares: 0 } });
    const mid = makeCandidate({ id: "mid", stats: { likes: 10, replies: 0, reshares: 0 } });
    const cap = makeCandidate({ id: "cap", stats: { likes: 1000, replies: 0, reshares: 0 } });

    const scores = ranker.scoreAll([zero, mid, cap], makeContext());
    const lookup = Object.fromEntries(scores.map((s) => [s.id, s._score]));

  expect(lookup.mid).toBeGreaterThan(lookup.zero);
  expect(lookup.cap).toBeLessThanOrEqual(1);
  expect(lookup.cap - lookup.mid).toBeLessThan(0.15);
  });

  it("applies diminishing returns for reputation level", () => {
    const lvl4 = makeCandidate({
      id: "l4",
      author: { authorId: "author-4", reputationLevel: 4, consistency: 0.6 },
    });
    const lvl5 = makeCandidate({
      id: "l5",
      author: { authorId: "author-5", reputationLevel: 5, consistency: 0.6 },
    });

    const [score4] = ranker.scoreAll([lvl4], makeContext());
    const [score5] = ranker.scoreAll([lvl5], makeContext());

    expect(score5._score).toBeGreaterThan(score4._score);
    expect(score5._score - score4._score).toBeLessThan(0.15);
  });

  it("multiplies by authenticity score", () => {
    const full = makeCandidate({ id: "human", aiHumanScore: 1 });
    const partial = makeCandidate({ id: "partial", aiHumanScore: 0.5 });
    const zero = makeCandidate({ id: "bot", aiHumanScore: 0 });

    const scores = ranker.scoreAll([full, partial, zero], makeContext());
    const lookup = Object.fromEntries(scores.map((s) => [s.id, s._score]));

    expect(lookup.human).toBeGreaterThan(lookup.partial);
    expect(lookup.partial).toBeGreaterThan(0);
    expect(lookup.bot).toBe(0);
  });

  it("adjusts weights between discovery and personalized modes", () => {
    const candidate = makeCandidate({
      author: { authorId: "author-x", reputationLevel: 5, consistency: 1 },
      stats: { likes: 200, replies: 40, reshares: 20 },
      createdAt: hoursAgo(18),
    });

    const [discovery] = ranker.scoreAll([candidate], makeContext({ mode: "discovery" }));
    const [personalized] = ranker.scoreAll([candidate], makeContext({ mode: "personalized" }));

    expect(personalized._score).toBeGreaterThan(discovery._score);
  });
});
