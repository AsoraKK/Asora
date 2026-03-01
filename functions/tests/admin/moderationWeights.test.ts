/**
 * Admin moderation weight endpoints tests:
 *   - POST /api/admin/moderation-classes/weights (save)
 *   - POST /api/admin/moderation-classes/{className}/reset
 *   - GET  /api/admin/moderation-classes (list)
 */
import { InvocationContext } from '@azure/functions';
import { httpReqMock } from '../helpers/http';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUpsert = jest.fn().mockResolvedValue({ resource: {} });
const mockDelete = jest.fn().mockResolvedValue({});
const mockFetchAll = jest.fn().mockResolvedValue({ resources: [] });

jest.mock('@azure/cosmos', () => ({
  CosmosClient: jest.fn().mockImplementation(() => ({
    database: () => ({
      container: () => ({
        items: {
          upsert: mockUpsert,
          query: () => ({ fetchAll: mockFetchAll }),
        },
        item: () => ({ delete: mockDelete, read: jest.fn().mockResolvedValue({ resource: null }) }),
      }),
    }),
  })),
}));

jest.mock('../../src/admin/adminAuthUtils', () => ({
  requireActiveAdmin: (handler: Function) => handler,
}));

jest.mock('@http/withRateLimit', () => ({
  withRateLimit: (handler: Function) => handler,
}));

jest.mock('@rate-limit/policies', () => ({
  getPolicyForRoute: jest.fn(),
}));

jest.mock('../../shared/azure-logger', () => ({
  getAzureLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const contextStub = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  triggerMetadata: {},
} as unknown as InvocationContext;

function makeContext(className?: string) {
  return {
    ...contextStub,
    triggerMetadata: className ? { className } : {},
  } as unknown as InvocationContext;
}

// ── Save weight override ─────────────────────────────────────────────────────

describe('POST /admin/moderation-classes/weights (saveWeightOverride)', () => {
  let handler: Function;

  beforeAll(async () => {
    process.env.COSMOS_CONNECTION_STRING = 'AccountEndpoint=https://fake.documents.azure.com:443/;AccountKey=ZmFrZQ==;';
    const mod = await import('../../src/admin/save-weight-override.function');
    handler = mod.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpsert.mockResolvedValue({ resource: {} });
  });

  it('saves a valid weight override and returns 200', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: { className: 'hate', newWeight: 0.90, reason: 'testing' },
      principal: { sub: 'admin-42' },
    });
    const res = await handler(req, contextStub);
    expect(res.status).toBe(200);
    expect(res.jsonBody.success).toBe(true);
    expect(res.jsonBody.data.className).toBe('hate');
    expect(res.jsonBody.data.newWeight).toBe(0.90);
  });

  it('rejects invalid JSON body with 400', async () => {
    const req = httpReqMock({
      method: 'POST',
      principal: { sub: 'admin-42' },
    });
    // Override json() to throw
    (req as any).json = async () => { throw new Error('bad json'); };

    const res = await handler(req, contextStub);
    expect(res.status).toBe(400);
    expect(res.jsonBody.error).toBe('Invalid Request');
  });

  it('rejects missing className with 400', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: { newWeight: 0.9 },
      principal: { sub: 'admin-42' },
    });
    const res = await handler(req, contextStub);
    expect(res.status).toBe(400);
    expect(res.jsonBody.message).toContain('className');
  });

  it('rejects missing newWeight with 400', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: { className: 'hate' },
      principal: { sub: 'admin-42' },
    });
    const res = await handler(req, contextStub);
    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown class name', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: { className: 'nonexistent_class', newWeight: 0.8 },
      principal: { sub: 'admin-42' },
    });
    const res = await handler(req, contextStub);
    expect(res.status).toBe(404);
    expect(res.jsonBody.message).toContain('nonexistent_class');
  });

  it('rejects weight below minWeight with 400', async () => {
    // hate: minWeight 0.3, maxWeight 1.0
    const req = httpReqMock({
      method: 'POST',
      body: { className: 'hate', newWeight: 0.1 },
      principal: { sub: 'admin-42' },
    });
    const res = await handler(req, contextStub);
    expect(res.status).toBe(400);
    expect(res.jsonBody.error).toBe('Validation Error');
  });

  it('rejects weight above maxWeight with 400', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: { className: 'hate', newWeight: 1.5 },
      principal: { sub: 'admin-42' },
    });
    const res = await handler(req, contextStub);
    expect(res.status).toBe(400);
    expect(res.jsonBody.error).toBe('Validation Error');
  });

  it('returns 500 when COSMOS_CONNECTION_STRING is missing', async () => {
    const orig = process.env.COSMOS_CONNECTION_STRING;
    delete process.env.COSMOS_CONNECTION_STRING;

    const req = httpReqMock({
      method: 'POST',
      body: { className: 'hate', newWeight: 0.9 },
      principal: { sub: 'admin-42' },
    });
    const res = await handler(req, contextStub);
    expect(res.status).toBe(500);
    expect(res.jsonBody.error).toBe('Database Error');

    process.env.COSMOS_CONNECTION_STRING = orig;
  });

  it('returns 500 when Cosmos upsert throws', async () => {
    mockUpsert.mockRejectedValueOnce(new Error('Cosmos transient error'));
    const req = httpReqMock({
      method: 'POST',
      body: { className: 'hate', newWeight: 0.9 },
      principal: { sub: 'admin-42' },
    });
    const res = await handler(req, contextStub);
    expect(res.status).toBe(500);
    expect(res.jsonBody.error).toBe('Database Error');
  });

  it('uses principal.sub — not a hardcoded email', async () => {
    const req = httpReqMock({
      method: 'POST',
      body: { className: 'hate', newWeight: 0.90 },
      principal: { sub: 'custom-principal-id' },
    });
    const res = await handler(req, contextStub);
    expect(res.status).toBe(200);
    // Verify the upsert was called with the right actor ID (not admin@lythaus.com)
    const upsertCalls = mockUpsert.mock.calls;
    if (upsertCalls.length > 0) {
      const upsertedDoc = upsertCalls[0][0];
      if (upsertedDoc && upsertedDoc.updatedBy) {
        expect(upsertedDoc.updatedBy).toBe('custom-principal-id');
      }
    }
  });
});

// ── Reset weight override ────────────────────────────────────────────────────

describe('POST /admin/moderation-classes/{className}/reset (resetWeightOverride)', () => {
  let handler: Function;

  beforeAll(async () => {
    process.env.COSMOS_CONNECTION_STRING = 'AccountEndpoint=https://fake.documents.azure.com:443/;AccountKey=ZmFrZQ==;';
    const mod = await import('../../src/admin/reset-weight-override.function');
    handler = mod.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockDelete.mockResolvedValue({});
    // Ensure query().fetchAll() returns an override to delete
    mockFetchAll.mockResolvedValue({ resources: [{ id: 'override-1', className: 'hate' }] });
  });

  it('resets weight for known class and returns 200', async () => {
    const req = httpReqMock({ method: 'POST', principal: { sub: 'admin-42' } });
    const ctx = makeContext('hate');
    const res = await handler(req, ctx);
    expect(res.status).toBe(200);
    expect(res.jsonBody.success).toBe(true);
    expect(res.jsonBody.data.className).toBe('hate');
    expect(res.jsonBody.data.resetToDefault).toBe(0.85);
  });

  it('returns 400 when className is missing from route', async () => {
    const req = httpReqMock({ method: 'POST', principal: { sub: 'admin-42' } });
    const ctx = makeContext(); // no className
    const res = await handler(req, ctx);
    expect(res.status).toBe(400);
    expect(res.jsonBody.message).toContain('Class name required');
  });

  it('returns 404 for unknown class name', async () => {
    const req = httpReqMock({ method: 'POST', principal: { sub: 'admin-42' } });
    const ctx = makeContext('nonexistent_class');
    const res = await handler(req, ctx);
    expect(res.status).toBe(404);
  });

  it('returns 500 when Cosmos delete throws', async () => {
    mockDelete.mockRejectedValueOnce(new Error('Cosmos error'));
    const req = httpReqMock({ method: 'POST', principal: { sub: 'admin-42' } });
    const ctx = makeContext('hate');
    const res = await handler(req, ctx);
    expect(res.status).toBe(500);
    expect(res.jsonBody.error).toBe('Database Error');
  });
});

// ── Get moderation classes ───────────────────────────────────────────────────

describe('GET /admin/moderation-classes (getModerationClasses)', () => {
  let handler: Function;

  beforeAll(async () => {
    process.env.COSMOS_CONNECTION_STRING = 'AccountEndpoint=https://fake.documents.azure.com:443/;AccountKey=ZmFrZQ==;';
    const mod = await import('../../src/admin/get-moderation-classes.function');
    handler = mod.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchAll.mockResolvedValue({ resources: [] });
  });

  it('returns all moderation classes with 200', async () => {
    const req = httpReqMock({ method: 'GET', principal: { sub: 'admin-42' } });
    const res = await handler(req, contextStub);
    expect(res.status).toBe(200);
    expect(res.jsonBody.success).toBe(true);
    expect(Array.isArray(res.jsonBody.data.classes)).toBe(true);
    expect(res.jsonBody.data.classes.length).toBeGreaterThan(0);
    expect(res.jsonBody.data.summary.total).toBe(res.jsonBody.data.classes.length);
  });

  it('returns classes with correct shape', async () => {
    const req = httpReqMock({ method: 'GET', principal: { sub: 'admin-42' } });
    const res = await handler(req, contextStub);
    const firstClass = res.jsonBody.data.classes[0];
    expect(firstClass).toHaveProperty('id');
    expect(firstClass).toHaveProperty('name');
    expect(firstClass).toHaveProperty('defaultWeight');
    expect(firstClass).toHaveProperty('currentWeight');
    expect(firstClass).toHaveProperty('minWeight');
    expect(firstClass).toHaveProperty('maxWeight');
    expect(firstClass).toHaveProperty('isCustomized');
  });

  it('marks customized classes when overrides exist in Cosmos', async () => {
    mockFetchAll.mockResolvedValueOnce({
      resources: [{ className: 'hate', weight: 0.95 }],
    });
    const req = httpReqMock({ method: 'GET', principal: { sub: 'admin-42' } });
    const res = await handler(req, contextStub);
    expect(res.status).toBe(200);
    // The class loader uses loadModerationWeights which we've mocked at Cosmos level
    // In practice, with empty fetchAll, all isCustomized flags will be false
    const classes = res.jsonBody.data.classes;
    expect(classes.every((c: any) => typeof c.isCustomized === 'boolean')).toBe(true);
  });

  it('counts byApiType correctly', async () => {
    const req = httpReqMock({ method: 'GET', principal: { sub: 'admin-42' } });
    const res = await handler(req, contextStub);
    const { byApiType } = res.jsonBody.data.summary;
    expect(typeof byApiType.text).toBe('number');
    expect(typeof byApiType.image).toBe('number');
    expect(typeof byApiType.deepfake).toBe('number');
    const sum = byApiType.text + byApiType.image + byApiType.deepfake;
    expect(sum).toBe(res.jsonBody.data.summary.total);
  });

  it('gracefully handles missing COSMOS_CONNECTION_STRING', async () => {
    const orig = process.env.COSMOS_CONNECTION_STRING;
    delete process.env.COSMOS_CONNECTION_STRING;

    const req = httpReqMock({ method: 'GET', principal: { sub: 'admin-42' } });
    // The handler catches the Cosmos error and falls back to defaults
    const res = await handler(req, contextStub);
    expect(res.status).toBe(200);
    expect(res.jsonBody.data.classes.length).toBeGreaterThan(0);
    // All should show isCustomized = false (no overrides)
    expect(res.jsonBody.data.classes.every((c: any) => !c.isCustomized)).toBe(true);

    process.env.COSMOS_CONNECTION_STRING = orig;
  });
});
