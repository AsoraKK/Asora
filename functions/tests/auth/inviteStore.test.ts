/// <reference types="jest" />
/**
 * Invite Store Tests
 *
 * Tests for invite CRUD operations and validation.
 */

import * as crypto from 'crypto';

// In-memory invite store for mocking
const inviteStore = new Map<string, any>();

// Mock Cosmos container
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
              query: jest.fn((querySpec: any) => ({
                fetchAll: jest.fn(async () => {
                  let results = Array.from(inviteStore.values());

                  // Apply filters from query
                  const params = querySpec.parameters || [];
                  const createdByParam = params.find((p: any) => p.name === '@createdBy');
                  if (createdByParam) {
                    results = results.filter(inv => inv.createdBy === createdByParam.value);
                  }

                  if (querySpec.query.includes('usedAt = null')) {
                    results = results.filter(inv => inv.usedAt === null);
                  }

                  // Handle expired cleanup query
                  const nowParam = params.find((p: any) => p.name === '@now');
                  if (nowParam && querySpec.query.includes('expiresAt < @now')) {
                    results = results.filter(inv => inv.expiresAt < nowParam.value && inv.usedAt === null);
                    return { resources: results.map(inv => ({ id: inv.id, _partitionKey: inv._partitionKey })) };
                  }

                  return { resources: results };
                }),
              })),
            },
            item: jest.fn((id: string, partitionKey: string) => ({
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
                if (!doc) {
                  const error = new Error('Not found');
                  (error as any).code = 404;
                  throw error;
                }
                for (const op of operations) {
                  if (op.op === 'add' || op.op === 'replace') {
                    const pathParts = op.path.split('/').filter(Boolean);
                    let target = doc;
                    for (let i = 0; i < pathParts.length - 1; i++) {
                      target = target[pathParts[i]];
                    }
                    target[pathParts[pathParts.length - 1]] = op.value;
                  }
                }
                inviteStore.set(id, doc);
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

import {
  createInvite,
  getInvite,
  validateInvite,
  redeemInvite,
  listInvites,
  deleteInvite,
  cleanupExpiredInvites,
  resetInviteContainerCache,
} from '@auth/service/inviteStore';

describe('Invite Store', () => {
  beforeEach(() => {
    inviteStore.clear();
    resetInviteContainerCache();
  });

  describe('createInvite', () => {
    it('creates an invite with default expiry', async () => {
      const invite = await createInvite({
        createdBy: 'admin-123',
      });

      expect(invite.inviteCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(invite.email).toBeNull();
      expect(invite.createdBy).toBe('admin-123');
      expect(invite.usedAt).toBeNull();
      expect(invite.usedByUserId).toBeNull();

      // Check expiry is ~30 days from now
      const expiresAt = new Date(invite.expiresAt);
      const expectedExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      expect(Math.abs(expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
    });

    it('creates an invite with email restriction', async () => {
      const invite = await createInvite({
        email: 'User@Example.com',
        createdBy: 'admin-123',
      });

      expect(invite.email).toBe('user@example.com'); // Lowercased
    });

    it('creates an invite with custom expiry', async () => {
      const invite = await createInvite({
        createdBy: 'admin-123',
        expiresInDays: 7,
      });

      const expiresAt = new Date(invite.expiresAt);
      const expectedExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      expect(Math.abs(expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
    });
  });

  describe('getInvite', () => {
    it('retrieves an existing invite', async () => {
      const created = await createInvite({ createdBy: 'admin-123' });
      const retrieved = await getInvite(created.inviteCode);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.inviteCode).toBe(created.inviteCode);
    });

    it('returns null for non-existent invite', async () => {
      const result = await getInvite('XXXX-YYYY');
      expect(result).toBeNull();
    });

    it('normalizes invite code case', async () => {
      const created = await createInvite({ createdBy: 'admin-123' });
      const retrieved = await getInvite(created.inviteCode.toLowerCase());

      expect(retrieved).not.toBeNull();
    });
  });

  describe('validateInvite', () => {
    it('validates a valid invite', async () => {
      const invite = await createInvite({ createdBy: 'admin-123' });
      const result = await validateInvite(invite.inviteCode, 'any@email.com');

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.invite.inviteCode).toBe(invite.inviteCode);
      }
    });

    it('rejects non-existent invite', async () => {
      const result = await validateInvite('XXXX-YYYY', 'any@email.com');

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe('not_found');
      }
    });

    it('rejects already used invite', async () => {
      const invite = await createInvite({ createdBy: 'admin-123' });

      // Manually mark as used
      const stored = inviteStore.get(invite.inviteCode);
      stored.usedAt = new Date().toISOString();
      stored.usedByUserId = 'user-456';
      inviteStore.set(invite.inviteCode, stored);

      const result = await validateInvite(invite.inviteCode, 'any@email.com');

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe('already_used');
      }
    });

    it('rejects expired invite', async () => {
      const invite = await createInvite({ createdBy: 'admin-123' });

      // Manually expire it
      const stored = inviteStore.get(invite.inviteCode);
      stored.expiresAt = new Date(Date.now() - 1000).toISOString();
      inviteStore.set(invite.inviteCode, stored);

      const result = await validateInvite(invite.inviteCode, 'any@email.com');

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe('expired');
      }
    });

    it('rejects email mismatch for restricted invite', async () => {
      const invite = await createInvite({
        createdBy: 'admin-123',
        email: 'specific@user.com',
      });

      const result = await validateInvite(invite.inviteCode, 'different@user.com');

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe('email_mismatch');
      }
    });

    it('accepts matching email for restricted invite', async () => {
      const invite = await createInvite({
        createdBy: 'admin-123',
        email: 'specific@user.com',
      });

      const result = await validateInvite(invite.inviteCode, 'SPECIFIC@USER.COM');

      expect(result.valid).toBe(true);
    });
  });

  describe('redeemInvite', () => {
    it('redeems a valid invite', async () => {
      const invite = await createInvite({ createdBy: 'admin-123' });

      const result = await redeemInvite({
        inviteCode: invite.inviteCode,
        userId: 'user-789',
        userEmail: 'user@example.com',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.invite.usedAt).not.toBeNull();
        expect(result.invite.usedByUserId).toBe('user-789');
      }

      // Verify store was updated
      const stored = inviteStore.get(invite.inviteCode);
      expect(stored.usedAt).not.toBeNull();
      expect(stored.usedByUserId).toBe('user-789');
    });

    it('fails to redeem non-existent invite', async () => {
      const result = await redeemInvite({
        inviteCode: 'XXXX-YYYY',
        userId: 'user-789',
        userEmail: 'user@example.com',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('not_found');
      }
    });

    it('fails to redeem already used invite', async () => {
      const invite = await createInvite({ createdBy: 'admin-123' });

      // First redemption
      await redeemInvite({
        inviteCode: invite.inviteCode,
        userId: 'user-1',
        userEmail: 'user1@example.com',
      });

      // Second attempt
      const result = await redeemInvite({
        inviteCode: invite.inviteCode,
        userId: 'user-2',
        userEmail: 'user2@example.com',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('already_used');
      }
    });
  });

  describe('listInvites', () => {
    it('lists all invites', async () => {
      await createInvite({ createdBy: 'admin-1' });
      await createInvite({ createdBy: 'admin-2' });
      await createInvite({ createdBy: 'admin-1' });

      const invites = await listInvites();

      expect(invites.length).toBe(3);
    });

    it('filters by createdBy', async () => {
      await createInvite({ createdBy: 'admin-1' });
      await createInvite({ createdBy: 'admin-2' });
      await createInvite({ createdBy: 'admin-1' });

      const invites = await listInvites({ createdBy: 'admin-1' });

      expect(invites.length).toBe(2);
      expect(invites.every(inv => inv.createdBy === 'admin-1')).toBe(true);
    });

    it('filters unused invites', async () => {
      const inv1 = await createInvite({ createdBy: 'admin-1' });
      await createInvite({ createdBy: 'admin-1' });

      // Mark first as used
      await redeemInvite({
        inviteCode: inv1.inviteCode,
        userId: 'user-1',
        userEmail: 'user@example.com',
      });

      const invites = await listInvites({ unused: true });

      expect(invites.length).toBe(1);
      expect(invites[0]!.usedAt).toBeNull();
    });
  });

  describe('deleteInvite', () => {
    it('deletes an existing invite', async () => {
      const invite = await createInvite({ createdBy: 'admin-123' });

      const deleted = await deleteInvite(invite.inviteCode);

      expect(deleted).toBe(true);
      expect(inviteStore.has(invite.inviteCode)).toBe(false);
    });

    it('returns false for non-existent invite', async () => {
      const deleted = await deleteInvite('XXXX-YYYY');

      expect(deleted).toBe(false);
    });
  });

  describe('cleanupExpiredInvites', () => {
    it('removes expired unused invites', async () => {
      const valid = await createInvite({ createdBy: 'admin-123' });
      const expired = await createInvite({ createdBy: 'admin-123' });

      // Expire one
      const stored = inviteStore.get(expired.inviteCode);
      stored.expiresAt = new Date(Date.now() - 1000).toISOString();
      inviteStore.set(expired.inviteCode, stored);

      const count = await cleanupExpiredInvites();

      expect(count).toBe(1);
      expect(inviteStore.has(valid.inviteCode)).toBe(true);
      expect(inviteStore.has(expired.inviteCode)).toBe(false);
    });

    it('keeps expired but used invites', async () => {
      const invite = await createInvite({ createdBy: 'admin-123' });

      // Expire and mark as used
      const stored = inviteStore.get(invite.inviteCode);
      stored.expiresAt = new Date(Date.now() - 1000).toISOString();
      stored.usedAt = new Date().toISOString();
      stored.usedByUserId = 'user-123';
      inviteStore.set(invite.inviteCode, stored);

      const count = await cleanupExpiredInvites();

      expect(count).toBe(0);
      expect(inviteStore.has(invite.inviteCode)).toBe(true);
    });
  });
});
