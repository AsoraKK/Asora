import { InvocationContext } from '@azure/functions';
import { getPolicyForRoute } from '../../src/rate-limit/policies';
import { opsStateRouteHandler } from '../../src/admin/routes/ops_state.function';
import { httpReqMock } from '../helpers/http';
import { recordAdminAudit } from '../../src/admin/auditLogger';

jest.mock('@shared/clients/cosmos', () => ({
  getCosmosDatabase: jest.fn(),
}));

jest.mock('../../src/admin/auditLogger', () => ({
  recordAdminAudit: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/admin/adminAuthUtils', () => ({
  requireActiveModerator: jest.fn((handler) => async (req, context) => {
    const role = req.headers.get('x-role');
    if (role === 'moderator' || role === 'admin') {
      (req as any).principal = { sub: role === 'admin' ? 'admin-1' : 'moderator-1' };
      return handler(req, context);
    }
    return { status: 403, body: JSON.stringify({ error: 'forbidden' }) };
  }),
  requireActiveAdmin: jest.fn((handler) => async (req, context) => {
    const role = req.headers.get('x-role');
    if (role === 'admin') {
      (req as any).principal = { sub: 'admin-1' };
      return handler(req, context);
    }
    return { status: 403, body: JSON.stringify({ error: 'forbidden' }) };
  }),
}));

const { getCosmosDatabase } = jest.requireMock('@shared/clients/cosmos') as {
  getCosmosDatabase: jest.Mock;
};

const recordAdminAuditMock = recordAdminAudit as jest.Mock;

let storedState: any | null = null;

const contextStub = {
  invocationId: 'invocation-ops-state-1',
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as InvocationContext;

describe('ops state route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storedState = null;

    getCosmosDatabase.mockReturnValue({
      container: jest.fn(() => ({
        item: jest.fn(() => ({
          read: async () => {
            if (!storedState) {
              const error = new Error('not found') as Error & { code?: number };
              error.code = 404;
              throw error;
            }
            return { resource: storedState };
          },
        })),
        items: {
          upsert: async (document: any) => {
            storedState = { ...document };
            return { resource: storedState };
          },
        },
      })),
    });
  });

  it('allows moderator GET and seeds default document when missing', async () => {
    const req = httpReqMock({
      method: 'GET',
      headers: { 'x-role': 'moderator' },
      url: 'https://example.com/api/_admin/ops/state',
    });
    const response = await opsStateRouteHandler(req as any, contextStub);
    expect(response.status).toBe(200);
    const body = JSON.parse(response.body as string);
    expect(body.success).toBe(true);
    expect(body.data.operatorChecklistMode).toBe(false);
    expect((response.headers as Record<string, string>)['Cache-Control']).toBe('private, no-store');
  });

  it('rejects PUT for moderator and allows PUT for admin', async () => {
    const forbiddenReq = httpReqMock({
      method: 'PUT',
      headers: { 'x-role': 'moderator' },
      body: { operatorChecklistMode: true },
      url: 'https://example.com/api/_admin/ops/state',
    });
    const forbiddenRes = await opsStateRouteHandler(forbiddenReq as any, contextStub);
    expect(forbiddenRes.status).toBe(403);

    const adminReq = httpReqMock({
      method: 'PUT',
      headers: { 'x-role': 'admin' },
      body: { operatorChecklistMode: true },
      url: 'https://example.com/api/_admin/ops/state',
    });
    const adminRes = await opsStateRouteHandler(adminReq as any, contextStub);
    expect(adminRes.status).toBe(200);

    const body = JSON.parse(adminRes.body as string);
    expect(body.data.operatorChecklistMode).toBe(true);
    expect(recordAdminAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'OPS_CHECKLIST_MODE_UPDATE',
        targetType: 'config',
      })
    );
  });

  it('returns 400 on invalid payload', async () => {
    const req = httpReqMock({
      method: 'PUT',
      headers: { 'x-role': 'admin' },
      body: { operatorChecklistMode: 'yes' },
      url: 'https://example.com/api/_admin/ops/state',
    });
    const response = await opsStateRouteHandler(req as any, contextStub);
    expect(response.status).toBe(400);
  });

  it('returns CORS preflight for OPTIONS', async () => {
    const req = httpReqMock({
      method: 'OPTIONS',
      url: 'https://example.com/api/_admin/ops/state',
    });
    const response = await opsStateRouteHandler(req as any, contextStub);
    expect(response.status).toBe(200);
  });

  it('maps ops state route to write policy on PUT', () => {
    const req = httpReqMock({
      method: 'PUT',
      url: 'https://example.com/api/_admin/ops/state',
    });
    const policy = getPolicyForRoute(req as any);
    expect(policy.name).toContain('write');
  });
});
