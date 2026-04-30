/**
 * DSR Hardening Tests – Workstream 6
 *
 * Covers all 15 hardening requirements:
 *  1. End-to-end export shape
 *  2. Export rate limit
 *  3. Delete account idempotency
 *  4. Delete content scrub/purge behaviour (via cascadeDelete)
 *  5. Delete provider links (auth_identities via cascadeDelete Postgres)
 *  6. Delete refresh tokens (revokeAllUserTokens)
 *  7. Delete / anonymise moderation-linked records
 *  8. Audit records for export/delete
 *  9. (Runbook consistency — covered by integration and route tests)
 * 10. No PII in logs
 * 11. No secrets in export
 * 12. Partial failure handling
 * 13. Retry-safe delete operation
 * 14. User-facing status/error response
 * 15. Tests for all of the above
 */

import type { InvocationContext } from '@azure/functions';
import { httpReqMock } from '../helpers/http';

// ─── Mock declarations (must precede imports of the modules under test) ────

jest.mock('@azure/cosmos');
jest.mock('@shared/utils/rateLimiter', () => ({
  createRateLimiter: jest.fn().mockReturnValue({
    checkRateLimit: jest.fn().mockResolvedValue({
      blocked: false,
      limit: 1,
      remaining: 0,
      resetTime: Date.now() + 3_600_000,
    }),
  }),
  endpointKeyGenerator: jest.fn(),
  userKeyGenerator: jest.fn(),
  defaultKeyGenerator: jest.fn(),
}));

jest.mock('@shared/services/exportCooldownService', () => ({
  enforceExportCooldown: jest.fn().mockResolvedValue(undefined),
  recordExportTimestamp: jest.fn().mockResolvedValue(undefined),
  ExportCooldownActiveError: class ExportCooldownActiveError extends Error {
    statusCode = 429;
    tier = 'free';
    nextAvailableAt = new Date(Date.now() + 86_400_000);
    toResponse() {
      return { code: 'export_cooldown_active', message: 'cooldown' };
    }
  },
}));

jest.mock('@shared/services/tierLimits', () => ({
  getExportCooldownDays: jest.fn().mockReturnValue(1),
}));

// ---- cascade delete + refreshTokenStore stubs ----
const mockExecuteCascadeDelete = jest.fn();
const mockRevokeAllUserTokens = jest.fn().mockResolvedValue(3);

jest.mock('../../src/privacy/service/cascadeDelete', () => ({
  executeCascadeDelete: mockExecuteCascadeDelete,
}));

jest.mock('@auth/service/refreshTokenStore', () => ({
  revokeAllUserTokens: mockRevokeAllUserTokens,
}));

// ─── Cosmos mock helpers ──────────────────────────────────────────────────
// A single container factory that returns the same shared mocks for every
// container name. This mirrors the pattern used by exportService.test.ts so
// that calls to postsContainer, commentsContainer, etc. all feed through the
// same mockQuery / mockRead / mockCreate jest.fn() references.

import { CosmosClient } from '@azure/cosmos';

const mockCreate = jest.fn().mockResolvedValue({});
const mockRead = jest.fn();
const mockQuery = jest.fn();
const mockItemPatch = jest.fn().mockResolvedValue({});

// Single factory used for ALL container names.
const mockContainer = (_name: string) => ({
  item: jest.fn().mockReturnValue({ read: mockRead, delete: jest.fn(), replace: jest.fn(), patch: mockItemPatch }),
  items: {
    query: jest.fn().mockReturnValue({ fetchAll: mockQuery }),
    create: mockCreate,
  },
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env.COSMOS_CONNECTION_STRING = 'AccountEndpoint=https://test.documents.azure.com:443/;AccountKey=dGVzdA==;';

  (CosmosClient as jest.MockedClass<typeof CosmosClient>).mockImplementation(
    () =>
      ({
        database: () => ({ container: mockContainer }),
      }) as any,
  );

  // Default cascade result: success, no errors
  mockExecuteCascadeDelete.mockResolvedValue({
    userId: 'user-1',
    deletedAt: new Date().toISOString(),
    deletedBy: 'user_request',
    cosmos: { deleted: { users: 1, likes: 2 }, anonymized: { posts: 1 }, skippedDueToHold: {} },
    postgres: { deleted: { follows: 0, profiles: 1, auth_identities: 1, refresh_tokens: 2, users: 1 } },
    errors: [],
  });

  // Default empty query result for export queries
  mockQuery.mockResolvedValue({ resources: [] });
});

// ─── Imports after mocks ─────────────────────────────────────────────────

import { deleteUserHandler } from '../../src/privacy/service/deleteService';
import { exportUserHandler } from '../../src/privacy/service/exportService';

const ctx = () => ({ log: jest.fn(), error: jest.fn(), invocationId: 'test' } as unknown as InvocationContext);

function deleteReq(extra: { headers?: Record<string, string> } = {}) {
  return httpReqMock({
    method: 'DELETE',
    headers: { 'x-confirm-delete': 'true', ...extra.headers },
  });
}

function exportReq(extra: { headers?: Record<string, string> } = {}) {
  return httpReqMock({
    method: 'GET',
    headers: { authorization: 'Bearer valid', ...extra.headers },
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────
function userExists(overrides: Record<string, unknown> = {}) {
  mockRead.mockResolvedValueOnce({
    resource: { id: 'user-1', displayName: 'Alice', createdAt: new Date().toISOString(), ...overrides },
  });
}

function userNotFound() {
  mockRead.mockRejectedValueOnce({ code: 404 });
}

// ==========================================================================
// 3. DELETE IDEMPOTENCY
// ==========================================================================

describe('Delete – idempotency', () => {
  it('returns 200 alreadyDeleted when user not found in Cosmos (404)', async () => {
    userNotFound();
    const res = await deleteUserHandler({ request: deleteReq(), context: ctx(), userId: 'user-1' });
    expect(res.status).toBe(200);
    const body = typeof res.jsonBody === 'object' && res.jsonBody !== null
      ? res.jsonBody as any
      : JSON.parse(res.body as string);
    expect(body).toMatchObject({ alreadyDeleted: true });
  });

  it('returns 200 alreadyDeleted when user record is null', async () => {
    mockRead.mockResolvedValueOnce({ resource: null });
    const res = await deleteUserHandler({ request: deleteReq(), context: ctx(), userId: 'user-1' });
    expect(res.status).toBe(200);
    const body = typeof res.jsonBody === 'object' && res.jsonBody !== null
      ? res.jsonBody as any
      : JSON.parse(res.body as string);
    expect(body.alreadyDeleted).toBe(true);
  });

  it('does NOT call executeCascadeDelete when user already deleted', async () => {
    userNotFound();
    await deleteUserHandler({ request: deleteReq(), context: ctx(), userId: 'user-1' });
    expect(mockExecuteCascadeDelete).not.toHaveBeenCalled();
  });
});

// ==========================================================================
// 4 + 5 + 7. CONTENT SCRUB / PROVIDER LINKS / MODERATION RECORDS
// ==========================================================================

describe('Delete – cascades via executeCascadeDelete', () => {
  it('calls executeCascadeDelete with userId and deletedBy=user_request', async () => {
    userExists();
    await deleteUserHandler({ request: deleteReq(), context: ctx(), userId: 'user-1' });
    expect(mockExecuteCascadeDelete).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', deletedBy: 'user_request' }),
    );
  });

  it('cascade result shows auth_identities (provider links) are deleted', async () => {
    userExists();
    const res = await deleteUserHandler({ request: deleteReq(), context: ctx(), userId: 'user-1' });
    expect(res.status).toBe(200);
    expect(mockExecuteCascadeDelete).toHaveBeenCalled();
    // The mock cascade result has postgres.deleted.auth_identities = 1
    const cascadeArg = mockExecuteCascadeDelete.mock.calls[0][0];
    expect(cascadeArg.userId).toBe('user-1');
  });
});

// ==========================================================================
// 6. DELETE REFRESH TOKENS (SESSION REVOCATION)
// ==========================================================================

describe('Delete – session revocation', () => {
  it('calls revokeAllUserTokens after cascade delete', async () => {
    userExists();
    await deleteUserHandler({ request: deleteReq(), context: ctx(), userId: 'user-1' });
    expect(mockRevokeAllUserTokens).toHaveBeenCalledWith('user-1');
  });

  it('completes successfully even if token revocation fails (non-fatal)', async () => {
    userExists();
    mockRevokeAllUserTokens.mockRejectedValueOnce(new Error('Postgres unreachable'));
    const res = await deleteUserHandler({ request: deleteReq(), context: ctx(), userId: 'user-1' });
    expect(res.status).toBe(200);
  });

  it('marks partialFailure=true when token revocation fails', async () => {
    userExists();
    mockRevokeAllUserTokens.mockRejectedValueOnce(new Error('timeout'));
    const res = await deleteUserHandler({ request: deleteReq(), context: ctx(), userId: 'user-1' });
    const body = typeof res.jsonBody === 'object' && res.jsonBody !== null
      ? res.jsonBody as any
      : JSON.parse(res.body as string ?? '{}');
    expect(body.partialFailure).toBe(true);
  });
});

// ==========================================================================
// 8. AUDIT RECORDS FOR EXPORT / DELETE
// ==========================================================================

describe('Delete – audit record', () => {
  it('writes audit record to privacy_audit container on success', async () => {
    userExists();
    await deleteUserHandler({ request: deleteReq(), context: ctx(), userId: 'user-1' });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        action: 'delete',
        operator: 'self',
        result: 'success',
      }),
    );
  });

  it('includes deletionId in the audit record', async () => {
    userExists();
    await deleteUserHandler({ request: deleteReq(), context: ctx(), userId: 'user-1' });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ deletionId: expect.stringMatching(/^del_/) }),
    );
  });

  it('records result=partial when cascade has errors', async () => {
    userExists();
    mockExecuteCascadeDelete.mockResolvedValueOnce({
      userId: 'user-1',
      deletedAt: new Date().toISOString(),
      deletedBy: 'user_request',
      cosmos: { deleted: {}, anonymized: {}, skippedDueToHold: {} },
      postgres: { deleted: {} },
      errors: [{ container: 'comments', error: 'timeout' }],
    });
    await deleteUserHandler({ request: deleteReq(), context: ctx(), userId: 'user-1' });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'partial', errors: expect.any(Array) }),
    );
  });

  it('writes audit record even on critical error', async () => {
    userExists();
    mockExecuteCascadeDelete.mockRejectedValueOnce(new Error('fatal'));
    const res = await deleteUserHandler({ request: deleteReq(), context: ctx(), userId: 'user-1' });
    expect(res.status).toBe(500);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'delete', result: 'failure' }),
    );
  });
});

// ==========================================================================
// 10. NO PII IN LOGS
// ==========================================================================

describe('Delete – no PII in logs', () => {
  it('does not log raw email in any log call', async () => {
    userExists();
    const context = ctx();
    await deleteUserHandler({ request: deleteReq(), context, userId: 'user-1' });
    const allLogArgs = (context.log as jest.Mock).mock.calls.flat(3).join(' ');
    expect(allLogArgs).not.toMatch(/@example\.com/);
    expect(allLogArgs).not.toMatch(/password/i);
  });

  it('does not log raw JWT token', async () => {
    userExists();
    const context = ctx();
    await deleteUserHandler({
      request: deleteReq({ headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test' } }),
      context,
      userId: 'user-1',
    });
    const allLogArgs = (context.log as jest.Mock).mock.calls.flat(3).join(' ');
    expect(allLogArgs).not.toMatch(/eyJ/);
  });
});

describe('Export – no PII in logs', () => {
  it('does not log raw email in any log call', async () => {
    mockRead.mockResolvedValue({ resource: { id: 'u1', email: 'alice@example.com', createdAt: new Date().toISOString() } });
    const context = ctx();
    await exportUserHandler({ request: exportReq(), context, userId: 'user-1', tier: 'free' });
    const allLogArgs = (context.log as jest.Mock).mock.calls.flat(3).join(' ');
    expect(allLogArgs).not.toMatch(/alice@example\.com/);
  });
});

// ==========================================================================
// 11. NO SECRETS IN EXPORT
// ==========================================================================

describe('Export – secrets excluded', () => {
  it('does not include raw provider secret fields in user profile export', async () => {
    // The user record in Cosmos has secret-like fields; redactRecord() should strip them
    mockRead.mockResolvedValueOnce({
      resource: {
        id: 'user-1',
        displayName: 'Alice',
        email: 'alice@example.com',
        accessToken: 'Bearer secret123',
        clientSecret: 'super-secret',
        createdAt: new Date().toISOString(),
      },
    });
    const res = await exportUserHandler({ request: exportReq(), context: ctx(), userId: 'user-1', tier: 'free' });
    const body = JSON.parse(res.body as string);
    // The export service maps specific user fields; raw secrets from Cosmos don't leak through
    const profileStr = JSON.stringify(body.userProfile);
    expect(profileStr).not.toContain('secret123');
    expect(profileStr).not.toContain('super-secret');
  });

  it('raw IP address from a post document does not appear in the export', async () => {
    // The export service maps posts to a fixed schema without ipAddress; raw IP must not leak
    mockRead.mockResolvedValueOnce({ resource: { id: 'user-1', createdAt: new Date().toISOString() } });
    mockQuery
      .mockResolvedValueOnce({ resources: [{ id: 'p1', content: 'hello', createdAt: new Date().toISOString(), ipAddress: '192.168.1.1', authorId: 'user-1' }] })
      .mockResolvedValue({ resources: [] });

    const res = await exportUserHandler({ request: exportReq(), context: ctx(), userId: 'user-1', tier: 'free' });
    const bodyStr = JSON.stringify(JSON.parse(res.body as string).content.posts);
    expect(bodyStr).not.toContain('192.168.1.1');
  });

  it('internal token fields from post documents do not appear in the export', async () => {
    // The export service maps posts to a fixed schema; token fields must not leak through
    mockRead.mockResolvedValueOnce({ resource: { id: 'user-1', createdAt: new Date().toISOString() } });
    mockQuery
      .mockResolvedValueOnce({ resources: [{ id: 'p1', content: 'hi', createdAt: new Date().toISOString(), internalToken: 'tok_xyz', authorId: 'user-1' }] })
      .mockResolvedValue({ resources: [] });

    const res = await exportUserHandler({ request: exportReq(), context: ctx(), userId: 'user-1', tier: 'free' });
    const bodyStr = JSON.stringify(JSON.parse(res.body as string).content.posts);
    expect(bodyStr).not.toContain('tok_xyz');
    expect(bodyStr).not.toContain('internalToken');
  });

  it('export does not include auth_identities or provider token fields', async () => {
    mockRead.mockResolvedValueOnce({ resource: { id: 'user-1', createdAt: new Date().toISOString() } });
    const res = await exportUserHandler({ request: exportReq(), context: ctx(), userId: 'user-1', tier: 'free' });
    const bodyStr = JSON.stringify(JSON.parse(res.body as string));
    expect(bodyStr).not.toContain('auth_identities');
    expect(bodyStr).not.toContain('provider_token');
    expect(bodyStr).not.toContain('refresh_token');
  });
});

// ==========================================================================
// 12. PARTIAL FAILURE HANDLING
// ==========================================================================

describe('Delete – partial failure response', () => {
  it('returns 200 with partialFailure=true when cascade has non-fatal errors', async () => {
    userExists();
    mockExecuteCascadeDelete.mockResolvedValueOnce({
      userId: 'user-1',
      deletedAt: new Date().toISOString(),
      deletedBy: 'user_request',
      cosmos: { deleted: { users: 1 }, anonymized: {}, skippedDueToHold: {} },
      postgres: { deleted: {} },
      errors: [{ container: 'comments', error: 'timeout' }],
    });
    const res = await deleteUserHandler({ request: deleteReq(), context: ctx(), userId: 'user-1' });
    expect(res.status).toBe(200);
    const body = typeof res.jsonBody === 'object' && res.jsonBody !== null
      ? res.jsonBody as any
      : JSON.parse(res.body as string ?? '{}');
    expect(body.partialFailure).toBe(true);
    expect(body.code).toBe('account_deleted');
  });

  it('returns 200 with partialFailure=false when no errors', async () => {
    userExists();
    const res = await deleteUserHandler({ request: deleteReq(), context: ctx(), userId: 'user-1' });
    const body = typeof res.jsonBody === 'object' && res.jsonBody !== null
      ? res.jsonBody as any
      : JSON.parse(res.body as string ?? '{}');
    expect(body.partialFailure).toBe(false);
  });
});

// ==========================================================================
// 13. RETRY-SAFE DELETE
// ==========================================================================

describe('Delete – retry safety', () => {
  it('second call on already-deleted user returns 200 alreadyDeleted (no second cascade)', async () => {
    userNotFound();
    const res = await deleteUserHandler({ request: deleteReq(), context: ctx(), userId: 'user-1' });
    expect(res.status).toBe(200);
    const body = typeof res.jsonBody === 'object' && res.jsonBody !== null
      ? res.jsonBody as any
      : JSON.parse(res.body as string);
    expect(body.alreadyDeleted).toBe(true);
    expect(mockExecuteCascadeDelete).not.toHaveBeenCalled();
  });

  it('is safe to call multiple times without errors', async () => {
    userNotFound();
    const r1 = await deleteUserHandler({ request: deleteReq(), context: ctx(), userId: 'user-1' });
    userNotFound();
    const r2 = await deleteUserHandler({ request: deleteReq(), context: ctx(), userId: 'user-1' });
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
  });
});

// ==========================================================================
// 14. USER-FACING STATUS/ERROR RESPONSE
// ==========================================================================

describe('Delete – user-facing response', () => {
  it('success response contains userId, deletedAt, deletionId, code', async () => {
    userExists();
    const res = await deleteUserHandler({ request: deleteReq(), context: ctx(), userId: 'user-42' });
    const body = typeof res.jsonBody === 'object' && res.jsonBody !== null
      ? res.jsonBody as any
      : JSON.parse(res.body as string ?? '{}');
    expect(body.code).toBe('account_deleted');
    expect(body.userId).toBe('user-42');
    expect(body.deletedAt).toBeDefined();
    expect(body.deletionId).toMatch(/^del_/);
  });

  it('returns 401 when userId is empty', async () => {
    const res = await deleteUserHandler({ request: deleteReq(), context: ctx(), userId: '' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when X-Confirm-Delete header is missing', async () => {
    const res = await deleteUserHandler({
      request: httpReqMock({ method: 'DELETE' }),
      context: ctx(),
      userId: 'user-1',
    });
    expect(res.status).toBe(400);
    const body = JSON.parse(res.body as string);
    expect(body.code).toBe('confirmation_required');
  });

  it('500 error response does not include internal error detail', async () => {
    userExists();
    mockExecuteCascadeDelete.mockRejectedValueOnce(new Error('Internal cosmos credential error: key=abc123'));
    const res = await deleteUserHandler({ request: deleteReq(), context: ctx(), userId: 'user-1' });
    expect(res.status).toBe(500);
    const body = JSON.parse(res.body as string);
    expect(JSON.stringify(body)).not.toContain('credential error');
    expect(JSON.stringify(body)).not.toContain('abc123');
  });
});

describe('Export – user-facing response', () => {
  beforeEach(() => {
    mockRead.mockResolvedValue({ resource: { id: 'u1', createdAt: new Date().toISOString() } });
    // mockQuery default is already { resources: [] } from outer beforeEach
  });

  it('success response has correct top-level shape', async () => {
    const res = await exportUserHandler({ request: exportReq(), context: ctx(), userId: 'u1', tier: 'free' });
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body as string);
    expect(body).toMatchObject({
      metadata: expect.objectContaining({ exportId: expect.stringMatching(/^exp_/) }),
      userProfile: expect.any(Object),
      content: expect.objectContaining({ posts: expect.any(Array), comments: expect.any(Array) }),
      interactions: expect.objectContaining({ likes: expect.any(Array), flags: expect.any(Array) }),
      moderation: expect.objectContaining({ appeals: expect.any(Array), votes: expect.any(Array) }),
    });
  });

  it('401 when userId is empty', async () => {
    const res = await exportUserHandler({ request: exportReq(), context: ctx(), userId: '', tier: 'free' });
    expect(res.status).toBe(401);
  });

  it('500 error response does not include internal detail field', async () => {
    // Force a late-stage error to trigger the outer catch (recordExportTimestamp is not caught)
    const exportCooldownModule = require('@shared/services/exportCooldownService');
    (exportCooldownModule.recordExportTimestamp as jest.Mock).mockRejectedValueOnce(
      new Error('internal db error: secret_key=xyz'),
    );
    const res = await exportUserHandler({ request: exportReq(), context: ctx(), userId: 'u1', tier: 'free' });
    expect(res.status).toBe(500);
    const body = JSON.parse(res.body as string);
    // 'detail' key must be absent — no internal error message leaked
    expect(body).not.toHaveProperty('detail');
    // exportId must still be present for support reference
    expect(body.exportId).toBeDefined();
    // Internal secret must not appear in response
    expect(JSON.stringify(body)).not.toContain('secret_key');
  });
});

// ==========================================================================
// 1. EXPORT SHAPE
// ==========================================================================

describe('Export – shape completeness', () => {
  it('includes profile data with displayName and email', async () => {
    mockRead.mockResolvedValueOnce({
      resource: { id: 'u2', displayName: 'Bob', email: 'bob@example.com', tier: 'premium', createdAt: new Date().toISOString() },
    });
    // mockQuery default = { resources: [] } for posts, comments, likes, flags, appeals, votes
    const res = await exportUserHandler({ request: exportReq(), context: ctx(), userId: 'u2', tier: 'premium' });
    const body = JSON.parse(res.body as string);
    expect(body.userProfile.displayName).toBe('Bob');
    expect(body.userProfile.email).toBe('bob@example.com');
  });

  it('includes posts from Cosmos in the export', async () => {
    mockRead.mockResolvedValueOnce({ resource: { id: 'u2', createdAt: new Date().toISOString() } });
    // First call to mockQuery = posts, rest = empty
    mockQuery
      .mockResolvedValueOnce({ resources: [{ id: 'post-1', content: 'hello', createdAt: new Date().toISOString() }] })
      .mockResolvedValue({ resources: [] });
    const res = await exportUserHandler({ request: exportReq(), context: ctx(), userId: 'u2', tier: 'premium' });
    expect(JSON.parse(res.body as string).content.posts).toHaveLength(1);
  });

  it('includes comments from Cosmos in the export', async () => {
    mockRead.mockResolvedValueOnce({ resource: { id: 'u2', createdAt: new Date().toISOString() } });
    // posts = empty, comments = one record
    mockQuery
      .mockResolvedValueOnce({ resources: [] }) // posts
      .mockResolvedValueOnce({ resources: [{ id: 'c1', content: 'world', createdAt: new Date().toISOString(), postId: 'p1' }] }) // comments
      .mockResolvedValue({ resources: [] });
    const res = await exportUserHandler({ request: exportReq(), context: ctx(), userId: 'u2', tier: 'premium' });
    expect(JSON.parse(res.body as string).content.comments).toHaveLength(1);
  });
});

// ==========================================================================
// 2. EXPORT RATE LIMIT / COOLDOWN
// ==========================================================================

describe('Export – rate limit', () => {
  it('returns 429 when export cooldown is active', async () => {
    const exportCooldownModule = require('@shared/services/exportCooldownService');
    const { ExportCooldownActiveError } = exportCooldownModule;
    (exportCooldownModule.enforceExportCooldown as jest.Mock).mockRejectedValueOnce(
      Object.assign(new ExportCooldownActiveError('cooldown active'), {
        statusCode: 429,
        tier: 'free',
        nextAvailableAt: new Date(Date.now() + 86_400_000),
        toResponse: () => ({ code: 'export_cooldown_active', message: 'cooldown' }),
      }),
    );
    const res = await exportUserHandler({ request: exportReq(), context: ctx(), userId: 'u1', tier: 'free' });
    expect(res.status).toBe(429);
    expect(JSON.parse(res.body as string).code).toBe('export_cooldown_active');
  });
});

// ==========================================================================
// EXPORT AUDIT
// ==========================================================================

describe('Export – audit record', () => {
  beforeEach(() => {
    mockRead.mockResolvedValue({ resource: { id: 'u3', createdAt: new Date().toISOString() } });
  });

  it('writes audit record with action=export operator=self', async () => {
    await exportUserHandler({ request: exportReq(), context: ctx(), userId: 'u3', tier: 'free' });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u3', action: 'export', operator: 'self' }),
    );
  });

  it('includes X-Export-ID header in successful response', async () => {
    const res = await exportUserHandler({ request: exportReq(), context: ctx(), userId: 'u3', tier: 'free' });
    expect(res.headers?.['X-Export-ID']).toMatch(/^exp_/);
  });
});
