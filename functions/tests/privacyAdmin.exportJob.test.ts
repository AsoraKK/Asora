import { runExportJob } from '../src/privacy/worker/exportJob';

jest.mock('../src/privacy/service/dsrStore', () => ({
  patchDsrRequest: jest.fn(async (_id: string, updates: any) => updates),
  getDsrRequest: jest.fn(async () => null),
}));

jest.mock('../src/privacy/common/storage', () => ({
  createUserDelegationUrl: jest.fn(async () => ({ url: 'https://example/blob', expiresAt: new Date(Date.now()+3600*1000).toISOString() })),
}));

jest.mock('../src/privacy/common/zip', () => ({
  packageExportZip: jest.fn(async () => ({ blobPath: 'exports/blob.zip', exportBytes: 1024 })),
}));

jest.mock('@shared/clients/cosmos', () => ({
  getCosmosDatabase: jest.fn(() => ({
    container: () => ({
      items: { query: () => ({ fetchAll: async () => ({ resources: [] }) }) },
      item: () => ({ read: async () => ({ resource: { id: 'x' } }) }),
    }),
  })),
}));

jest.mock('@shared/clients/postgres', () => ({
  withClient: (fn: any) => fn({
    query: async (sql: string) => ({ rows: sql.includes('FROM users') ? [{ user_uuid: 'user_1' }] : [] }),
  }),
}));

function makeContext() { return { log: jest.fn() } as any; }

describe('runExportJob basic flow', () => {
  it('transitions to awaiting_review on success', async () => {
    const request = {
      id: 'dsr_exp_1',
      type: 'export',
      userId: 'user_1',
      requestedBy: 'admin',
      requestedAt: new Date().toISOString(),
      status: 'queued',
      attempt: 0,
      review: {},
      audit: [],
    } as any;

    await runExportJob(request, makeContext());
    const { patchDsrRequest } = require('../src/privacy/service/dsrStore');
    const calls = (patchDsrRequest as jest.Mock).mock.calls.map((c: any[]) => c[1]);
    expect(calls.some(u => u.status === 'awaiting_review')).toBe(true);
  });
});
