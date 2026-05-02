/// <reference types="jest" />
/**
 * Custom Feeds Service Tests — Workstream 10
 *
 * Direct service-layer tests for:
 *  - Per-tier custom feed limits (Free=1, Premium=2, Black=3, Admin=20)
 *  - Invalid tier falls back to free (limit=1)
 *  - Keyword normalisation (trim, lowercase, deduplicate)
 *  - Account deduplication
 *  - Cursor pagination (nextCursor returned when more rows exist)
 *  - Update preserves untouched fields
 *  - Delete returns true/false correctly
 *  - Ownership isolation (getCustomFeed null for wrong owner)
 *  - countCustomFeeds accuracy
 */

// ─────────────────────────────────────────────────────────────────────────────
// In-memory store
// ─────────────────────────────────────────────────────────────────────────────

const feedStore = new Map<string, any>();

function buildContainer() {
  return {
    items: {
      create: jest.fn(async (doc: any) => {
        feedStore.set(doc.id, { ...doc });
        return { resource: doc };
      }),
      query: jest.fn(({ query, parameters }: any, _opts?: any) => ({
        fetchAll: async () => {
          const ownerId = parameters?.find((p: any) => p.name === '@ownerId')?.value;

          // COUNT query
          if (query.includes('COUNT(1)')) {
            const count = [...feedStore.values()].filter((d) => d.ownerId === ownerId).length;
            return { resources: [count] };
          }

          // LIST query — simple filter by ownerId, honour @limit
          const limitParam = parameters?.find((p: any) => p.name === '@limit');
          const limit = limitParam ? limitParam.value : 50;
          const cursorTs = parameters?.find((p: any) => p.name === '@cursorTs')?.value;
          const cursorId = parameters?.find((p: any) => p.name === '@cursorId')?.value;

          let rows = [...feedStore.values()].filter((d) => d.ownerId === ownerId);

          if (cursorTs !== undefined && cursorId !== undefined) {
            rows = rows.filter(
              (d) => d.createdAt < cursorTs || (d.createdAt === cursorTs && d.id < cursorId)
            );
          }

          // Sort desc
          rows.sort((a, b) =>
            b.createdAt !== a.createdAt ? b.createdAt - a.createdAt : b.id < a.id ? -1 : 1
          );

          return { resources: rows.slice(0, limit) };
        },
      })),
    },
    item: jest.fn((id: string, partitionKey: string) => ({
      read: jest.fn(async () => {
        const doc = feedStore.get(id);
        if (!doc || doc.ownerId !== partitionKey) {
          const err: any = new Error('Not found');
          err.code = 404;
          throw err;
        }
        return { resource: { ...doc } };
      }),
      replace: jest.fn(async (doc: any) => {
        feedStore.set(doc.id, { ...doc });
        return { resource: doc };
      }),
      delete: jest.fn(async () => {
        const doc = feedStore.get(id);
        if (!doc) {
          const err: any = new Error('Not found');
          err.code = 404;
          throw err;
        }
        feedStore.delete(id);
        return {};
      }),
    })),
  };
}

const cosmosContainer = buildContainer();

jest.mock('@shared/clients/cosmos', () => ({
  getTargetDatabase: jest.fn(() => ({
    customFeeds: cosmosContainer,
    posts: { items: { query: jest.fn(() => ({ fetchAll: async () => ({ resources: [] }) })) } },
  })),
}));

// Mock postsService.enrichPost (used by getCustomFeedItems)
jest.mock('@posts/service/postsService', () => ({
  postsService: {
    enrichPost: jest.fn(async (doc: any) => doc),
  },
}));

jest.mock('@shared/utils/errors', () => ({
  HttpError: class HttpError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  notFoundError: (msg: string) => {
    const e: any = new Error(msg);
    e.status = 404;
    return e;
  },
}));

import {
  countCustomFeeds,
  createCustomFeed,
  getCustomFeed,
  updateCustomFeed,
  deleteCustomFeed,
  listCustomFeeds,
} from '../../src/custom-feeds/customFeedsService';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function minPayload(name = 'My Feed') {
  return { name, contentType: 'text' as const, sorting: 'new' as const };
}

beforeEach(() => {
  feedStore.clear();
  jest.clearAllMocks();
  // Rebuild container mocks after clearing store
  cosmosContainer.items.create.mockImplementation(async (doc: any) => {
    feedStore.set(doc.id, { ...doc });
    return { resource: doc };
  });
  cosmosContainer.items.query.mockImplementation(
    ({ query, parameters }: any, _opts?: any) => ({
      fetchAll: async () => {
        const ownerId = parameters?.find((p: any) => p.name === '@ownerId')?.value;
        if (query.includes('COUNT(1)')) {
          const count = [...feedStore.values()].filter((d) => d.ownerId === ownerId).length;
          return { resources: [count] };
        }
        const limitParam = parameters?.find((p: any) => p.name === '@limit');
        const limit = limitParam ? limitParam.value : 50;
        const cursorTs = parameters?.find((p: any) => p.name === '@cursorTs')?.value;
        const cursorId = parameters?.find((p: any) => p.name === '@cursorId')?.value;
        let rows = [...feedStore.values()].filter((d) => d.ownerId === ownerId);
        if (cursorTs !== undefined && cursorId !== undefined) {
          rows = rows.filter(
            (d) => d.createdAt < cursorTs || (d.createdAt === cursorTs && d.id < cursorId)
          );
        }
        rows.sort((a, b) =>
          b.createdAt !== a.createdAt ? b.createdAt - a.createdAt : b.id < a.id ? -1 : 1
        );
        return { resources: rows.slice(0, limit) };
      },
    })
  );
  cosmosContainer.item.mockImplementation((id: string, partitionKey: string) => ({
    read: jest.fn(async () => {
      const doc = feedStore.get(id);
      if (!doc || doc.ownerId !== partitionKey) {
        const err: any = new Error('Not found');
        err.code = 404;
        throw err;
      }
      return { resource: { ...doc } };
    }),
    replace: jest.fn(async (doc: any) => {
      feedStore.set(doc.id, { ...doc });
      return { resource: doc };
    }),
    delete: jest.fn(async () => {
      const doc = feedStore.get(id);
      if (!doc) {
        const err: any = new Error('Not found');
        err.code = 404;
        throw err;
      }
      feedStore.delete(id);
      return {};
    }),
  }));
});

// ─────────────────────────────────────────────────────────────────────────────
// countCustomFeeds
// ─────────────────────────────────────────────────────────────────────────────

describe('countCustomFeeds', () => {
  it('returns 0 when no feeds exist', async () => {
    expect(await countCustomFeeds('owner-a')).toBe(0);
  });

  it('counts only feeds belonging to the owner', async () => {
    await createCustomFeed('owner-a', minPayload('Feed 1'), 'black');
    await createCustomFeed('owner-b', minPayload('Feed B'), 'black');
    expect(await countCustomFeeds('owner-a')).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tier custom feed limits
// ─────────────────────────────────────────────────────────────────────────────

describe('createCustomFeed — tier limits', () => {
  it('free tier: allows 1 feed then rejects the 2nd with 403', async () => {
    await createCustomFeed('user-free', minPayload('Feed 1'), 'free');

    await expect(createCustomFeed('user-free', minPayload('Feed 2'), 'free')).rejects.toMatchObject(
      { status: 403 }
    );
  });

  it('premium tier: allows 2 feeds then rejects the 3rd', async () => {
    await createCustomFeed('user-premium', minPayload('Feed 1'), 'premium');
    await createCustomFeed('user-premium', minPayload('Feed 2'), 'premium');

    await expect(
      createCustomFeed('user-premium', minPayload('Feed 3'), 'premium')
    ).rejects.toMatchObject({ status: 403 });
  });

  it('black tier: allows 3 feeds then rejects the 4th', async () => {
    await createCustomFeed('user-black', minPayload('Feed 1'), 'black');
    await createCustomFeed('user-black', minPayload('Feed 2'), 'black');
    await createCustomFeed('user-black', minPayload('Feed 3'), 'black');

    await expect(
      createCustomFeed('user-black', minPayload('Feed 4'), 'black')
    ).rejects.toMatchObject({ status: 403 });
  });

  it('admin tier: allows 20 feeds', async () => {
    for (let i = 0; i < 20; i++) {
      await createCustomFeed('user-admin', minPayload(`Feed ${i}`), 'admin');
    }
    await expect(
      createCustomFeed('user-admin', minPayload('Feed 21'), 'admin')
    ).rejects.toMatchObject({ status: 403 });
  });

  it('invalid/unknown tier falls back to free limit (1)', async () => {
    await createCustomFeed('user-unknown', minPayload('Feed 1'), 'nonexistent');

    await expect(
      createCustomFeed('user-unknown', minPayload('Feed 2'), 'nonexistent')
    ).rejects.toMatchObject({ status: 403 });
  });

  it('undefined tier falls back to free limit (1)', async () => {
    await createCustomFeed('user-notier', minPayload('Feed 1'), undefined);

    await expect(
      createCustomFeed('user-notier', minPayload('Feed 2'), undefined)
    ).rejects.toMatchObject({ status: 403 });
  });

  it('legacy tier "black" (canonical) maps correctly to 3', async () => {
    for (let i = 0; i < 3; i++) {
      await createCustomFeed('user-black2', minPayload(`F${i}`), 'black');
    }
    const count = await countCustomFeeds('user-black2');
    expect(count).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Keyword normalisation
// ─────────────────────────────────────────────────────────────────────────────

describe('createCustomFeed — keyword normalisation', () => {
  it('trims and lowercases include keywords', async () => {
    const feed = await createCustomFeed('owner-kw', {
      ...minPayload(),
      includeKeywords: ['  Hello ', 'WORLD', '  Foo  '],
    });

    expect(feed.includeKeywords).toEqual(['hello', 'world', 'foo']);
  });

  it('deduplicates include keywords', async () => {
    const feed = await createCustomFeed('owner-kw-dup', {
      ...minPayload(),
      includeKeywords: ['tech', 'Tech', 'TECH'],
    });

    expect(feed.includeKeywords).toEqual(['tech']);
  });

  it('normalises exclude keywords the same way', async () => {
    const feed = await createCustomFeed('owner-kw-ex', {
      ...minPayload(),
      excludeKeywords: ['Spam', '  SPAM', 'spam'],
    });

    expect(feed.excludeKeywords).toEqual(['spam']);
  });

  it('handles undefined keyword arrays gracefully', async () => {
    const feed = await createCustomFeed('owner-kw-undef', minPayload());
    expect(feed.includeKeywords).toEqual([]);
    expect(feed.excludeKeywords).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Account deduplication
// ─────────────────────────────────────────────────────────────────────────────

describe('createCustomFeed — account deduplication', () => {
  it('deduplicates includeAccounts', async () => {
    const feed = await createCustomFeed('owner-acct', {
      ...minPayload(),
      includeAccounts: ['uid-1', 'uid-2', 'uid-1'],
    });

    expect(feed.includeAccounts).toHaveLength(2);
    expect(feed.includeAccounts).toContain('uid-1');
    expect(feed.includeAccounts).toContain('uid-2');
  });

  it('deduplicates excludeAccounts', async () => {
    const feed = await createCustomFeed('owner-acct2', {
      ...minPayload(),
      excludeAccounts: ['uid-3', 'uid-3'],
    });

    expect(feed.excludeAccounts).toEqual(['uid-3']);
  });

  it('filters empty/falsy account entries', async () => {
    const feed = await createCustomFeed('owner-acct3', {
      ...minPayload(),
      includeAccounts: ['uid-1', '', 'uid-2'],
    });

    expect(feed.includeAccounts).toEqual(['uid-1', 'uid-2']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getCustomFeed — ownership isolation
// ─────────────────────────────────────────────────────────────────────────────

describe('getCustomFeed', () => {
  it('returns the feed for the correct owner', async () => {
    const created = await createCustomFeed('owner-iso', minPayload());
    const found = await getCustomFeed('owner-iso', created.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.id);
  });

  it('returns null when feedId belongs to a different owner', async () => {
    const created = await createCustomFeed('owner-iso2', minPayload());
    const found = await getCustomFeed('owner-different', created.id);
    expect(found).toBeNull();
  });

  it('returns null for a non-existent feedId', async () => {
    const found = await getCustomFeed('owner-iso3', 'does-not-exist');
    expect(found).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateCustomFeed
// ─────────────────────────────────────────────────────────────────────────────

describe('updateCustomFeed', () => {
  it('updates name only, preserving other fields', async () => {
    const feed = await createCustomFeed('owner-upd', {
      ...minPayload('Original'),
      includeKeywords: ['news'],
    });

    const updated = await updateCustomFeed('owner-upd', feed.id, { name: 'Renamed' });

    expect(updated?.name).toBe('Renamed');
    expect(updated?.includeKeywords).toEqual(['news']);
  });

  it('normalises keywords on update', async () => {
    const feed = await createCustomFeed('owner-upd2', minPayload());
    const updated = await updateCustomFeed('owner-upd2', feed.id, {
      includeKeywords: ['  Tech ', 'TECH'],
    });

    expect(updated?.includeKeywords).toEqual(['tech']);
  });

  it('returns null for non-existent feed', async () => {
    const result = await updateCustomFeed('owner-upd3', 'ghost-id', { name: 'X' });
    expect(result).toBeNull();
  });

  it('updates updatedAt timestamp', async () => {
    const feed = await createCustomFeed('owner-upd4', minPayload());
    const before = new Date(feed.updatedAt).getTime();

    // Small delay to ensure timestamp differs
    await new Promise((r) => setTimeout(r, 5));
    const updated = await updateCustomFeed('owner-upd4', feed.id, { name: 'New Name' });

    const after = new Date(updated!.updatedAt).getTime();
    expect(after).toBeGreaterThanOrEqual(before);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deleteCustomFeed
// ─────────────────────────────────────────────────────────────────────────────

describe('deleteCustomFeed', () => {
  it('returns true and removes the feed', async () => {
    const feed = await createCustomFeed('owner-del', minPayload());
    const result = await deleteCustomFeed('owner-del', feed.id);

    expect(result).toBe(true);
    expect(await getCustomFeed('owner-del', feed.id)).toBeNull();
  });

  it('returns false for a non-existent feed', async () => {
    const result = await deleteCustomFeed('owner-del2', 'no-such-id');
    expect(result).toBe(false);
  });

  it('allows re-creating a feed after deletion (limit resets)', async () => {
    const feed = await createCustomFeed('owner-del3', minPayload(), 'free');
    await deleteCustomFeed('owner-del3', feed.id);
    const newFeed = await createCustomFeed('owner-del3', minPayload('New'), 'free');
    expect(newFeed.id).not.toBe(feed.id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// listCustomFeeds — pagination
// ─────────────────────────────────────────────────────────────────────────────

describe('listCustomFeeds — cursor pagination', () => {
  it('returns all feeds when count is within page size', async () => {
    await createCustomFeed('owner-pag', minPayload('F1'), 'black');
    await createCustomFeed('owner-pag', minPayload('F2'), 'black');

    const { feeds, nextCursor } = await listCustomFeeds('owner-pag');
    expect(feeds).toHaveLength(2);
    expect(nextCursor).toBeUndefined();
  });

  it('returns nextCursor when there are more results', async () => {
    // Create 3 feeds but request only 2 per page
    await createCustomFeed('owner-pag2', minPayload('F1'), 'admin');
    await createCustomFeed('owner-pag2', minPayload('F2'), 'admin');
    await createCustomFeed('owner-pag2', minPayload('F3'), 'admin');

    const { feeds, nextCursor } = await listCustomFeeds('owner-pag2', undefined, 2);
    expect(feeds).toHaveLength(2);
    expect(nextCursor).toBeDefined();
  });

  it('returns empty array and no cursor for owner with no feeds', async () => {
    const { feeds, nextCursor } = await listCustomFeeds('owner-empty');
    expect(feeds).toEqual([]);
    expect(nextCursor).toBeUndefined();
  });
});
