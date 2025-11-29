/// <reference types="jest" />
/**
 * Admin Invite Endpoint Tests
 */

// In-memory invite store
const inviteStore = new Map<string, any>();

// Mock Cosmos
jest.mock('@shared/clients/cosmos', () => ({
  getCosmosClient: jest.fn(() => ({
    database: () => ({
      container: (name: string) => {
        if (name === 'invites') {
          return {
            items: {
              create: jest.fn(async (doc: any) => {
                inviteStore.set(doc.id, { ...doc });
                return { resource: doc };
              }),
              query: jest.fn(() => ({
                fetchAll: jest.fn(async () => ({
                  resources: Array.from(inviteStore.values()),
                })),
              })),
            },
            item: jest.fn((id: string) => ({
              read: jest.fn(async () => {
                const doc = inviteStore.get(id);
                if (!doc) {
                  const error = new Error('Not found');
                  (error as any).code = 404;
                  throw error;
                }
                return { resource: doc };
              }),
              delete: jest.fn(async () => {
                if (!inviteStore.has(id)) {
                  const error = new Error('Not found');
                  (error as any).code = 404;
                  throw error;
                }
                inviteStore.delete(id);
                return {};
              }),
            })),
          };
        }
        return {} as any;
      },
    }),
  })),
}));

// Mock auth middleware to inject principal
jest.mock('@shared/middleware/auth', () => ({
  requireAdmin: jest.fn((handler: any) => handler),
}));

import { InvocationContext } from '@azure/functions';
import {
  createInviteHandler,
  listInvitesHandler,
  getInviteHandler,
  deleteInviteHandler,
} from '@auth/admin/invites';
import { httpReqMock } from '../helpers/http';
import { resetInviteContainerCache } from '@auth/service/inviteStore';

const mockPrincipal = { sub: 'admin-123', roles: ['admin'] };
const logFn = jest.fn();
const ctx: Partial<InvocationContext> = {
  invocationId: 'test-admin-invites',
  log: logFn,
  error: logFn,
};

describe('Admin Invite Endpoints', () => {
  beforeEach(() => {
    inviteStore.clear();
    resetInviteContainerCache();
    logFn.mockClear();
  });

  describe('POST /admin/invites', () => {
    it('creates an invite with defaults', async () => {
      const req = httpReqMock({
        method: 'POST',
        body: {},
        principal: mockPrincipal,
      });

      const res = await createInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(201);
      const body = JSON.parse(res.body as string);
      expect(body.success).toBe(true);
      expect(body.data.inviteCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(body.data.email).toBeNull();
    });

    it('creates an invite with email restriction', async () => {
      const req = httpReqMock({
        method: 'POST',
        body: { email: 'Test@Example.com' },
        principal: mockPrincipal,
      });

      const res = await createInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(201);
      const body = JSON.parse(res.body as string);
      expect(body.data.email).toBe('test@example.com');
    });

    it('creates an invite with custom expiry', async () => {
      const req = httpReqMock({
        method: 'POST',
        body: { expiresInDays: 7 },
        principal: mockPrincipal,
      });

      const res = await createInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(201);
      const body = JSON.parse(res.body as string);
      const expiresAt = new Date(body.data.expiresAt);
      const expectedExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      expect(Math.abs(expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(2000);
    });

    it('rejects invalid email format', async () => {
      const req = httpReqMock({
        method: 'POST',
        body: { email: 'not-an-email' },
        principal: mockPrincipal,
      });

      const res = await createInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(400);
      const body = JSON.parse(res.body as string);
      expect(body.message).toBe('invalid_email');
    });

    it('rejects invalid expiry', async () => {
      const req = httpReqMock({
        method: 'POST',
        body: { expiresInDays: 500 },
        principal: mockPrincipal,
      });

      const res = await createInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(400);
      const body = JSON.parse(res.body as string);
      expect(body.message).toBe('invalid_expiry');
    });

    it('rejects negative expiry', async () => {
      const req = httpReqMock({
        method: 'POST',
        body: { expiresInDays: -5 },
        principal: mockPrincipal,
      });

      const res = await createInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /admin/invites', () => {
    beforeEach(async () => {
      // Create some test invites directly
      const now = new Date();
      inviteStore.set('AAAA-1111', {
        id: 'AAAA-1111',
        inviteCode: 'AAAA-1111',
        email: null,
        createdBy: 'admin-123',
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        usedAt: null,
        usedByUserId: null,
        _partitionKey: 'AAAA-1111',
      });
      inviteStore.set('BBBB-2222', {
        id: 'BBBB-2222',
        inviteCode: 'BBBB-2222',
        email: 'test@example.com',
        createdBy: 'admin-456',
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        usedAt: null,
        usedByUserId: null,
        _partitionKey: 'BBBB-2222',
      });
    });

    it('lists all invites', async () => {
      const req = httpReqMock({
        method: 'GET',
        query: {},
        principal: mockPrincipal,
      });

      const res = await listInvitesHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(200);
      const body = JSON.parse(res.body as string);
      expect(body.data.invites.length).toBe(2);
      expect(body.data.count).toBe(2);
    });

    it('respects limit parameter', async () => {
      const req = httpReqMock({
        method: 'GET',
        query: { limit: '1' },
        principal: mockPrincipal,
      });

      const res = await listInvitesHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(200);
    });

    it('rejects invalid limit', async () => {
      const req = httpReqMock({
        method: 'GET',
        query: { limit: 'abc' },
        principal: mockPrincipal,
      });

      const res = await listInvitesHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(400);
      const body = JSON.parse(res.body as string);
      expect(body.message).toBe('invalid_limit');
    });
  });

  describe('GET /admin/invites/{code}', () => {
    beforeEach(() => {
      const now = new Date();
      inviteStore.set('AAAA-1111', {
        id: 'AAAA-1111',
        inviteCode: 'AAAA-1111',
        email: null,
        createdBy: 'admin-123',
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        usedAt: null,
        usedByUserId: null,
        _partitionKey: 'AAAA-1111',
      });
    });

    it('retrieves an existing invite', async () => {
      const req = httpReqMock({
        method: 'GET',
        params: { code: 'AAAA-1111' },
        principal: mockPrincipal,
      });

      const res = await getInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(200);
      const body = JSON.parse(res.body as string);
      expect(body.data.inviteCode).toBe('AAAA-1111');
    });

    it('returns 404 for non-existent invite', async () => {
      const req = httpReqMock({
        method: 'GET',
        params: { code: 'XXXX-YYYY' },
        principal: mockPrincipal,
      });

      const res = await getInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(404);
    });

    it('returns 400 for missing code', async () => {
      const req = httpReqMock({
        method: 'GET',
        params: {},
        principal: mockPrincipal,
      });

      const res = await getInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /admin/invites/{code}', () => {
    beforeEach(() => {
      const now = new Date();
      inviteStore.set('AAAA-1111', {
        id: 'AAAA-1111',
        inviteCode: 'AAAA-1111',
        email: null,
        createdBy: 'admin-123',
        createdAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        usedAt: null,
        usedByUserId: null,
        _partitionKey: 'AAAA-1111',
      });
    });

    it('deletes an existing invite', async () => {
      const req = httpReqMock({
        method: 'DELETE',
        params: { code: 'AAAA-1111' },
        principal: mockPrincipal,
      });

      const res = await deleteInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(200);
      const body = JSON.parse(res.body as string);
      expect(body.data.deleted).toBe(true);
      expect(inviteStore.has('AAAA-1111')).toBe(false);
    });

    it('returns 404 for non-existent invite', async () => {
      const req = httpReqMock({
        method: 'DELETE',
        params: { code: 'XXXX-YYYY' },
        principal: mockPrincipal,
      });

      const res = await deleteInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(404);
    });

    it('returns 400 for missing code', async () => {
      const req = httpReqMock({
        method: 'DELETE',
        params: {},
        principal: mockPrincipal,
      });

      const res = await deleteInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(400);
    });
  });
});
