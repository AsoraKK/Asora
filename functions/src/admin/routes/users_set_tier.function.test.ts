/**
 * Admin: Set User Tier — unit tests
 *
 * Verifies the handler returns correct responses for:
 * - happy path (valid tier set)
 * - invalid tier value (400)
 * - missing userId (400)
 * - user not found (404)
 */

import type { InvocationContext } from '@azure/functions';
import { httpReqMock } from '../../../tests/helpers/http';

jest.mock('@azure/functions', () => ({
  app: { http: jest.fn() },
}));

jest.mock('@shared/clients/cosmos', () => ({
  getTargetDatabase: jest.fn(),
}));

jest.mock('../auditLogger', () => ({
  recordAdminAudit: jest.fn().mockResolvedValue(undefined),
}));

import { getTargetDatabase } from '@shared/clients/cosmos';
import { recordAdminAudit } from '../auditLogger';
import { setUserTier } from './users_set_tier.function';

const getTargetDatabaseMock = getTargetDatabase as jest.Mock;
const recordAdminAuditMock = recordAdminAudit as jest.Mock;

const contextStub = {
  invocationId: 'test-set-tier',
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as InvocationContext;

function makeItemMock(user: Record<string, unknown> | null) {
  return {
    read: jest.fn().mockResolvedValue({ resource: user }),
    patch: jest.fn().mockResolvedValue({}),
  };
}

function paidGrantBody(tier: 'premium' | 'black' = 'black') {
  const now = Date.now();
  return {
    tier,
    reason: 'Controlled Alpha tester grant',
    reviewAt: new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

describe('setUserTier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when userId is missing', async () => {
    const req = httpReqMock({
      method: 'PATCH',
      params: {},
      body: paidGrantBody(),
      principal: { sub: 'admin-1', roles: ['admin'] },
    });

    const res = await setUserTier(req as any, contextStub);

    expect(res.status).toBe(400);
    const body = JSON.parse(res.body as string);
    expect(body.message).toBe('missing_user_id');
  });

  it('returns 400 when tier is invalid', async () => {
    const req = httpReqMock({
      method: 'PATCH',
      params: { userId: 'u1' },
      body: { tier: 'diamond' },
      principal: { sub: 'admin-1', roles: ['admin'] },
    });

    const res = await setUserTier(req as any, contextStub);

    expect(res.status).toBe(400);
    const body = JSON.parse(res.body as string);
    expect(body.message).toBe('invalid_tier');
  });

  it('returns 404 when user does not exist in Cosmos', async () => {
    const itemMock = makeItemMock(null);
    getTargetDatabaseMock.mockReturnValue({
      users: { item: jest.fn().mockReturnValue(itemMock) },
    });

    const req = httpReqMock({
      method: 'PATCH',
      params: { userId: 'missing-user' },
      body: paidGrantBody(),
      principal: { sub: 'admin-1', roles: ['admin'] },
    });

    const res = await setUserTier(req as any, contextStub);

    expect(res.status).toBe(404);
    const body = JSON.parse(res.body as string);
    expect(body.message).toBe('not_found');
  });

  it('sets tier, patches Cosmos, and records audit on happy path', async () => {
    const existingUser = { id: 'u1', tier: 'free', email: 'test@test.com' };
    const itemMock = makeItemMock(existingUser);
    getTargetDatabaseMock.mockReturnValue({
      users: { item: jest.fn().mockReturnValue(itemMock) },
    });

    const req = httpReqMock({
      method: 'PATCH',
      params: { userId: 'u1' },
      body: paidGrantBody(),
      principal: { sub: 'admin-1', roles: ['admin'] },
    });

    const res = await setUserTier(req as any, contextStub);

    expect(res.status).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body.data.userId).toBe('u1');
    expect(body.data.tier).toBe('black');

    // Cosmos was patched with new tier
    expect(itemMock.patch).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ op: 'set', path: '/tier', value: 'black' }),
      ])
    );

    // Audit log recorded with before/after tier
    expect(recordAdminAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_TIER_SET',
        subjectId: 'u1',
        before: expect.objectContaining({ tier: 'free' }),
        after: expect.objectContaining({ tier: 'black' }),
      })
    );
  });

  it('uses "free" as previous tier when user doc lacks tier field', async () => {
    const existingUser = { id: 'u2', email: 'a@b.com' }; // no tier field
    const itemMock = makeItemMock(existingUser);
    getTargetDatabaseMock.mockReturnValue({
      users: { item: jest.fn().mockReturnValue(itemMock) },
    });

    const req = httpReqMock({
      method: 'PATCH',
      params: { userId: 'u2' },
      body: paidGrantBody(),
      principal: { sub: 'admin-1', roles: ['admin'] },
    });

    await setUserTier(req as any, contextStub);

    expect(recordAdminAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        before: expect.objectContaining({ tier: 'free' }),
        after: expect.objectContaining({ tier: 'black' }),
      })
    );
  });
});
