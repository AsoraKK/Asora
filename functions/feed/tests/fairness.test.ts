import { describe, expect, it } from "vitest";
import { FairnessPolicy } from "../pipeline/fairness";
import { OutputItem, ReputationLevel } from "../pipeline/types";

const fairness = new FairnessPolicy();

describe("FairnessPolicy", () => {
  const makeItem = (id: string, authorId: string, cohort: ReputationLevel, score: number): OutputItem & {
    _cand: unknown;
    _score: number;
  } => ({
    id,
    authorId,
    createdAt: new Date().toISOString(),
    region: "US",
    topics: [],
    baseScore: score,
    cohort,
    _cand: null,
    _score: score,
  });

  it("caps repeated authors per page", () => {
    const items = Array.from({ length: 5 }, (_, idx) =>
      makeItem(`a-${idx}`, "multi-author", 3, 1 - idx * 0.01)
    );
    items.push(makeItem("other", "other", 3, 0.5));

    const result = fairness.apply(items, 6);

    const byMulti = result.filter((i) => i.authorId === "multi-author");
    expect(byMulti).toHaveLength(2);
  });

  it("keeps lower-reputation cohort floor", () => {
    const hi = Array.from({ length: 10 }, (_, idx) => makeItem(`hi-${idx}`, `h-${idx}`, 5, 0.9 - idx * 0.01));
    const low = [makeItem("low-1", "low-author", 1, 0.1)];

    const result = fairness.apply([...hi, ...low], 20);

    expect(result.some((i) => i.cohort === 1)).toBe(true);
  });
});
