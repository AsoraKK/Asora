/**
 * Admin Budget endpoint tests
 *   GET  /api/_admin/budget
 *   PUT  /api/_admin/budget
 *   OPTIONS /api/_admin/budget
 */
import { InvocationContext } from '@azure/functions';
import { httpReqMock } from '../helpers/http';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockRead = jest.fn();
const mockCreate = jest.fn();
const mockUpsert = jest.fn();

jest.mock('../../src/shared/clients/cosmos', () => ({
  getCosmos: () => ({
    database: () => ({
      container: () => ({
        item: () => ({ read: mockRead }),
        items: {
          create: mockCreate,
          upsert: mockUpsert,
        },
      }),
    }),
  }),
}));

jest.mock('../../src/admin/accessAuth', () => ({
  requireCloudflareAccess: jest.fn(),
}));

jest.mock('../../src/admin/cors', () => ({
  createCorsPreflightResponse: jest.fn().mockReturnValue({ status: 204 }),
  withCorsHeaders: jest.fn().mockImplementation((response) => response),
}));

jest.mock('@http/withRateLimit', () => ({
  withRateLimit: (handler: Function) => handler,
}));

jest.mock('@rate-limit/policies', () => ({
  getPolicyForRoute: jest.fn(),
}));

const BUDGET_DOC = {
  id: 'budget_config',
  partitionKey: 'budget',
  amount: 200,
  azureBudgetName: 'lythaus-dev-monthly',
  resourceGroup: 'asora-psql-flex',
  notificationEmail: 'kyle@asora.co.za',
  thresholds: { actual: [50, 80, 100], forecasted: [120] },
  updatedAt: '2024-01-01T00:00:00Z',
  updatedBy: 'system',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

import { requireCloudflareAccess } from '../../src/admin/accessAuth';
const requireCfMock = requireCloudflareAccess as jest.Mock;

const contextStub = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as InvocationContext;

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Admin Budget endpoint (_admin/budget)', () => {
  let handler: Function;

  beforeAll(async () => {
    const mod = await import('../../src/admin/routes/budget.function');
    handler = mod.adminBudgetHandler;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    requireCfMock.mockResolvedValue({ actor: 'owner-1' });
    mockRead.mockResolvedValue({ resource: BUDGET_DOC });
    mockUpsert.mockResolvedValue({ resource: { ...BUDGET_DOC, amount: 300 } });
    mockCreate.mockResolvedValue({ resource: BUDGET_DOC });
  });

  // ── CORS preflight ──

  it('returns 204 for OPTIONS preflight', async () => {
    const req = httpReqMock({
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:3000' },
    });
    const res = await handler(req, contextStub);
    expect(res.status).toBe(204);
  });

  // ── Auth ──

  it('returns 401 when Cloudflare Access auth fails', async () => {
    requireCfMock.mockResolvedValue({
      error: 'invalid token',
      status: 401,
      code: 'UNAUTHORIZED',
    });
    const req = httpReqMock({ method: 'GET' });
    const res = await handler(req, contextStub);
    expect(res.status).toBe(401);
  });

  // ── GET ──

  it('GET returns current budget config', async () => {
    const req = httpReqMock({ method: 'GET' });
    const res = await handler(req, contextStub);
    expect(res.status).toBe(200);
    expect(res.jsonBody.ok).toBe(true);
    expect(res.jsonBody.budget.amount).toBe(200);
    expect(res.jsonBody.budget.notificationEmail).toBe('kyle@asora.co.za');
  });

  it('GET seeds default config when Cosmos returns 404', async () => {
    mockRead.mockRejectedValueOnce({ code: 404 });
    const req = httpReqMock({ method: 'GET' });
    const res = await handler(req, contextStub);
    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalled();
  });

  it('GET returns 500 on unexpected Cosmos error', async () => {
    mockRead.mockRejectedValueOnce(new Error('Cosmos unavailable'));
    const req = httpReqMock({ method: 'GET' });
    const res = await handler(req, contextStub);
    expect(res.status).toBe(500);
  });

  // ── PUT ──

  it('PUT updates budget amount', async () => {
    mockRead.mockResolvedValue({ resource: BUDGET_DOC });
    const req = httpReqMock({
      method: 'PUT',
      body: { amount: 300 },
    });
    const res = await handler(req, contextStub);
    expect(res.status).toBe(200);
    expect(res.jsonBody.ok).toBe(true);
    expect(mockUpsert).toHaveBeenCalled();
  });

  it('PUT rejects amount below $10', async () => {
    const req = httpReqMock({
      method: 'PUT',
      body: { amount: 5 },
    });
    const res = await handler(req, contextStub);
    expect(res.status).toBe(400);
    expect(res.jsonBody.error.code).toBe('INVALID_AMOUNT');
  });

  it('PUT rejects amount above $10,000', async () => {
    const req = httpReqMock({
      method: 'PUT',
      body: { amount: 99999 },
    });
    const res = await handler(req, contextStub);
    expect(res.status).toBe(400);
    expect(res.jsonBody.error.code).toBe('INVALID_AMOUNT');
  });

  it('PUT rejects non-numeric amount', async () => {
    const req = httpReqMock({
      method: 'PUT',
      body: { amount: 'lots' },
    });
    const res = await handler(req, contextStub);
    expect(res.status).toBe(400);
  });

  it('PUT returns 500 on Cosmos failure', async () => {
    mockRead.mockRejectedValueOnce(new Error('Cosmos down'));
    const req = httpReqMock({
      method: 'PUT',
      body: { amount: 300 },
    });
    const res = await handler(req, contextStub);
    expect(res.status).toBe(500);
  });

  // ── Method not allowed ──

  it('returns 405 for unsupported methods', async () => {
    const req = httpReqMock({ method: 'DELETE' });
    const res = await handler(req, contextStub);
    expect(res.status).toBe(405);
  });
});
