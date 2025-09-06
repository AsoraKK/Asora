export function encodeCt(obj: any): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

export function decodeCt(ct: string): any {
  try {
    return JSON.parse(Buffer.from(ct, 'base64url').toString('utf8'));
  } catch {
    return undefined;
  }
}

// Merge arrays of items sorted by createdAt DESC; tie-break by id ASC
export function kWayMergeByCreatedAt(lists: any[][], limit: number): any[] {
  const cursors = lists.map(() => 0);
  const out: any[] = [];
  const getKey = (item: any) => ({ t: new Date(item.createdAt).getTime(), id: String(item.id || '') });

  while (out.length < limit) {
    let bestList = -1;
    let bestItem: any | undefined = undefined;
    for (let i = 0; i < lists.length; i++) {
      const idx = cursors[i];
      const arr = lists[i];
      if (idx >= arr.length) continue;
      const candidate = arr[idx];
      if (!bestItem) {
        bestItem = candidate; bestList = i;
      } else {
        const a = getKey(candidate);
        const b = getKey(bestItem);
        if (a.t > b.t || (a.t === b.t && a.id < b.id)) {
          bestItem = candidate; bestList = i;
        }
      }
    }
    if (bestList === -1) break; // all exhausted
    out.push(bestItem);
    cursors[bestList]++;
  }
  return out;
}

