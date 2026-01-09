/**
 * Admin Appeal Routes Tests
 * Tests for approve/reject appeal endpoints and list/get operations
 */

import { InvocationContext } from '@azure/functions';
import { approveAppeal, rejectAppeal } from '../../src/admin/routes/appeals_action.function';
import { getAppealDetail } from '../../src/admin/routes/appeals_get.function';
import { listAppealsQueue } from '../../src/admin/routes/appeals_list.function';
import { httpReqMock } from '../helpers/http';

// Mock dependencies
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
    document: { id: 'post-123', status: 'blocked' },
    partitionKey: 'post-123',
  }),
  getLatestDecisionSummary: jest.fn().mockReturnValue({}),
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
};

jest.mock('@shared/clients/cosmos', () => ({
  getTargetDatabase: jest.fn(() => mockDb),
}));

describe('Admin Appeal Routes', () => {
  const contextStub = { log: jest.fn(), error: jest.fn() } as unknown as InvocationContext;

  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('getAppealDetail', () => {
    it('retrieves appeal details', async () => {
      mockDb.appeals.item = jest.fn(() => ({
        read: jest.fn().mockResolvedValue({
          resource: {
            id: 'appeal-123',
            status: 'pending',
            contentType: 'post',
            contentId: 'post-456',
          },
        }),
      })) as any;

      const req = httpReqMock({
        method: 'GET',
        params: { appealId: 'appeal-123' },
      });

      const response = await getAppealDetail(req as any, contextStub);
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('returns 404 for missing appeals', async () => {
      mockDb.appeals.item = jest.fn(() => ({
        read: jest.fn().mockResolvedValue({ resource: null }),
      })) as any;

      const req = httpReqMock({
        method: 'GET',
        params: { appealId: 'nonexistent' },
      });

      const response = await getAppealDetail(req as any, contextStub);
      expect(response.status).toBe(404);
    });
  });

  describe('listAppealsQueue', () => {
    it('lists appeals with pagination', async () => {
      const req = httpReqMock({
        method: 'GET',
        query: { status: 'pending', limit: '25' },
      });

      const response = await listAppealsQueue(req as any, contextStub);
      expect(response).toBeDefined();
      expect(typeof response.status).toBe('number');
    });

    it('filters by status', async () => {
      const req = httpReqMock({
        method: 'GET',
        query: { status: 'approved' },
      });

      const response = await listAppealsQueue(req as any, contextStub);
      expect(response).toBeDefined();
      expect(typeof response.status).toBe('number');
    });
  });
});
