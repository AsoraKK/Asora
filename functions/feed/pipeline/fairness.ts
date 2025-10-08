import { Fairness } from './config';
import { OutputItem, ReputationLevel } from './types';

export class FairnessPolicy {
  apply(
    items: Array<OutputItem & { _cand: unknown; _score: number }>,
    pageSize: number
  ): OutputItem[] {
    const byAuthorCount = new Map<string, number>();
    const authorOk = (a: string) => (byAuthorCount.get(a) ?? 0) < Fairness.perAuthorPageCap;

    const byCohort = new Map<
      ReputationLevel,
      Array<OutputItem & { _cand: unknown; _score: number }>
    >();
    for (const it of items) {
      if (!byCohort.has(it.cohort)) byCohort.set(it.cohort, []);
      byCohort.get(it.cohort)!.push(it);
    }
    for (const arr of byCohort.values()) arr.sort((a, b) => b._score - a._score);

    const scale = pageSize / 20;
    const floors = new Map<ReputationLevel, number>(
      Array.from(Fairness.floors.entries(), ([level, floor]) => [
        level as ReputationLevel,
        Math.floor(floor * scale),
      ])
    );
    const caps = new Map<ReputationLevel, number>(
      Array.from(Fairness.caps.entries(), ([level, cap]) => [
        level as ReputationLevel,
        Math.floor(cap * scale) || 1,
      ])
    );

    const out: OutputItem[] = [];

    for (const level of [1, 2, 3, 4, 5] as ReputationLevel[]) {
      const need = floors.get(level) ?? 0;
      const pool = byCohort.get(level) ?? [];
      let taken = 0;
      for (const it of pool) {
        if (out.length >= pageSize) break;
        if (!authorOk(it.authorId)) continue;
        if ((caps.get(level) ?? pageSize) <= countCohort(out, level)) continue;
        out.push(strip(it));
        byAuthorCount.set(it.authorId, (byAuthorCount.get(it.authorId) ?? 0) + 1);
        taken++;
        if (taken >= need) break;
      }
    }

    const exploreSlots = Math.max(0, Math.floor(pageSize * Fairness.exploreRatio));
    const rrOrder: ReputationLevel[] = [3, 2, 4, 1, 5];
    let explored = 0;
    while (explored < exploreSlots && out.length < pageSize) {
      let progressed = false;
      for (const lv of rrOrder) {
        const pool = byCohort.get(lv) ?? [];
        const next = pool.find(
          p =>
            !alreadyChosen(out, p) &&
            authorOk(p.authorId) &&
            countCohort(out, lv) < (caps.get(lv) ?? pageSize)
        );
        if (next) {
          out.push(strip(next));
          byAuthorCount.set(next.authorId, (byAuthorCount.get(next.authorId) ?? 0) + 1);
          explored++;
          progressed = true;
          if (explored >= exploreSlots || out.length >= pageSize) break;
        }
      }
      if (!progressed) break;
    }

    const allSorted = [...items].sort((a, b) => b._score - a._score);
    for (const it of allSorted) {
      if (out.length >= pageSize) break;
      const lv = it.cohort;
      if ((caps.get(lv) ?? pageSize) <= countCohort(out, lv)) continue;
      if (!authorOk(it.authorId)) continue;
      if (alreadyChosen(out, it)) continue;
      out.push(strip(it));
      byAuthorCount.set(it.authorId, (byAuthorCount.get(it.authorId) ?? 0) + 1);
    }

    return out.slice(0, pageSize);
  }
}

function countCohort(arr: OutputItem[], lv: ReputationLevel): number {
  return arr.reduce((n, x) => n + (x.cohort === lv ? 1 : 0), 0);
}

function alreadyChosen(arr: OutputItem[], it: OutputItem): boolean {
  return arr.some(x => x.id === it.id);
}

function strip<T extends OutputItem>(it: T): OutputItem {
  return {
    id: it.id,
    authorId: it.authorId,
    createdAt: it.createdAt,
    baseScore: it.baseScore,
    cohort: it.cohort,
    region: it.region,
    topics: it.topics,
  };
}
