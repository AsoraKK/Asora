/// <reference types="jest" />
/**
 * Redeem Invite Endpoint Tests
 */

import * as jwt from 'jsonwebtoken';

// In-memory stores
const inviteStore = new Map<string, any>();
const userStore = new Map<string, any>();
const refreshTokenStore = new Map<string, any>();

const JWT_SECRET = 'test-secret-for-redeem-invite';

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
              patch: jest.fn(async (operations: any[]) => {
                const doc = inviteStore.get(id);
                if (!doc) throw new Error('Not found');
                for (const op of operations) {
                  if (op.op === 'add' || op.op === 'replace') {
                    const path = op.path.replace(/^\//, '');
                    doc[path] = op.value;
                  }
                }
                inviteStore.set(id, doc);
                return { resource: doc };
              }),
            })),
          };
        }
        if (name === 'users') {
          return {
            item: jest.fn((id: string) => ({
              read: jest.fn(async () => {
                const doc = userStore.get(id);
                // Return { resource: undefined } for not found, not throw
                return { resource: doc };
              }),
              patch: jest.fn(async (operations: any[]) => {
                const doc = userStore.get(id);
                if (!doc) throw new Error('User not found');
                for (const op of operations) {
                  if (op.op === 'add' || op.op === 'replace') {
                    const path = op.path.replace(/^\//, '');
                    doc[path] = op.value;
                  }
                }
                userStore.set(id, doc);
                return { resource: doc };
              }),
            })),
          };
        }
        return {} as any;
      },
    }),
  })),
}));

// Mock Postgres pool for refresh tokens
jest.mock('@shared/clients/postgres', () => ({
  getPool: jest.fn(() => ({
    query: jest.fn(async (sql: string, params: any[]) => {
      if (sql.includes('INSERT INTO refresh_tokens')) {
        const [jti, userId, expiresAt] = params;
        refreshTokenStore.set(jti, { userId, expiresAt });
        return { rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }),
  })),
}));

import { InvocationContext } from '@azure/functions';
import { redeemInviteHandler, resetUsersContainerCache } from '@auth/service/redeemInvite';
import { resetInviteContainerCache } from '@auth/service/inviteStore';
import { httpReqMock } from '../helpers/http';

const logFn = jest.fn();
const ctx: Partial<InvocationContext> = {
  invocationId: 'test-redeem-invite',
  log: logFn,
  error: logFn,
};

function createValidToken(userId: string, email: string): string {
  return jwt.sign(
    { sub: userId, email, iss: 'asora-auth' },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
}

function createInactiveUser(id: string, email: string): any {
  return {
    id,
    email,
    role: 'user',
    tier: 'free',
    reputationScore: 0,
    isActive: false,
    createdAt: new Date().toISOString(),
  };
}

function createValidInvite(code: string, email?: string, createdBy = 'admin-123'): any {
  const now = new Date();
  return {
    id: code,
    inviteCode: code,
    email: email?.toLowerCase() ?? null,
    createdBy,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    usedAt: null,
    usedByUserId: null,
    _partitionKey: code,
  };
}

describe('Redeem Invite Endpoint', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.JWT_ISSUER = 'asora-auth';
  });

  beforeEach(() => {
    inviteStore.clear();
    userStore.clear();
    refreshTokenStore.clear();
    resetInviteContainerCache();
    resetUsersContainerCache();
    logFn.mockClear();
  });

  describe('Successful redemption', () => {
    it('redeems a valid invite and activates user', async () => {
      const userId = 'user-123';
      const email = 'user@example.com';
      const inviteCode = 'AAAA-1111';

      userStore.set(userId, createInactiveUser(userId, email));
      inviteStore.set(inviteCode, createValidInvite(inviteCode));

      const token = createValidToken(userId, email);
      const req = httpReqMock({
        method: 'POST',
        body: { inviteCode },
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await redeemInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(200);
      const body = JSON.parse(res.body as string);
      expect(body.success).toBe(true);
      expect(body.data.access_token).toBeDefined();
      expect(body.data.refresh_token).toBeDefined();
      expect(body.data.user.isActive).toBe(true);

      // Verify user was activated
      const user = userStore.get(userId);
      expect(user.isActive).toBe(true);
      expect(user.activatedByInvite).toBe(inviteCode);

      // Verify invite was marked as used
      const invite = inviteStore.get(inviteCode);
      expect(invite.usedAt).not.toBeNull();
      expect(invite.usedByUserId).toBe(userId);
    });

    it('redeems email-restricted invite with matching email', async () => {
      const userId = 'user-456';
      const email = 'specific@user.com';
      const inviteCode = 'BBBB-2222';

      userStore.set(userId, createInactiveUser(userId, email));
      inviteStore.set(inviteCode, createValidInvite(inviteCode, email));

      const token = createValidToken(userId, email);
      const req = httpReqMock({
        method: 'POST',
        body: { inviteCode },
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await redeemInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(200);
    });

    it('handles case-insensitive invite codes', async () => {
      const userId = 'user-789';
      const email = 'user@example.com';
      const inviteCode = 'CCCC-3333';

      userStore.set(userId, createInactiveUser(userId, email));
      inviteStore.set(inviteCode, createValidInvite(inviteCode));

      const token = createValidToken(userId, email);
      const req = httpReqMock({
        method: 'POST',
        body: { inviteCode: 'cccc-3333' }, // lowercase
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await redeemInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(200);
    });
  });

  describe('Authentication errors', () => {
    it('rejects missing authorization header', async () => {
      const req = httpReqMock({
        method: 'POST',
        body: { inviteCode: 'AAAA-1111' },
      });

      const res = await redeemInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(401);
      const body = JSON.parse(res.body as string);
      expect(body.message).toBe('unauthorized');
    });

    it('rejects invalid token', async () => {
      const req = httpReqMock({
        method: 'POST',
        body: { inviteCode: 'AAAA-1111' },
        headers: { authorization: 'Bearer invalid-token' },
      });

      const res = await redeemInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(401);
    });
  });

  describe('Validation errors', () => {
    it('rejects missing invite code', async () => {
      const userId = 'user-123';
      const email = 'user@example.com';
      userStore.set(userId, createInactiveUser(userId, email));

      const token = createValidToken(userId, email);
      const req = httpReqMock({
        method: 'POST',
        body: {},
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await redeemInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(400);
      const body = JSON.parse(res.body as string);
      expect(body.message).toBe('invalid_request');
    });

    it('rejects invalid invite code format', async () => {
      const userId = 'user-123';
      const email = 'user@example.com';
      userStore.set(userId, createInactiveUser(userId, email));

      const token = createValidToken(userId, email);
      const req = httpReqMock({
        method: 'POST',
        body: { inviteCode: 'invalid-format' },
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await redeemInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(400);
      const body = JSON.parse(res.body as string);
      expect(body.message).toBe('invalid_code_format');
    });
  });

  describe('Invite validation errors', () => {
    it('rejects non-existent invite code', async () => {
      const userId = 'user-123';
      const email = 'user@example.com';
      userStore.set(userId, createInactiveUser(userId, email));

      const token = createValidToken(userId, email);
      const req = httpReqMock({
        method: 'POST',
        body: { inviteCode: 'XXXX-YYYY' },
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await redeemInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(400);
      const body = JSON.parse(res.body as string);
      expect(body.message).toBe('not_found');
    });

    it('rejects expired invite', async () => {
      const userId = 'user-123';
      const email = 'user@example.com';
      const inviteCode = 'AAAA-1111';

      userStore.set(userId, createInactiveUser(userId, email));

      // Create expired invite
      const invite = createValidInvite(inviteCode);
      invite.expiresAt = new Date(Date.now() - 1000).toISOString();
      inviteStore.set(inviteCode, invite);

      const token = createValidToken(userId, email);
      const req = httpReqMock({
        method: 'POST',
        body: { inviteCode },
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await redeemInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(400);
      const body = JSON.parse(res.body as string);
      expect(body.message).toBe('expired');
    });

    it('rejects already used invite', async () => {
      const userId = 'user-123';
      const email = 'user@example.com';
      const inviteCode = 'AAAA-1111';

      userStore.set(userId, createInactiveUser(userId, email));

      // Create used invite
      const invite = createValidInvite(inviteCode);
      invite.usedAt = new Date().toISOString();
      invite.usedByUserId = 'other-user';
      inviteStore.set(inviteCode, invite);

      const token = createValidToken(userId, email);
      const req = httpReqMock({
        method: 'POST',
        body: { inviteCode },
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await redeemInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(400);
      const body = JSON.parse(res.body as string);
      expect(body.message).toBe('already_used');
    });

    it('rejects invite with email mismatch', async () => {
      const userId = 'user-123';
      const email = 'user@example.com';
      const inviteCode = 'AAAA-1111';

      userStore.set(userId, createInactiveUser(userId, email));

      // Create email-restricted invite for different email
      inviteStore.set(inviteCode, createValidInvite(inviteCode, 'other@example.com'));

      const token = createValidToken(userId, email);
      const req = httpReqMock({
        method: 'POST',
        body: { inviteCode },
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await redeemInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(400);
      const body = JSON.parse(res.body as string);
      expect(body.message).toBe('email_mismatch');
    });
  });

  describe('User state errors', () => {
    it('rejects already active user', async () => {
      const userId = 'user-123';
      const email = 'user@example.com';
      const inviteCode = 'AAAA-1111';

      // Create active user
      const user = createInactiveUser(userId, email);
      user.isActive = true;
      userStore.set(userId, user);

      inviteStore.set(inviteCode, createValidInvite(inviteCode));

      const token = createValidToken(userId, email);
      const req = httpReqMock({
        method: 'POST',
        body: { inviteCode },
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await redeemInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(400);
      const body = JSON.parse(res.body as string);
      expect(body.message).toBe('already_active');
    });

    it('handles user not found', async () => {
      const userId = 'non-existent-user';
      const email = 'user@example.com';
      const inviteCode = 'AAAA-1111';

      // Don't add user to store
      inviteStore.set(inviteCode, createValidInvite(inviteCode));

      const token = createValidToken(userId, email);
      const req = httpReqMock({
        method: 'POST',
        body: { inviteCode },
        headers: { authorization: `Bearer ${token}` },
      });

      const res = await redeemInviteHandler(req as any, ctx as InvocationContext);

      expect(res.status).toBe(404);
      const body = JSON.parse(res.body as string);
      expect(body.message).toBe('user_not_found');
    });
  });
});
