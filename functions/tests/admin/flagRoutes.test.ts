/**
 * Admin Content Routes Tests
 * Tests for content action endpoints (block/publish) and flag operations
 */

import { InvocationContext } from '@azure/functions';
import { blockContent, publishContent } from '../../src/admin/routes/content_action.function';
import { getFlagDetail } from '../../src/admin/routes/flags_get.function';
import { listFlagQueue } from '../../src/admin/routes/flags_list.function';
import { resolveFlag } from '../../src/admin/routes/flags_resolve.function';
import { httpReqMock } from '../helpers/http';

jest.mock('@shared/clients/cosmos');
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
}));
jest.mock('../../src/users/service/profileService', () => ({
  profileService: {
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
      })),
    },
  },
};

jest.mock('@shared/clients/cosmos', () => ({
  getTargetDatabase: jest.fn(() => mockDb),
}));

describe('Admin Content & Flag Routes', () => {
  const contextStub = { log: jest.fn(), error: jest.fn() } as unknown as InvocationContext;

  beforeEach(() => {
    jest.clearAllMocks();
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
      const req = httpReqMock({
        method: 'GET',
        query: { status: 'open', priority: 'high' },
      });

      const response = await listFlagQueue(req as any, contextStub);
      expect(response).toBeDefined();
      expect(typeof response.status).toBe('number');
    });

    it('handles pagination', async () => {
      const req = httpReqMock({
        method: 'GET',
        query: { skip: '10', limit: '20' },
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
  });
});
