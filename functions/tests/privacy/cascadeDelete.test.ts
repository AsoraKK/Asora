/**
 * Cascade Delete Service Tests
 *
 * Tests for GDPR/POPIA compliant user data deletion and anonymization.
 * Uses seeded test data to verify complete PII removal.
 */

import {
  executeCascadeDelete,
  verifyUserDataPurged,
  ANONYMIZATION_MARKER,
  ANONYMIZED_EMAIL,
  CascadeDeleteResult,
} from '../../src/privacy/service/cascadeDelete';

// Mock Cosmos DB
const mockCosmosDelete = jest.fn();
const mockCosmosReplace = jest.fn();
const mockCosmosFetchAll = jest.fn();

jest.mock('@shared/clients/cosmos', () => ({
  getCosmosDatabase: jest.fn(() => ({
    container: jest.fn((name: string) => ({
      items: {
        query: jest.fn(() => ({
          fetchAll: () => mockCosmosFetchAll(name),
        })),
      },
      item: jest.fn((id: string, partitionKey: string) => ({
        delete: () => mockCosmosDelete(name, id, partitionKey),
        replace: (doc: unknown) => mockCosmosReplace(name, id, doc),
      })),
    })),
  })),
}));

// Mock Postgres
const mockPgQuery = jest.fn();
jest.mock('@shared/clients/postgres', () => ({
  withClient: jest.fn(async (fn: (client: { query: typeof mockPgQuery }) => Promise<unknown>) => {
    return fn({ query: mockPgQuery });
  }),
}));

// Mock legal hold check
const mockHasLegalHold = jest.fn();
jest.mock('../../src/privacy/service/dsrStore', () => ({
  hasLegalHold: (...args: unknown[]) => mockHasLegalHold(...args),
}));

// Test data seed
const TEST_USER_ID = 'user-12345-to-delete';
const TEST_USER_EMAIL = 'deleteme@example.com';

interface SeedData {
  [container: string]: Array<Record<string, unknown>>;
}

function createSeedData(): SeedData {
  return {
    users: [
      {
        id: TEST_USER_ID,
        email: TEST_USER_EMAIL,
        displayName: 'Delete Me',
        createdAt: '2024-01-01T00:00:00Z',
      },
    ],
    posts: [
      {
        id: 'post-1',
        authorId: TEST_USER_ID,
        authorName: 'Delete Me',
        authorEmail: TEST_USER_EMAIL,
        text: 'My first post',
        createdAt: '2024-01-02T00:00:00Z',
      },
      {
        id: 'post-2',
        authorId: TEST_USER_ID,
        authorName: 'Delete Me',
        text: 'My second post',
        createdAt: '2024-01-03T00:00:00Z',
      },
    ],
    comments: [
      {
        id: 'comment-1',
        authorId: TEST_USER_ID,
        authorName: 'Delete Me',
        postId: 'other-post',
        text: 'Great post!',
        createdAt: '2024-01-04T00:00:00Z',
      },
    ],
    likes: [
      {
        id: 'like-1',
        userId: TEST_USER_ID,
        postId: 'other-post-1',
        createdAt: '2024-01-05T00:00:00Z',
      },
      {
        id: 'like-2',
        userId: TEST_USER_ID,
        postId: 'other-post-2',
        createdAt: '2024-01-06T00:00:00Z',
      },
    ],
    content_flags: [
      {
        id: 'flag-1',
        flaggedBy: TEST_USER_ID,
        flaggedByName: 'Delete Me',
        contentId: 'spam-post',
        reason: 'spam',
        createdAt: '2024-01-07T00:00:00Z',
      },
    ],
    appeals: [
      {
        id: 'appeal-1',
        submitterId: TEST_USER_ID,
        submitterName: 'Delete Me',
        submitterEmail: TEST_USER_EMAIL,
        moderationId: 'mod-123',
        reason: 'Wrongly flagged',
        createdAt: '2024-01-08T00:00:00Z',
      },
    ],
    appeal_votes: [
      {
        id: 'vote-1',
        voterId: TEST_USER_ID,
        appealId: 'appeal-other',
        vote: 'approve',
        createdAt: '2024-01-09T00:00:00Z',
      },
    ],
  };
}

describe('cascadeDelete service', () => {
  let seedData: SeedData;

  beforeEach(() => {
    jest.clearAllMocks();
    seedData = createSeedData();

    // Setup Cosmos mock to return seeded data
    mockCosmosFetchAll.mockImplementation((containerName: string) => {
      return Promise.resolve({ resources: seedData[containerName] ?? [] });
    });

    // Setup delete mock
    mockCosmosDelete.mockResolvedValue({});

    // Setup replace mock
    mockCosmosReplace.mockResolvedValue({});

    // No legal holds by default
    mockHasLegalHold.mockResolvedValue(false);

    // Setup Postgres mock
    mockPgQuery.mockResolvedValue({ rowCount: 1 });
  });

  describe('executeCascadeDelete', () => {
    it('deletes likes entirely', async () => {
      const result = await executeCascadeDelete({
        userId: TEST_USER_ID,
        deletedBy: 'test',
        skipHoldCheck: true,
      });

      // Verify likes were deleted (not anonymized)
      expect(mockCosmosDelete).toHaveBeenCalledWith('likes', 'like-1', 'like-1');
      expect(mockCosmosDelete).toHaveBeenCalledWith('likes', 'like-2', 'like-2');
      expect(result.cosmos.deleted['likes']).toBe(2);
    });

    it('deletes appeal_votes entirely', async () => {
      const result = await executeCascadeDelete({
        userId: TEST_USER_ID,
        deletedBy: 'test',
        skipHoldCheck: true,
      });

      expect(mockCosmosDelete).toHaveBeenCalledWith('appeal_votes', 'vote-1', 'vote-1');
      expect(result.cosmos.deleted['appeal_votes']).toBe(1);
    });

    it('deletes user record entirely', async () => {
      const result = await executeCascadeDelete({
        userId: TEST_USER_ID,
        deletedBy: 'test',
        skipHoldCheck: true,
      });

      expect(mockCosmosDelete).toHaveBeenCalledWith('users', TEST_USER_ID, TEST_USER_ID);
      expect(result.cosmos.deleted['users']).toBe(1);
    });

    it('anonymizes posts (replaces authorId with marker)', async () => {
      const result = await executeCascadeDelete({
        userId: TEST_USER_ID,
        deletedBy: 'test',
        skipHoldCheck: true,
      });

      // Check that posts were anonymized, not deleted
      expect(result.cosmos.anonymized['posts']).toBe(2);

      // Verify the replace calls anonymized the author fields
      const postReplaceCalls = mockCosmosReplace.mock.calls.filter(
        (call: unknown[]) => call[0] === 'posts'
      );
      expect(postReplaceCalls.length).toBe(2);

      // Check anonymized fields
      for (const call of postReplaceCalls) {
        const doc = call[2] as Record<string, unknown>;
        expect(doc.authorId).toBe(ANONYMIZATION_MARKER);
        expect(doc.authorName).toBe(ANONYMIZATION_MARKER);
        expect(doc.anonymized).toBe(true);
        expect(doc.anonymizedBy).toBe('test');
        // Text content should be preserved
        expect(doc.text).toBeDefined();
      }
    });

    it('anonymizes comments', async () => {
      const result = await executeCascadeDelete({
        userId: TEST_USER_ID,
        deletedBy: 'test',
        skipHoldCheck: true,
      });

      expect(result.cosmos.anonymized['comments']).toBe(1);

      const commentReplaceCalls = mockCosmosReplace.mock.calls.filter(
        (call: unknown[]) => call[0] === 'comments'
      );
      expect(commentReplaceCalls.length).toBe(1);

      const doc = commentReplaceCalls[0][2] as Record<string, unknown>;
      expect(doc.authorId).toBe(ANONYMIZATION_MARKER);
      expect(doc.text).toBe('Great post!'); // Content preserved
    });

    it('anonymizes content_flags', async () => {
      const result = await executeCascadeDelete({
        userId: TEST_USER_ID,
        deletedBy: 'test',
        skipHoldCheck: true,
      });

      expect(result.cosmos.anonymized['content_flags']).toBe(1);

      const flagReplaceCalls = mockCosmosReplace.mock.calls.filter(
        (call: unknown[]) => call[0] === 'content_flags'
      );
      const doc = flagReplaceCalls[0][2] as Record<string, unknown>;
      expect(doc.flaggedBy).toBe(ANONYMIZATION_MARKER);
    });

    it('anonymizes appeals with email marker', async () => {
      const result = await executeCascadeDelete({
        userId: TEST_USER_ID,
        deletedBy: 'test',
        skipHoldCheck: true,
      });

      expect(result.cosmos.anonymized['appeals']).toBe(1);

      const appealReplaceCalls = mockCosmosReplace.mock.calls.filter(
        (call: unknown[]) => call[0] === 'appeals'
      );
      const doc = appealReplaceCalls[0][2] as Record<string, unknown>;
      expect(doc.submitterId).toBe(ANONYMIZATION_MARKER);
      expect(doc.submitterEmail).toBe(ANONYMIZED_EMAIL);
    });

    it('deletes Postgres records (users, profiles, auth_identities, follows)', async () => {
      const result = await executeCascadeDelete({
        userId: TEST_USER_ID,
        deletedBy: 'test',
        skipHoldCheck: true,
      });

      // Verify DELETE queries were executed
      expect(mockPgQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM follows'),
        [TEST_USER_ID]
      );
      expect(mockPgQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM profiles'),
        [TEST_USER_ID]
      );
      expect(mockPgQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM auth_identities'),
        [TEST_USER_ID]
      );
      expect(mockPgQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM users'),
        [TEST_USER_ID]
      );

      expect(result.postgres.deleted['follows']).toBe(1);
      expect(result.postgres.deleted['users']).toBe(1);
    });

    it('respects legal hold on user', async () => {
      mockHasLegalHold.mockResolvedValue(true);

      const result = await executeCascadeDelete({
        userId: TEST_USER_ID,
        deletedBy: 'test',
      });

      // Should have error about legal hold
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]!.error).toContain('legal hold');

      // No deletions should have occurred
      expect(mockCosmosDelete).not.toHaveBeenCalled();
      expect(mockCosmosReplace).not.toHaveBeenCalled();
    });

    it('skips individual posts with legal hold', async () => {
      // Hold on specific post, not on user
      mockHasLegalHold.mockImplementation((scope: string, id: string) => {
        if (scope === 'post' && id === 'post-1') return Promise.resolve(true);
        return Promise.resolve(false);
      });

      const result = await executeCascadeDelete({
        userId: TEST_USER_ID,
        deletedBy: 'test',
      });

      // One post should be skipped
      expect(result.cosmos.skippedDueToHold['posts']).toBe(1);
      // Other post should be anonymized
      expect(result.cosmos.anonymized['posts']).toBe(1);
    });

    it('includes deletedBy in audit metadata', async () => {
      const result = await executeCascadeDelete({
        userId: TEST_USER_ID,
        deletedBy: 'dsr:request-123',
        skipHoldCheck: true,
      });

      expect(result.deletedBy).toBe('dsr:request-123');

      // Check that anonymized records include the deletedBy
      const postReplaceCalls = mockCosmosReplace.mock.calls.filter(
        (call: unknown[]) => call[0] === 'posts'
      );
      const doc = postReplaceCalls[0][2] as Record<string, unknown>;
      expect(doc.anonymizedBy).toBe('dsr:request-123');
    });

    it('handles Cosmos errors gracefully', async () => {
      mockCosmosDelete.mockRejectedValueOnce(new Error('Cosmos timeout'));

      const result = await executeCascadeDelete({
        userId: TEST_USER_ID,
        deletedBy: 'test',
        skipHoldCheck: true,
      });

      // Should have recorded the error but continued
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.error.includes('Cosmos timeout'))).toBe(true);
    });

    it('handles Postgres errors gracefully', async () => {
      mockPgQuery.mockRejectedValue(new Error('PG connection failed'));

      const result = await executeCascadeDelete({
        userId: TEST_USER_ID,
        deletedBy: 'test',
        skipHoldCheck: true,
      });

      // Should have recorded the error
      expect(result.errors.some(e => e.error.includes('Postgres'))).toBe(true);
    });
  });

  describe('verifyUserDataPurged', () => {
    it('returns purged=true when no data remains', async () => {
      // After deletion, containers return empty
      mockCosmosFetchAll.mockResolvedValue({ resources: [] });
      mockPgQuery.mockResolvedValue({ rows: [{ count: '0' }] });

      const result = await verifyUserDataPurged(TEST_USER_ID);

      expect(result.purged).toBe(true);
      expect(result.remaining).toHaveLength(0);
    });

    it('returns purged=false when Cosmos data remains', async () => {
      // Simulate leftover post with original userId
      mockCosmosFetchAll.mockImplementation((containerName: string) => {
        if (containerName === 'posts') {
          return Promise.resolve({
            resources: [{ id: 'post-1', authorId: TEST_USER_ID }],
          });
        }
        return Promise.resolve({ resources: [] });
      });
      mockPgQuery.mockResolvedValue({ rows: [{ count: '0' }] });

      const result = await verifyUserDataPurged(TEST_USER_ID);

      expect(result.purged).toBe(false);
      expect(result.remaining).toContainEqual({ location: 'cosmos:posts', count: 1 });
    });

    it('returns purged=false when Postgres data remains', async () => {
      mockCosmosFetchAll.mockResolvedValue({ resources: [] });
      mockPgQuery.mockImplementation((query: string) => {
        if (query.includes('users')) {
          return Promise.resolve({ rows: [{ count: '1' }] });
        }
        return Promise.resolve({ rows: [{ count: '0' }] });
      });

      const result = await verifyUserDataPurged(TEST_USER_ID);

      expect(result.purged).toBe(false);
      expect(result.remaining.some(r => r.location === 'postgres:users')).toBe(true);
    });

    it('ignores anonymized records (authorId replaced with marker)', async () => {
      // Post has been anonymized - authorId is now the marker
      mockCosmosFetchAll.mockImplementation((containerName: string) => {
        if (containerName === 'posts') {
          return Promise.resolve({
            resources: [{ id: 'post-1', authorId: ANONYMIZATION_MARKER, anonymized: true }],
          });
        }
        return Promise.resolve({ resources: [] });
      });
      mockPgQuery.mockResolvedValue({ rows: [{ count: '0' }] });

      const result = await verifyUserDataPurged(TEST_USER_ID);

      // Anonymized records should not count as remaining user data
      expect(result.purged).toBe(true);
    });
  });

  describe('full cascade delete flow', () => {
    it('completely removes user PII from all locations', async () => {
      // Execute deletion
      const deleteResult = await executeCascadeDelete({
        userId: TEST_USER_ID,
        deletedBy: 'gdpr-request',
        skipHoldCheck: true,
      });

      expect(deleteResult.errors).toHaveLength(0);

      // Verify totals
      const totalDeleted =
        Object.values(deleteResult.cosmos.deleted).reduce((a, b) => a + b, 0) +
        Object.values(deleteResult.postgres.deleted).reduce((a, b) => a + b, 0);
      const totalAnonymized = Object.values(deleteResult.cosmos.anonymized).reduce((a, b) => a + b, 0);

      // Should have deleted: user, 2 likes, 1 appeal_vote + postgres records
      expect(deleteResult.cosmos.deleted['users']).toBe(1);
      expect(deleteResult.cosmos.deleted['likes']).toBe(2);
      expect(deleteResult.cosmos.deleted['appeal_votes']).toBe(1);

      // Should have anonymized: 2 posts, 1 comment, 1 flag, 1 appeal
      expect(deleteResult.cosmos.anonymized['posts']).toBe(2);
      expect(deleteResult.cosmos.anonymized['comments']).toBe(1);
      expect(deleteResult.cosmos.anonymized['content_flags']).toBe(1);
      expect(deleteResult.cosmos.anonymized['appeals']).toBe(1);
    });

    it('no original userId or email remains after deletion', async () => {
      // Execute deletion
      await executeCascadeDelete({
        userId: TEST_USER_ID,
        deletedBy: 'gdpr-request',
        skipHoldCheck: true,
      });

      // Check all replace calls don't contain original user data
      for (const call of mockCosmosReplace.mock.calls) {
        const doc = call[2] as Record<string, unknown>;
        const docStr = JSON.stringify(doc);

        // Original userId should not appear
        expect(docStr).not.toContain(TEST_USER_ID);
        // Original email should not appear
        expect(docStr).not.toContain(TEST_USER_EMAIL);
      }
    });
  });
});

describe('cascadeDelete integration with deleteJob', () => {
  // Integration test to ensure deleteJob properly uses cascadeDelete
  // This is tested more thoroughly in privacyAdmin.deleteJob.test.ts

  it('exports the expected interface', async () => {
    expect(typeof executeCascadeDelete).toBe('function');
    expect(typeof verifyUserDataPurged).toBe('function');
    expect(ANONYMIZATION_MARKER).toBe('[deleted]');
    expect(ANONYMIZED_EMAIL).toBe('deleted@anonymized.local');
  });
});
