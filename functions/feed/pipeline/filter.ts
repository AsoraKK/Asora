import { Candidate, FeedContext } from "./types";
import { Moderation } from "./config";

export class Filter {
  apply(cands: Candidate[], ctx: FeedContext, followingSet: Set<string>): Candidate[] {
    const { hardFilters } = ctx;

    return cands.filter((c) => {
      // moderation gate
      if (c.aiHumanScore < Moderation.aiBlockThreshold) return false; // AI-likely blocked

      // follow-only
      if (hardFilters.followOnly && !followingSet.has(c.authorId)) return false;

      // regions
      if (hardFilters.regions && hardFilters.regions.length > 0) {
        if (!c.region || !hardFilters.regions.includes(c.region)) return false;
      }

      // include topics
      if (hardFilters.includeTopics && hardFilters.includeTopics.length > 0) {
        const topics = c.topics ?? [];
        if (!hardFilters.includeTopics.some((t) => topics.includes(t))) return false;
      }

      // include keywords
      if (hardFilters.includeKeywords && hardFilters.includeKeywords.length > 0) {
        const kw = (c.keywords ?? []).map((k) => k.toLowerCase());
        if (!hardFilters.includeKeywords.some((i) => kw.includes(i.toLowerCase()))) return false;
      }

      // exclude keywords
      if (hardFilters.excludeKeywords && hardFilters.excludeKeywords.length > 0) {
        const kw = (c.keywords ?? []).map((k) => k.toLowerCase());
        if (hardFilters.excludeKeywords.some((e) => kw.includes(e.toLowerCase()))) return false;
      }

      return true;
    });
  }
}
