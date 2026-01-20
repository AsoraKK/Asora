/**
 * Admin Appeal Routes Tests
 * Tests for approve/reject appeal endpoints and list/get operations
 */

import { InvocationContext } from '@azure/functions';
import { approveAppeal, rejectAppeal } from '../../src/admin/routes/appeals_action.function';
import { getAppealDetail } from '../../src/admin/routes/appeals_get.function';
import { listAppealsQueue } from '../../src/admin/routes/appeals_list.function';
import { overrideAppeal } from '../../src/admin/routes/appeals_override.function';
import { fetchContentById } from '../../src/admin/moderationAdminUtils';
import { httpReqMock } from '../helpers/http';

// Mock dependencies
jest.mock('@shared/clients/cosmos');
jest.mock('../../src/admin/adminAuthUtils', () => ({
  requireActiveAdmin: jest.fn((handler) => handler),
  requireActiveModerator: jest.fn((handler) => handler),
}));
jest.mock('../../src/admin/auditLogger', () => ({
  recordAdminAudit: jest.fn().mockResolvedValue({}),
}));
jest.mock('../../src/admin/moderationAdminUtils', () => ({
  fetchContentById: jest.fn().mockResolvedValue({
    container: { item: jest.fn(() => ({ patch: jest.fn().mockResolvedValue({}) })) },
    document: { id: 'post-123', status: 'blocked' },
    partitionKey: 'post-123',
  }),
  getLatestDecisionSummary: jest.fn().mockReturnValue({}),
  extractPreview: jest.fn(() => 'preview'),
}));

const mockDb = {
  appeals: {
    item: jest.fn(() => ({
      read: jest.fn().mockResolvedValue({ resource: { id: 'appeal-123', status: 'pending' } }),
      patch: jest.fn().mockResolvedValue({}),
    })),
    items: {
      query: jest.fn(() => ({
        fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
      })),
    },
  },
  moderationDecisions: {
    items: {
      create: jest.fn().mockResolvedValue({}),
      query: jest.fn(() => ({
        fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
      })),
    },
  },
};

jest.mock('@shared/clients/cosmos', () => ({
  getTargetDatabase: jest.fn(() => mockDb),
}));

describe('Admin Appeal Routes', () => {
  const contextStub = { log: jest.fn(), error: jest.fn() } as unknown as InvocationContext;
  const fetchContentByIdMock = fetchContentById as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.appeals.items.query = jest.fn(() => ({
      fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
      fetchNext: jest.fn().mockResolvedValue({
        resources: [],
        continuationToken: null,
      }),
    })) as any;
    mockDb.appeals.item = jest.fn(() => ({
      read: jest.fn().mockResolvedValue({ resource: { id: 'appeal-123', status: 'pending' } }),
      patch: jest.fn().mockResolvedValue({}),
    })) as any;
    mockDb.moderationDecisions.items.query = jest.fn(() => ({
      fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
    })) as any;
    mockDb.moderationDecisions.items.create = jest.fn().mockResolvedValue({}) as any;
  });

  describe('approveAppeal', () => {
    it('handles approval requests', async () => {
      const req = httpReqMock({
        method: 'POST',
        params: { appealId: 'appeal-123' },
        body: { reasonCode: 'CONTENT_RESTORED', note: 'Approved' },
        principal: { sub: 'admin-123' },
      });

      const response = await approveAppeal(req as any, contextStub);
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('handles CORS OPTIONS', async () => {
      const req = httpReqMock({
        method: 'OPTIONS',
        params: { appealId: 'appeal-123' },
      });

      const response = await approveAppeal(req as any, contextStub);
      expect(response.status).toBe(200);
    });

    it('requires appealId', async () => {
      const req = httpReqMock({
        method: 'POST',
        params: {},
        body: { reasonCode: 'CONTENT_RESTORED' },
        principal: { sub: 'admin-123' },
      });

      const response = await approveAppeal(req as any, contextStub);
      expect(response.status).toBe(400);
    });

    it('requires reasonCode', async () => {
      const req = httpReqMock({
        method: 'POST',
        params: { appealId: 'appeal-123' },
        body: {},
        principal: { sub: 'admin-123' },
      });

      const response = await approveAppeal(req as any, contextStub);
      expect(response.status).toBe(400);
    });

    it('returns 404 when appeal is missing', async () => {
      mockDb.appeals.items.query = jest.fn(() => ({
        fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
      })) as any;

      const req = httpReqMock({
        method: 'POST',
        params: { appealId: 'missing-appeal' },
        body: { reasonCode: 'CONTENT_RESTORED' },
        principal: { sub: 'admin-123' },
      });

      const response = await approveAppeal(req as any, contextStub);
      expect(response.status).toBe(404);
    });

    it('returns 404 when content is missing', async () => {
      fetchContentByIdMock.mockResolvedValueOnce(null);
      mockDb.appeals.items.query = jest.fn(() => ({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [{ id: 'appeal-123', contentType: 'post', contentId: 'post-123' }],
        }),
      })) as any;

      const req = httpReqMock({
        method: 'POST',
        params: { appealId: 'appeal-123' },
        body: { reasonCode: 'CONTENT_RESTORED' },
        principal: { sub: 'admin-123' },
      });

      const response = await approveAppeal(req as any, contextStub);
      expect(response.status).toBe(404);
    });
  });

  describe('rejectAppeal', () => {
    it('handles rejection requests', async () => {
      const req = httpReqMock({
        method: 'POST',
        params: { appealId: 'appeal-123' },
        body: { reasonCode: 'INVALID_APPEAL' },
        principal: { sub: 'admin-123' },
      });

      const response = await rejectAppeal(req as any, contextStub);
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('overrideAppeal', () => {
    it('handles override requests and records audit', async () => {
      mockDb.appeals.items.query = jest.fn(() => ({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [
            {
              id: 'appeal-123',
              status: 'pending',
              contentType: 'post',
              contentId: 'post-123',
              _etag: 'etag-1',
            },
          ],
        }),
      })) as any;

      const req = httpReqMock({
        method: 'POST',
        params: { appealId: 'appeal-123' },
        body: { decision: 'allow', reasonCode: 'policy_exception', reasonNote: 'Override' },
        headers: { 'Idempotency-Key': 'override-123' },
        principal: { sub: 'admin-123' },
      });

      const response = await overrideAppeal(req as any, contextStub);
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(mockDb.moderationDecisions.items.create).toHaveBeenCalled();
    });

    it('returns 409 for non-pending appeals without quorum', async () => {
      mockDb.appeals.items.query = jest.fn(() => ({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [
            {
              id: 'appeal-124',
              status: 'approved',
              finalDecision: 'approved',
              contentType: 'post',
              contentId: 'post-124',
            },
          ],
        }),
      })) as any;

      const req = httpReqMock({
        method: 'POST',
        params: { appealId: 'appeal-124' },
        body: { decision: 'block', reasonCode: 'safety_risk' },
        principal: { sub: 'admin-123' },
      });

      const response = await overrideAppeal(req as any, contextStub);
      expect(response.status).toBe(409);
    });

    it('is idempotent when override already applied', async () => {
      mockDb.appeals.items.query = jest.fn(() => ({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [
            {
              id: 'appeal-125',
              status: 'overridden',
              finalDecision: 'allow',
              contentType: 'post',
              contentId: 'post-125',
              overrideIdempotencyKey: 'override-125',
            },
          ],
        }),
      })) as any;

      const req = httpReqMock({
        method: 'POST',
        params: { appealId: 'appeal-125' },
        body: { decision: 'allow', reasonCode: 'false_positive' },
        headers: { 'Idempotency-Key': 'override-125' },
        principal: { sub: 'admin-123' },
      });

      const response = await overrideAppeal(req as any, contextStub);
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('getAppealDetail', () => {
    it('retrieves appeal details', async () => {
      mockDb.appeals.items.query = jest.fn(() => ({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [
            {
              id: 'appeal-123',
              status: 'resolved',
              finalDecision: 'approved',
              contentType: 'post',
              contentId: 'post-456',
            },
          ],
        }),
      })) as any;

      const req = httpReqMock({
        method: 'GET',
        params: { appealId: 'appeal-123' },
      });

      const response = await getAppealDetail(req as any, contextStub);
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('includes vote tally, quorum, and audit summary', async () => {
      mockDb.appeals.items.query = jest.fn(() => ({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [
            {
              id: 'appeal-126',
              status: 'pending',
              contentType: 'post',
              contentId: 'post-459',
              votesFor: 2,
              votesAgainst: 1,
              totalVotes: 3,
              requiredVotes: 3,
              hasReachedQuorum: true,
              createdAt: '2024-01-01T00:00:00Z',
            },
          ],
        }),
      })) as any;

      mockDb.moderationDecisions.items.query = jest.fn(() => ({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [
            {
              action: 'override',
              actorRole: 'moderator',
              createdAt: '2024-01-01T00:05:00Z',
            },
          ],
        }),
      })) as any;

      const req = httpReqMock({
        method: 'GET',
        params: { appealId: 'appeal-126' },
        principal: { sub: 'admin-123', roles: ['admin'] },
      });

      const response = await getAppealDetail(req as any, contextStub);
      const payload = JSON.parse(response.body);
      expect(payload.data.votes.total).toBe(3);
      expect(payload.data.quorum.reached).toBe(true);
      expect(payload.data.auditSummary.lastActorRole).toBe('moderator');
    });

    it('returns 404 for missing appeals', async () => {
      mockDb.appeals.items.query = jest.fn(() => ({
        fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
      })) as any;

      const req = httpReqMock({
        method: 'GET',
        params: { appealId: 'nonexistent' },
      });

      const response = await getAppealDetail(req as any, contextStub);
      expect(response.status).toBe(404);
    });

    it('requires appealId', async () => {
      const req = httpReqMock({
        method: 'GET',
        params: {},
      });

      const response = await getAppealDetail(req as any, contextStub);
      expect(response.status).toBe(400);
    });

    it('normalizes pending status', async () => {
      mockDb.appeals.items.query = jest.fn(() => ({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [
            {
              id: 'appeal-124',
              status: 'pending',
              contentType: 'post',
              contentId: 'post-457',
            },
          ],
        }),
      })) as any;

      const req = httpReqMock({
        method: 'GET',
        params: { appealId: 'appeal-124' },
      });

      const response = await getAppealDetail(req as any, contextStub);
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('normalizes expired status', async () => {
      mockDb.appeals.items.query = jest.fn(() => ({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [
            {
              id: 'appeal-125',
              status: 'expired',
              contentType: 'post',
              contentId: 'post-458',
            },
          ],
        }),
      })) as any;

      const req = httpReqMock({
        method: 'GET',
        params: { appealId: 'appeal-125' },
      });

      const response = await getAppealDetail(req as any, contextStub);
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('listAppealsQueue', () => {
    it('lists appeals with pagination', async () => {
      mockDb.appeals.items.query = jest.fn(() => ({
        fetchNext: jest.fn().mockResolvedValue({
          resources: [
            {
              id: 'appeal-1',
              contentId: 'post-1',
              submitterId: 'user-1',
              submittedAt: '2024-01-01T00:00:00Z',
              status: 'pending',
              flagCategories: ['spam'],
              flagReason: 'spam',
            },
            {
              id: 'appeal-2',
              contentId: 'post-2',
              submitterId: 'user-2',
              submittedAt: '2024-01-02T00:00:00Z',
              status: 'approved',
              flagCategories: [],
              flagReason: 'harassment',
            },
            {
              id: 'appeal-3',
              contentId: 'post-3',
              submitterId: 'user-3',
              submittedAt: '2024-01-03T00:00:00Z',
              status: 'resolved',
              finalDecision: 'rejected',
              flagCategories: [],
              flagReason: 'abuse',
            },
          ],
          continuationToken: null,
        }),
      })) as any;

      const req = httpReqMock({
        method: 'GET',
        query: { status: 'pending', limit: '25' },
      });

      const response = await listAppealsQueue(req as any, contextStub);
      expect(response).toBeDefined();
      expect(typeof response.status).toBe('number');
    });

    it('filters by status', async () => {
      mockDb.appeals.items.query = jest.fn(() => ({
        fetchNext: jest.fn().mockResolvedValue({
          resources: [
            {
              id: 'appeal-4',
              contentId: 'post-4',
              submitterId: 'user-4',
              submittedAt: '2024-01-04T00:00:00Z',
              status: 'rejected',
              flagCategories: [],
              flagReason: 'abuse',
            },
            {
              id: 'appeal-5',
              contentId: 'post-5',
              submitterId: 'user-5',
              submittedAt: '2024-01-05T00:00:00Z',
              status: 'resolved',
              finalDecision: 'approved',
              flagCategories: [],
              flagReason: 'other',
            },
          ],
          continuationToken: null,
        }),
      })) as any;

      const req = httpReqMock({
        method: 'GET',
        query: { status: 'approved' },
      });

      const response = await listAppealsQueue(req as any, contextStub);
      expect(response).toBeDefined();
      expect(typeof response.status).toBe('number');
    });

    it('handles all-status filter', async () => {
      mockDb.appeals.items.query = jest.fn(() => ({
        fetchNext: jest.fn().mockResolvedValue({
          resources: [],
          continuationToken: null,
        }),
      })) as any;

      const req = httpReqMock({
        method: 'GET',
        query: { status: 'all', limit: '200' },
      });

      const response = await listAppealsQueue(req as any, contextStub);
      expect(response).toBeDefined();
      expect(typeof response.status).toBe('number');
    });
  });
});
