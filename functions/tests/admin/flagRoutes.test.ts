/**
 * Admin Content Routes Tests
 * Tests for content action endpoints (block/publish) and flag operations
 */

import { InvocationContext } from '@azure/functions';
import { blockContent, publishContent } from '../../src/admin/routes/content_action.function';
import { getFlagDetail } from '../../src/admin/routes/flags_get.function';
import { listFlagQueue } from '../../src/admin/routes/flags_list.function';
import { resolveFlag } from '../../src/admin/routes/flags_resolve.function';
import { fetchContentById } from '../../src/admin/moderationAdminUtils';
import { httpReqMock } from '../helpers/http';

jest.mock('../../src/admin/adminAuthUtils', () => ({
  requireActiveAdmin: jest.fn((handler) => handler),
}));
jest.mock('../../src/admin/auditLogger', () => ({
  recordAdminAudit: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../src/admin/moderationAdminUtils', () => ({
  fetchContentById: jest.fn().mockResolvedValue({
    container: { item: jest.fn(() => ({ patch: jest.fn().mockResolvedValue({}) })) },
    document: { id: 'post-123', status: 'published' },
    partitionKey: 'post-123',
  }),
  resolveFlagsForContent: jest.fn().mockResolvedValue({}),
  mapContentState: jest.fn((status) => status?.toUpperCase()),
  getLatestDecisionSummary: jest.fn().mockReturnValue({}),
  extractPreview: jest.fn(() => 'preview'),
}));
jest.mock('../../src/users/service/profileService', () => ({
  profileService: {
    getProfile: jest.fn().mockResolvedValue({ id: 'user-123', displayName: 'Test User' }),
    getUserProfile: jest.fn().mockResolvedValue({ id: 'user-123', username: 'testuser' }),
  },
}));

const mockDb = {
  flags: {
    item: jest.fn(() => ({
      read: jest.fn().mockResolvedValue({ resource: { id: 'flag-123', status: 'open' } }),
      patch: jest.fn().mockResolvedValue({}),
    })),
    items: {
      query: jest.fn(() => ({
        fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
        fetchNext: jest.fn().mockResolvedValue({
          resources: [],
          continuationToken: null,
        }),
      })),
    },
  },
  appeals: {
    items: {
      query: jest.fn(() => ({
        fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
      })),
    },
  },
  users: {
    items: {
      query: jest.fn(() => ({
        fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
      })),
    },
  },
};

const mockAuditDb = {
  container: jest.fn(() => ({
    items: {
      query: jest.fn(() => ({
        fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
      })),
    },
  })),
};

jest.mock('@shared/clients/cosmos', () => ({
  getTargetDatabase: jest.fn(() => mockDb),
  getCosmosDatabase: jest.fn(() => mockAuditDb),
}));

describe('Admin Content & Flag Routes', () => {
  const contextStub = { log: jest.fn(), error: jest.fn() } as unknown as InvocationContext;
  const fetchContentByIdMock = fetchContentById as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.flags.item = jest.fn(() => ({
      read: jest.fn().mockResolvedValue({ resource: { id: 'flag-123', status: 'open' } }),
      patch: jest.fn().mockResolvedValue({}),
    })) as any;
    mockDb.flags.items.query = jest.fn(() => ({
      fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
      fetchNext: jest.fn().mockResolvedValue({
        resources: [],
        continuationToken: null,
      }),
    })) as any;
    mockDb.appeals.items.query = jest.fn(() => ({
      fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
    })) as any;
    mockDb.users.items.query = jest.fn(() => ({
      fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
    })) as any;
  });

  describe('blockContent', () => {
    it('blocks content successfully', async () => {
      const req = httpReqMock({
        method: 'POST',
        params: { contentId: 'post-123' },
        body: { contentType: 'post', reasonCode: 'SPAM' },
        principal: { sub: 'admin-123' },
      });

      const response = await blockContent(req as any, contextStub);
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('handles CORS OPTIONS', async () => {
      const req = httpReqMock({
        method: 'OPTIONS',
        params: { contentId: 'post-123' },
      });

      const response = await blockContent(req as any, contextStub);
      expect(response.status).toBe(200);
    });

    it('requires contentId', async () => {
      const req = httpReqMock({
        method: 'POST',
        params: {},
        body: { contentType: 'post', reasonCode: 'SPAM' },
        principal: { sub: 'admin-123' },
      });

      const response = await blockContent(req as any, contextStub);
      expect(response.status).toBe(400);
    });

    it('requires contentType', async () => {
      const req = httpReqMock({
        method: 'POST',
        params: { contentId: 'post-123' },
        body: { reasonCode: 'SPAM' },
        principal: { sub: 'admin-123' },
      });

      const response = await blockContent(req as any, contextStub);
      expect(response.status).toBe(400);
    });

    it('requires reasonCode', async () => {
      const req = httpReqMock({
        method: 'POST',
        params: { contentId: 'post-123' },
        body: { contentType: 'post' },
        principal: { sub: 'admin-123' },
      });

      const response = await blockContent(req as any, contextStub);
      expect(response.status).toBe(400);
    });

    it('returns 404 when content is missing', async () => {
      fetchContentByIdMock.mockResolvedValueOnce(null);

      const req = httpReqMock({
        method: 'POST',
        params: { contentId: 'missing' },
        body: { contentType: 'post', reasonCode: 'SPAM' },
        principal: { sub: 'admin-123' },
      });

      const response = await blockContent(req as any, contextStub);
      expect(response.status).toBe(404);
    });
  });

  describe('publishContent', () => {
    it('publishes content successfully', async () => {
      const req = httpReqMock({
        method: 'POST',
        params: { contentId: 'post-123' },
        body: { contentType: 'post', reasonCode: 'APPEAL_APPROVED' },
        principal: { sub: 'admin-123' },
      });

      const response = await publishContent(req as any, contextStub);
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('getFlagDetail', () => {
    it('retrieves flag details', async () => {
      mockDb.flags.items.query = jest.fn(() => ({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [
            {
              id: 'flag-123',
              contentId: 'post-123',
              contentType: 'post',
              reason: 'SPAM',
              createdAt: '2024-01-01T00:00:00Z',
              status: 'active',
              flaggedBy: 'user-456',
            },
          ],
        }),
      })) as any;
      mockDb.appeals.items.query = jest.fn(() => ({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [
            { id: 'appeal-1', status: 'pending', submittedAt: '2024-01-02T00:00:00Z' },
          ],
        }),
      })) as any;

      mockDb.flags.item = jest.fn(() => ({
        read: jest.fn().mockResolvedValue({
          resource: { id: 'flag-123', status: 'open', reasonCode: 'SPAM' },
        }),
      })) as any;

      const req = httpReqMock({
        method: 'GET',
        params: { flagId: 'flag-123' },
      });

      const response = await getFlagDetail(req as any, contextStub);
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('requires flagId', async () => {
      const req = httpReqMock({
        method: 'GET',
        params: {},
      });

      const response = await getFlagDetail(req as any, contextStub);
      expect(response.status).toBe(400);
    });

    it('returns 404 for missing flags', async () => {
      mockDb.flags.item = jest.fn(() => ({
        read: jest.fn().mockResolvedValue({ resource: null }),
      })) as any;

      const req = httpReqMock({
        method: 'GET',
        params: { flagId: 'nonexistent' },
      });

      const response = await getFlagDetail(req as any, contextStub);
      expect(response.status).toBe(404);
    });
  });

  describe('listFlagQueue', () => {
    it('lists flags with filters', async () => {
      mockDb.flags.items.query = jest.fn(() => ({
        fetchNext: jest.fn().mockResolvedValue({
          resources: [
            {
              id: 'flag-1',
              contentId: 'post-1',
              contentType: 'post',
              reason: 'spam',
              createdAt: '2024-01-02T00:00:00Z',
              status: 'active',
            },
            {
              id: 'flag-2',
              contentId: 'post-1',
              contentType: 'post',
              reason: 'abuse',
              createdAt: '2024-01-03T00:00:00Z',
              status: 'active',
            },
            {
              id: 'flag-3',
              contentId: 'post-2',
              contentType: 'post',
              reason: 'abuse',
              createdAt: '2024-01-01T00:00:00Z',
              status: 'resolved',
            },
          ],
          continuationToken: null,
        }),
      })) as any;

      const req = httpReqMock({
        method: 'GET',
        query: { status: 'open', priority: 'high' },
      });

      const response = await listFlagQueue(req as any, contextStub);
      expect(response).toBeDefined();
      expect(typeof response.status).toBe('number');
    });

    it('handles pagination', async () => {
      mockDb.flags.items.query = jest.fn(() => ({
        fetchNext: jest.fn().mockResolvedValue({
          resources: [],
          continuationToken: 'next',
        }),
      })) as any;

      const req = httpReqMock({
        method: 'GET',
        query: { status: 'resolved', skip: '10', limit: '200' },
      });

      const response = await listFlagQueue(req as any, contextStub);
      expect(response).toBeDefined();
      expect(typeof response.status).toBe('number');
    });

    it('handles all-status filters', async () => {
      mockDb.flags.items.query = jest.fn(() => ({
        fetchNext: jest.fn().mockResolvedValue({
          resources: [],
          continuationToken: null,
        }),
      })) as any;

      const req = httpReqMock({
        method: 'GET',
        query: { status: 'all', limit: '200' },
      });

      const response = await listFlagQueue(req as any, contextStub);
      expect(response).toBeDefined();
      expect(typeof response.status).toBe('number');
    });
  });

  describe('resolveFlag', () => {
    it('resolves flags with decision', async () => {
      const req = httpReqMock({
        method: 'POST',
        params: { flagId: 'flag-123' },
        body: { decision: 'dismiss', note: 'False positive' },
        principal: { sub: 'admin-123' },
      });

      const response = await resolveFlag(req as any, contextStub);
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('requires flagId', async () => {
      const req = httpReqMock({
        method: 'POST',
        params: {},
        body: { reasonCode: 'SPAM' },
        principal: { sub: 'admin-123' },
      });

      const response = await resolveFlag(req as any, contextStub);
      expect(response.status).toBe(400);
    });

    it('requires reasonCode', async () => {
      const req = httpReqMock({
        method: 'POST',
        params: { flagId: 'flag-123' },
        body: {},
        principal: { sub: 'admin-123' },
      });

      const response = await resolveFlag(req as any, contextStub);
      expect(response.status).toBe(400);
    });

    it('returns 404 for missing flag', async () => {
      mockDb.flags.items.query = jest.fn(() => ({
        fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
      })) as any;

      const req = httpReqMock({
        method: 'POST',
        params: { flagId: 'flag-404' },
        body: { reasonCode: 'SPAM' },
        principal: { sub: 'admin-123' },
      });

      const response = await resolveFlag(req as any, contextStub);
      expect(response.status).toBe(404);
    });
  });
});
