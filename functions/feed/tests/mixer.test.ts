import { describe, expect, it } from "vitest";
import { Mixer } from "../pipeline/mixer";
import { OutputItem } from "../pipeline/types";
import { makeContext } from "./testUtils";

const mixer = new Mixer();

describe("Mixer", () => {
  const makeItem = (id: string, region: string, baseScore: number, createdAt: string): OutputItem => ({
    id,
    authorId: id,
    cohort: 3,
    baseScore,
    region,
    topics: [],
    createdAt,
  });

  it("respects local/global ratio", () => {
    const items = [
      makeItem("l1", "US", 0.9, new Date().toISOString()),
      makeItem("l2", "US", 0.8, new Date().toISOString()),
      makeItem("g1", "CA", 0.7, new Date().toISOString()),
      makeItem("g2", "CA", 0.6, new Date().toISOString()),
    ];

    const result = mixer.apply(items, makeContext({ localToGlobalRatio: 0.5, pageSize: 4 }));

    const local = result.filter((i) => i.region === "US");
    const global = result.filter((i) => i.region !== "US");
    expect(local).toHaveLength(2);
    expect(global).toHaveLength(2);
  });

  it("sorts chronologically when requested", () => {
    const ctx = makeContext({
      userPrefs: { rankMode: "chronological" },
      region: undefined,
    });

    const now = Date.now();
    const items = [
      makeItem("old", "US", 1, new Date(now - 1000).toISOString()),
      makeItem("new", "US", 0.1, new Date(now).toISOString()),
    ];

    const result = mixer.apply(items, ctx);
    expect(result[0].id).toBe("new");
  });
});
