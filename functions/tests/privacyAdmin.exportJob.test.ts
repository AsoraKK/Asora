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

  it('tolerates missing optional Postgres tables', async () => {
    jest.resetModules();
    jest.doMock('../src/privacy/service/dsrStore', () => ({
      patchDsrRequest: jest.fn(async (_id: string, updates: any) => updates),
      getDsrRequest: jest.fn(async () => null),
    }));
    jest.doMock('../src/privacy/common/storage', () => ({
      createUserDelegationUrl: jest.fn(async () => ({
        url: 'https://example/blob',
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      })),
    }));
    jest.doMock('../src/privacy/common/zip', () => ({
      packageExportZip: jest.fn(async () => ({ blobPath: 'exports/blob.zip', exportBytes: 1024 })),
    }));
    jest.doMock('@shared/clients/cosmos', () => ({
      getCosmosDatabase: jest.fn(() => ({
        container: () => ({
          items: { query: () => ({ fetchAll: async () => ({ resources: [] }) }) },
          item: () => ({ read: async () => ({ resource: { id: 'x' } }) }),
        }),
      })),
    }));
    jest.doMock('@shared/clients/postgres', () => ({
      withClient: (fn: any) =>
        fn({
          query: async (sql: string) => {
            if (sql.includes('FROM users')) {
              return { rows: [{ user_uuid: 'user_1' }] };
            }
            const error = new Error('relation does not exist') as Error & { code: string };
            error.code = '42P01';
            throw error;
          },
        }),
    }));

    const { runExportJob: runExportJobWithMissingTables } = require('../src/privacy/worker/exportJob');
    const { patchDsrRequest: patchAfterMissing } = require('../src/privacy/service/dsrStore');

    const request = {
      id: 'dsr_exp_missing_tables',
      type: 'export',
      userId: 'user_1',
      requestedBy: 'admin',
      requestedAt: new Date().toISOString(),
      status: 'queued',
      attempt: 0,
      review: {},
      audit: [],
    } as any;

    await runExportJobWithMissingTables(request, makeContext());

    const calls = (patchAfterMissing as jest.Mock).mock.calls.map((c: any[]) => c[1]);
    expect(calls.some((u: any) => u.status === 'awaiting_review')).toBe(true);
  });

  it('falls back to users.id when users.user_uuid is absent', async () => {
    jest.resetModules();
    jest.doMock('../src/privacy/service/dsrStore', () => ({
      patchDsrRequest: jest.fn(async (_id: string, updates: any) => updates),
      getDsrRequest: jest.fn(async () => null),
    }));
    jest.doMock('../src/privacy/common/storage', () => ({
      createUserDelegationUrl: jest.fn(async () => ({
        url: 'https://example/blob',
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      })),
    }));
    jest.doMock('../src/privacy/common/zip', () => ({
      packageExportZip: jest.fn(async () => ({ blobPath: 'exports/blob.zip', exportBytes: 1024 })),
    }));
    jest.doMock('@shared/clients/cosmos', () => ({
      getCosmosDatabase: jest.fn(() => ({
        container: () => ({
          items: { query: () => ({ fetchAll: async () => ({ resources: [] }) }) },
          item: () => ({ read: async () => ({ resource: { id: 'x' } }) }),
        }),
      })),
    }));
    jest.doMock('@shared/clients/postgres', () => ({
      withClient: (fn: any) =>
        fn({
          query: async (sql: string) => {
            if (sql.includes('WHERE u.user_uuid')) {
              const error = new Error('column does not exist') as Error & { code: string };
              error.code = '42703';
              throw error;
            }
            if (sql.includes('WHERE u.id = $1')) {
              return { rows: [{ id: 'user_1' }] };
            }
            return { rows: [] };
          },
        }),
    }));

    const { runExportJob: runExportJobWithIdFallback } = require('../src/privacy/worker/exportJob');
    const { patchDsrRequest: patchAfterFallback } = require('../src/privacy/service/dsrStore');

    const request = {
      id: 'dsr_exp_id_fallback',
      type: 'export',
      userId: 'user_1',
      requestedBy: 'admin',
      requestedAt: new Date().toISOString(),
      status: 'queued',
      attempt: 0,
      review: {},
      audit: [],
    } as any;

    await runExportJobWithIdFallback(request, makeContext());

    const calls = (patchAfterFallback as jest.Mock).mock.calls.map((c: any[]) => c[1]);
    expect(calls.some((u: any) => u.status === 'awaiting_review')).toBe(true);
  });
});
