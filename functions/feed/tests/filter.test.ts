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
    const drop = makeCandidate({
      id: "drop",
      authorId: "stranger",
      author: {
        authorId: "stranger",
        reputationLevel: 2,
        consistency: 0.4,
      },
    });

    const result = filter.apply([keep, drop], ctx, following);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("keep");
  });
});
