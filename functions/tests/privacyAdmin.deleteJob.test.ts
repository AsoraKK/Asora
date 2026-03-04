import { runDeleteJob } from '../src/privacy/worker/deleteJob';

jest.mock('../src/privacy/service/dsrStore', () => ({
  hasLegalHold: jest.fn(),
  patchDsrRequest: jest.fn(async (_id: string, _u: any) => ({})),
}));

jest.mock('@shared/clients/cosmos', () => ({
  getCosmosDatabase: jest.fn(() => ({
    container: () => ({
      items: {
        query: () => ({ fetchAll: async () => ({ resources: [] }) }),
      },
      item: () => ({ replace: async () => ({}) }),
    }),
  })),
}));

const { hasLegalHold, patchDsrRequest } = require('../src/privacy/service/dsrStore');

function makeContext() {
  return {
    log: jest.fn(),
  } as any;
}

describe('runDeleteJob - respects legal hold', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('fails early when user legal hold active', async () => {
    (hasLegalHold as jest.Mock).mockResolvedValueOnce(true);
    const request = {
      id: 'dsr_1',
      type: 'delete',
      userId: 'user_123',
      requestedBy: 'admin',
      requestedAt: new Date().toISOString(),
      status: 'queued',
      attempt: 0,
      review: {},
      audit: [],
    } as any;

    await runDeleteJob(request, makeContext());

    expect(hasLegalHold).toHaveBeenCalledWith('user', 'user_123');
    // Ensure we set failed status
    const calls = (patchDsrRequest as jest.Mock).mock.calls.map((c: any[]) => c[1]);
    expect(calls.some(u => u?.status === 'failed' && /hold/i.test(u?.failureReason ?? ''))).toBe(true);
  });
});
