import { describe, expect, it } from "vitest";
import { Filter } from "../pipeline/filter";
import { makeCandidate, makeContext } from "./testUtils";

const filter = new Filter();

describe("Filter", () => {
  it("drops candidates below AI threshold", () => {
    const ctx = makeContext();
    const following = new Set<string>();

    const result = filter.apply(
      [makeCandidate({ id: "ok", aiHumanScore: 0.9 }), makeCandidate({ id: "bot", aiHumanScore: 0.05 })],
      ctx,
      following
    );

    expect(result.map((c) => c.id)).toEqual(["ok"]);
  });

  it("enforces follow-only mode", () => {
    const ctx = makeContext({ hardFilters: { followOnly: true } });
    const following = new Set<string>(["author-1"]);

    const keep = makeCandidate({ id: "keep" });
    const drop = makeCandidate({ id: "drop", authorId: "stranger" });

    const result = filter.apply([keep, drop], ctx, following);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("keep");
  });

  it("ignores follow-only when disabled", () => {
    const ctx = makeContext({ hardFilters: { followOnly: false } });
    const result = filter.apply([makeCandidate({ id: "stranger", authorId: "X" })], ctx, new Set());
    expect(result).toHaveLength(1);
  });

  it("matches include keywords case-insensitively", () => {
    const ctx = makeContext({ hardFilters: { includeKeywords: ["Quantum"] } });
    const result = filter.apply([makeCandidate({ keywords: ["quantum", "ai"] })], ctx, new Set());
    expect(result).toHaveLength(1);

    const miss = filter.apply([makeCandidate({ keywords: ["biology"] })], ctx, new Set());
    expect(miss).toHaveLength(0);
  });

  it("drops candidates containing excluded keywords", () => {
    const ctx = makeContext({ hardFilters: { excludeKeywords: ["spoiler"] } });
    const keep = filter.apply([makeCandidate({ keywords: ["preview"] })], ctx, new Set());
    expect(keep).toHaveLength(1);

    const drop = filter.apply([makeCandidate({ keywords: ["Spoiler"] })], ctx, new Set());
    expect(drop).toHaveLength(0);
  });

  it("requires at least one matching topic when includeTopics provided", () => {
    const ctx = makeContext({ hardFilters: { includeTopics: ["science"] } });
    const keep = filter.apply([makeCandidate({ topics: ["science", "tech"] })], ctx, new Set());
    expect(keep).toHaveLength(1);

    const drop = filter.apply([makeCandidate({ topics: ["finance"] })], ctx, new Set());
    expect(drop).toHaveLength(0);
  });

  it("filters by allowed regions", () => {
    const ctx = makeContext({ hardFilters: { regions: ["US"] } });
    const keep = filter.apply([makeCandidate({ region: "US" })], ctx, new Set());
    expect(keep).toHaveLength(1);

    const dropMissingRegion = filter.apply([makeCandidate({ region: undefined })], ctx, new Set());
    const dropWrongRegion = filter.apply([makeCandidate({ region: "CA" })], ctx, new Set());
    expect(dropMissingRegion).toHaveLength(0);
    expect(dropWrongRegion).toHaveLength(0);
  });
});
