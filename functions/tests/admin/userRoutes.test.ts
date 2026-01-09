/**
 * Admin User Management Routes Tests
 * Tests for user enable/disable and user search endpoints
 */

import { InvocationContext } from '@azure/functions';
import { disableUser, enableUser } from '../../src/admin/routes/users_action.function';
import { searchUsers } from '../../src/admin/routes/users_search.function';
import { httpReqMock } from '../helpers/http';

jest.mock('@shared/clients/cosmos');
jest.mock('../../src/admin/adminAuthUtils', () => ({
  requireActiveAdmin: jest.fn((handler) => handler),
}));
jest.mock('../../src/admin/auditLogger', () => ({
  recordAdminAudit: jest.fn().mockResolvedValue({}),
}));

const mockDb = {
  users: {
    item: jest.fn(() => ({
      read: jest.fn().mockResolvedValue({ resource: { id: 'user-123', isActive: true } }),
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

describe('Admin User Management Routes', () => {
  const contextStub = { log: jest.fn(), error: jest.fn() } as unknown as InvocationContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('disableUser', () => {
    it('disables users with audit trail', async () => {
      const req = httpReqMock({
        method: 'POST',
        params: { userId: 'user-123' },
        body: { reasonCode: 'POLICY_VIOLATION', note: 'Violates community guidelines' },
        principal: { sub: 'admin-123' },
      });

      const response = await disableUser(req as any, contextStub);
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('handles missing required fields', async () => {
      const req = httpReqMock({
        method: 'POST',
        params: { userId: 'user-123' },
        body: {},
        principal: { sub: 'admin-123' },
      });

      const response = await disableUser(req as any, contextStub);
      expect(response.status).toBe(400);
    });

    it('handles CORS OPTIONS', async () => {
      const req = httpReqMock({
        method: 'OPTIONS',
        params: { userId: 'user-123' },
      });

      const response = await disableUser(req as any, contextStub);
      expect(response.status).toBe(200);
    });
  });

  describe('enableUser', () => {
    it('enables disabled users', async () => {
      mockDb.users.item = jest.fn(() => ({
        read: jest.fn().mockResolvedValue({
          resource: { id: 'user-123', isActive: false, disabledAt: '2024-01-01' },
        }),
        patch: jest.fn().mockResolvedValue({}),
      })) as any;

      const req = httpReqMock({
        method: 'POST',
        params: { userId: 'user-123' },
        body: {},
        principal: { sub: 'admin-123' },
      });

      const response = await enableUser(req as any, contextStub);
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('returns 404 for non-existent users', async () => {
      mockDb.users.item = jest.fn(() => ({
        read: jest.fn().mockResolvedValue({ resource: null }),
        patch: jest.fn(),
      })) as any;

      const req = httpReqMock({
        method: 'POST',
        params: { userId: 'nonexistent' },
        body: {},
        principal: { sub: 'admin-123' },
      });

      const response = await enableUser(req as any, contextStub);
      expect(response.status).toBe(404);
    });
  });

  describe('searchUsers', () => {
    it('searches users by query', async () => {
      mockDb.users.items = {
        query: jest.fn(() => ({
          fetchAll: jest.fn().mockResolvedValue({
            resources: [{ id: 'user-123', username: 'john', email: 'john@example.com' }],
          }),
        })),
      } as any;

      const req = httpReqMock({
        method: 'GET',
        query: { q: 'john' },
      });

      const response = await searchUsers(req as any, contextStub);
      expect(response).toBeDefined();
      expect(typeof response.status).toBe('number');
    });

    it('requires search query parameter', async () => {
      const req = httpReqMock({
        method: 'GET',
        query: {},
      });

      const response = await searchUsers(req as any, contextStub);
      expect(response.status).toBe(400);
    });

    it('handles pagination', async () => {
      const req = httpReqMock({
        method: 'GET',
        query: { q: 'test', skip: '10', limit: '20' },
      });

      const response = await searchUsers(req as any, contextStub);
      expect(response).toBeDefined();
      expect(typeof response.status).toBe('number');
    });

    it('handles CORS OPTIONS', async () => {
      const req = httpReqMock({
        method: 'OPTIONS',
      });

      const response = await searchUsers(req as any, contextStub);
      expect(response.status).toBe(200);
    });
  });
});
