import { describe, expect, it, vi } from "vitest";
import { Ranker } from "../pipeline/ranker";
import { makeCandidate, makeContext } from "./testUtils";

const ranker = new Ranker();

describe("Ranker", () => {
  it("favors fresher content", () => {
    vi.useFakeTimers();
    try {
      const now = new Date("2024-01-01T00:00:00Z");
      vi.setSystemTime(now);

      const fresh = makeCandidate({ id: "fresh", createdAt: now.toISOString() });
      const stale = makeCandidate({
        id: "stale",
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
      });

      const scored = ranker.scoreAll([fresh, stale], makeContext());
      const freshScore = scored.find((s) => s.id === "fresh")!._score;
      const staleScore = scored.find((s) => s.id === "stale")!._score;

      expect(freshScore).toBeGreaterThan(staleScore);
    } finally {
      vi.useRealTimers();
    }
  });

  it("zeroes score when marked AI-likely", () => {
    const scored = ranker.scoreAll(
      [makeCandidate({ id: "ai", aiHumanScore: 0 })],
      makeContext({ mode: "discovery" })
    );

    expect(scored[0]._score).toBe(0);
  });
});
