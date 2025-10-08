import { OutputItem, FeedContext } from './types';

export class Mixer {
  apply(items: OutputItem[], ctx: FeedContext): OutputItem[] {
    if (!ctx.region) {
      return sortPerMode([...items], ctx);
    }

    const local = items.filter(i => i.region === ctx.region);
    const global = items.filter(i => i.region !== ctx.region);

    const needLocal = Math.floor(items.length * ctx.localToGlobalRatio);
    const needGlobal = items.length - needLocal;

    const out: OutputItem[] = [];
    out.push(...local.slice(0, needLocal));
    out.push(...global.slice(0, needGlobal));

    const shortage = items.length - out.length;
    if (shortage > 0) {
      const remainingLocal = local.slice(needLocal);
      const remainingGlobal = global.slice(needGlobal);
      const backfillPool = [...remainingLocal, ...remainingGlobal];
      out.push(...backfillPool.slice(0, shortage));
    }

    return sortPerMode(out, ctx);
  }
}

function sortPerMode(items: OutputItem[], ctx: FeedContext): OutputItem[] {
  if (ctx.userPrefs.rankMode === 'chronological') {
    items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  } else {
    items.sort((a, b) => b.baseScore - a.baseScore);
  }
  return items;
}
