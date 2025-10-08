import { describe, expect, it } from 'vitest';
import { Mixer } from '../pipeline/mixer';
import { OutputItem } from '../pipeline/types';
import { makeContext } from './testUtils';

const mixer = new Mixer();

describe('Mixer', () => {
  const makeItem = (
    id: string,
    region: string,
    baseScore: number,
    createdAt: string
  ): OutputItem => ({
    id,
    authorId: id,
    cohort: 3,
    baseScore,
    region,
    topics: [],
    createdAt,
  });

  it('respects different local/global ratios', () => {
    const halfItems = [
      ...Array.from({ length: 6 }, (_, idx) =>
        makeItem(`lh${idx}`, 'US', 1 - idx * 0.01, new Date().toISOString())
      ),
      ...Array.from({ length: 6 }, (_, idx) =>
        makeItem(`gh${idx}`, 'CA', 0.9 - idx * 0.01, new Date().toISOString())
      ),
    ];
    const halfResult = mixer.apply(
      halfItems,
      makeContext({ localToGlobalRatio: 0.5, pageSize: 12 })
    );
    expect(halfResult.filter(i => i.region === 'US')).toHaveLength(6);

    const ratioItems = [
      ...Array.from({ length: 2 }, (_, idx) =>
        makeItem(`l${idx}`, 'US', 1 - idx * 0.01, new Date().toISOString())
      ),
      ...Array.from({ length: 8 }, (_, idx) =>
        makeItem(`g${idx}`, 'CA', 0.9 - idx * 0.01, new Date().toISOString())
      ),
    ];
    const ratioResult = mixer.apply(
      ratioItems,
      makeContext({ localToGlobalRatio: 0.2, pageSize: 10 })
    );
    expect(ratioResult.filter(i => i.region === 'US')).toHaveLength(2);
    expect(ratioResult.filter(i => i.region !== 'US')).toHaveLength(8);
  });

  it('backfills from remaining pool when one side is short', () => {
    const items = [
      makeItem('l1', 'US', 0.9, new Date().toISOString()),
      makeItem('g1', 'CA', 0.8, new Date().toISOString()),
      makeItem('g2', 'CA', 0.7, new Date().toISOString()),
      makeItem('g3', 'CA', 0.6, new Date().toISOString()),
    ];

    const result = mixer.apply(items, makeContext({ localToGlobalRatio: 0.5, pageSize: 4 }));
    expect(result.filter(i => i.region === 'US')).toHaveLength(1);
    expect(result.filter(i => i.region !== 'US')).toHaveLength(3);
  });

  it('sorts chronologically versus balanced', () => {
    const now = Date.now();
    const items = [
      makeItem('old', 'US', 0.4, new Date(now - 3_000).toISOString()),
      makeItem('mid', 'CA', 0.6, new Date(now - 2_000).toISOString()),
      makeItem('new', 'US', 0.2, new Date(now).toISOString()),
    ];

    const chronological = mixer.apply(
      items,
      makeContext({ userPrefs: { rankMode: 'chronological' }, region: undefined })
    );
    expect(chronological.map(i => i.id)).toEqual(['new', 'mid', 'old']);

    const balanced = mixer.apply(
      items,
      makeContext({ userPrefs: { rankMode: 'balanced' }, region: undefined })
    );
    expect(balanced.map(i => i.id)).toEqual(['mid', 'old', 'new']);
  });
});
