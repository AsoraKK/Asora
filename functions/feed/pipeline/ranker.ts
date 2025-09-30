import { Candidate, FeedContext, OutputItem } from "./types";
import { Freshness, Weights } from "./config";

function freshness(createdAtIso: string): number {
  const ageHours = Math.max(0, (Date.now() - Date.parse(createdAtIso)) / 3_600_000);
  return Math.exp(-Freshness.lambdaPerHour * ageHours); // 0..1
}

function engagement(s: { likes: number; replies: number; reshares: number }): number {
  const raw = 1.0 * s.likes + 2.0 * s.replies + 1.5 * s.reshares;
  const norm = Math.log1p(raw) / Math.log(1 + 1000); // cap around 1000 raw -> ~1.0
  return Math.min(1, norm);
}

function repNorm(level: number): number {
  // base mapping 1..5 => 0.2..1.0
  const base = 0.2 + 0.2 * (level - 1);
  // diminishing returns via sigmoid cap
  const capped = 1 / (1 + Math.exp(-6 * (base - 0.6))); // center at 0.6
  return 0.5 + 0.5 * capped; // keep in ~0.5..1.0 range
}

export class Ranker {
  scoreAll(cands: Candidate[], ctx: FeedContext): Array<OutputItem & { _cand: Candidate; _score: number }> {
    const w = ctx.mode === "personalized" ? Weights.personalized : Weights.discovery;

    return cands.map((c) => {
      const f = freshness(c.createdAt);
      const r = repNorm(c.author.reputationLevel);
      const e = engagement(c.stats);
      const cons = Math.max(0, Math.min(1, c.author.consistency));

      let score = w.freshness * f + w.rep * r + w.engagement * e + w.consistency * cons;
      // authenticity multiplicative gate
      score *= Math.max(0, Math.min(1, c.aiHumanScore));

      return {
        id: c.id,
        authorId: c.authorId,
        createdAt: c.createdAt,
        region: c.region,
        topics: c.topics,
        cohort: c.author.reputationLevel,
        baseScore: Number(score.toFixed(6)),
        _cand: c,
        _score: score,
      };
    });
  }
}
