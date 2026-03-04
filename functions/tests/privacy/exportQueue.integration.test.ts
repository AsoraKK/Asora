const DSR_REQUESTS = new Map<string, any>();

jest.mock('../../src/privacy/common/storage', () => ({
  enqueueDsrMessage: jest.fn(),
  createUserDelegationUrl: jest.fn(async () => ({
    url: 'https://storage.example.com/export.zip',
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
  })),
}));

jest.mock('../../src/privacy/common/zip', () => ({
  packageExportZip: jest.fn(async () => ({ blobPath: 'dsr-exports/dev/test-export.zip', exportBytes: 512 })),
}));

jest.mock('@shared/clients/cosmos', () => ({
  getCosmosDatabase: jest.fn(() => ({
    container: () => ({
      items: {
        query: () => ({ fetchAll: async () => ({ resources: [] }) }),
      },
      item: () => ({ read: async () => ({ resource: {} }) }),
    }),
  })),
}));

jest.mock('@shared/clients/postgres', () => ({
  withClient: (fn: any) =>
    fn({
      query: async (sql: string) => ({
        rows: sql.includes('FROM users') ? [{ user_uuid: 'user-1' }] : [],
      }),
    }),
}));

jest.mock('../../src/privacy/service/dsrStore', () => ({
  createDsrRequest: jest.fn(async request => DSR_REQUESTS.set(request.id, request)),
  getDsrRequest: jest.fn(async id => DSR_REQUESTS.get(id) ?? null),
  patchDsrRequest: jest.fn(async (id, updates, audit) => {
    const existing = DSR_REQUESTS.get(id);
    if (!existing) {
      throw new Error('missing request');
    }
    const next = {
      ...existing,
      ...updates,
      review: { ...existing.review, ...updates.review },
      audit: audit ? [...(existing.audit ?? []), audit] : existing.audit ?? [],
    };
    DSR_REQUESTS.set(id, next);
    return next;
  }),
  hasLegalHold: jest.fn().mockResolvedValue(false),
  _requests: DSR_REQUESTS,
}));

const { handleDsrQueue } = require('../../src/privacy/worker/queueProcessor');
const dsrStore = require('../../src/privacy/service/dsrStore');

describe('Export pipeline integration', () => {
  const context = { invocationId: 'queue-test', log: jest.fn() } as any;
  const requestId = 'integration-export-1';

  beforeEach(() => {
    jest.clearAllMocks();
    DSR_REQUESTS.clear();
  });

  it('runs the export job through the queue and marks awaiting_review', async () => {
    const now = new Date().toISOString();
    DSR_REQUESTS.set(requestId, {
      id: requestId,
      type: 'export',
      userId: 'user-1',
      requestedBy: 'admin-1',
      requestedAt: now,
      status: 'queued',
      attempt: 0,
      review: {},
      audit: [],
    });

    const message = JSON.stringify({ id: requestId, type: 'export', submittedAt: now });
    await handleDsrQueue(message, context);

    const updated = dsrStore._requests.get(requestId);
    expect(updated).toBeDefined();
    expect(updated.status).toBe('awaiting_review');
    expect(updated.exportBlobPath).toBe('dsr-exports/dev/test-export.zip');
    expect(updated.attempt).toBe(1);
  });
});
