import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FairnessPolicy } from "../pipeline/fairness";
import { Fairness } from "../pipeline/config";
import { makeOutputItem } from "./testUtils";

const fairness = new FairnessPolicy();
let capsSnapshot = new Map<number, number>();
let floorsSnapshot = new Map<number, number>();
let perAuthorSnapshot = Fairness.perAuthorPageCap;
let exploreSnapshot = Fairness.exploreRatio;

function countsByCohort(items: Array<{ cohort: number }>) {
  const map = new Map<number, number>();
  for (const item of items) {
    map.set(item.cohort, (map.get(item.cohort) ?? 0) + 1);
  }
  return map;
}

function cohortItems(level: number, count: number, authorPrefix: string) {
  return Array.from({ length: count }, (_, idx) =>
    makeOutputItem({
      id: `${authorPrefix}-${level}-${idx}`,
      authorId: `${authorPrefix}-a${idx}`,
      cohort: level as 1 | 2 | 3 | 4 | 5,
      baseScore: 1 - idx * 0.01,
      _score: 1 - idx * 0.01,
    })
  );
}

function sameAuthorItems(level: number, count: number, authorId: string, baseScore = 1) {
  return Array.from({ length: count }, (_, idx) =>
    makeOutputItem({
      id: `${authorId}-${level}-${idx}`,
      authorId,
      cohort: level as 1 | 2 | 3 | 4 | 5,
      baseScore: baseScore - idx * 0.01,
      _score: baseScore - idx * 0.01,
    })
  );
}

describe("FairnessPolicy", () => {
  beforeEach(() => {
    capsSnapshot = new Map(Fairness.caps);
    floorsSnapshot = new Map(Fairness.floors);
    perAuthorSnapshot = Fairness.perAuthorPageCap;
    exploreSnapshot = Fairness.exploreRatio;
  });

  afterEach(() => {
    Fairness.caps.clear();
    for (const [level, cap] of capsSnapshot.entries()) {
      Fairness.caps.set(level, cap);
    }
    Fairness.floors.clear();
    for (const [level, floor] of floorsSnapshot.entries()) {
      Fairness.floors.set(level, floor);
    }
    Fairness.perAuthorPageCap = perAuthorSnapshot;
    Fairness.exploreRatio = exploreSnapshot;
  });

  it.each([
    { pageSize: 10 },
    { pageSize: 20 },
    { pageSize: 40 },
  ])("respects scaled floors and caps for pageSize $pageSize", ({ pageSize }) => {
    const pool = [
      ...cohortItems(5, 20, "hi"),
      ...cohortItems(4, 20, "c4"),
      ...cohortItems(3, 20, "c3"),
      ...cohortItems(2, 20, "c2"),
      ...cohortItems(1, 20, "c1"),
    ];

    const result = fairness.apply(pool, pageSize);
    expect(result).toHaveLength(pageSize);

    const counts = countsByCohort(result);
    const scale = pageSize / 20;
    for (const [level, floor] of Fairness.floors.entries()) {
      const expectedFloor = Math.floor(floor * scale);
      expect(counts.get(level) ?? 0).toBeGreaterThanOrEqual(expectedFloor);
    }
    for (const [level, cap] of Fairness.caps.entries()) {
      const expectedCap = Math.floor(cap * scale) || 1;
      expect(counts.get(level) ?? 0).toBeLessThanOrEqual(expectedCap);
    }
  });

  it("enforces per-author cap", () => {
    const items = cohortItems(3, 10, "spam").map((it) => ({ ...it, authorId: "repeat-author" }));
    const filled = fairness.apply(items, 10);
    const repeatCount = filled.filter((i) => i.authorId === "repeat-author").length;
    expect(repeatCount).toBeLessThanOrEqual(Fairness.perAuthorPageCap);
  });

  it("allocates exploration slots round-robin", () => {
    const pool = [
      ...cohortItems(3, 20, "c3"),
      ...cohortItems(2, 5, "c2"),
      ...cohortItems(4, 5, "c4"),
      ...cohortItems(1, 5, "c1"),
      ...cohortItems(5, 5, "c5"),
    ];

    const result = fairness.apply(pool, 20);
    const counts = countsByCohort(result);

    expect(counts.get(1) ?? 0).toBeGreaterThanOrEqual(2);
    expect(counts.get(2) ?? 0).toBeGreaterThanOrEqual(2);
    expect(counts.get(4) ?? 0).toBeGreaterThanOrEqual(3);
  });

  it("backfills remaining slots when a cohort is short", () => {
    const pool = [
      ...cohortItems(5, 10, "hi"),
      ...cohortItems(4, 1, "c4"),
      ...cohortItems(3, 5, "c3"),
      ...cohortItems(2, 3, "c2"),
      ...cohortItems(1, 2, "c1"),
    ];

    const result = fairness.apply(pool, 20);
    expect(result).toHaveLength(20);
    expect(result.filter((i) => i.cohort === 4)).toHaveLength(1);
    expect(result.filter((i) => i.cohort === 5)).not.toHaveLength(0);
  });

  it("respects caps defaults and exits exploration when no new authors qualify", () => {
    Fairness.caps.delete(5);
    Fairness.caps.set(3, 1);
    Fairness.perAuthorPageCap = 1;
    Fairness.exploreRatio = 0.4;

    const pool = [
      ...sameAuthorItems(5, 5, "author-5"),
      ...sameAuthorItems(4, 5, "author-4"),
      ...sameAuthorItems(3, 5, "author-3"),
      ...sameAuthorItems(2, 5, "author-2"),
      ...sameAuthorItems(1, 5, "author-1"),
    ];

    const result = fairness.apply(pool, 10);
    const cohort3Count = result.filter((i) => i.cohort === 3).length;
    expect(cohort3Count).toBeLessThanOrEqual(1);
    const uniqueAuthors = new Set(result.map((i) => i.authorId));
    expect(uniqueAuthors.size).toBe(result.length);
  });

  it("stops at cohort cap during floors pass", () => {
    Fairness.caps.set(5, 2);
    Fairness.floors.set(5, 5);
    Fairness.perAuthorPageCap = 5;
    Fairness.exploreRatio = 0;

    const levelFive = Array.from({ length: 6 }, (_, idx) =>
      makeOutputItem({
        id: `lv5-${idx}`,
        authorId: `author-5-${idx}`,
        cohort: 5,
        baseScore: 1 - idx * 0.01,
        _score: 1 - idx * 0.01,
      })
    );
    const filler = cohortItems(3, 10, "c3");

    const result = fairness.apply([...levelFive, ...filler], 20);
    const l5Count = result.filter((i) => i.cohort === 5).length;
    expect(l5Count).toBe(2);
  });

  it("short circuits when page size is satisfied during floors", () => {
    Fairness.perAuthorPageCap = 5;
    Fairness.exploreRatio = 0;

    const pool = [
      ...cohortItems(5, 6, "hi"),
      ...cohortItems(4, 6, "c4"),
      ...cohortItems(3, 6, "c3"),
    ];

    const result = fairness.apply(pool, 3);
    expect(result).toHaveLength(3);
  });

  it("skips final fill items once cohort hits cap", () => {
    Fairness.caps.set(3, 1);
    Fairness.perAuthorPageCap = 5;
    Fairness.exploreRatio = 0;

    const pool = [
      ...cohortItems(3, 6, "c3"),
      ...cohortItems(2, 3, "c2"),
    ];

  const result = fairness.apply(pool, 5);
  const l3Count = result.filter((i) => i.cohort === 3).length;
  expect(l3Count).toBe(1);
  expect(result.length).toBeLessThanOrEqual(5);
  });

  it("returns empty list when page size is zero", () => {
    Fairness.perAuthorPageCap = 5;
    Fairness.exploreRatio = 0;
    const pool = cohortItems(3, 4, "zero");
    const result = fairness.apply(pool, 0);
    expect(result).toEqual([]);
  });
});
