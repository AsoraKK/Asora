import { removeExpiredRecords } from '../../src/privacy/worker/purgeJob';
import { hasLegalHold } from '../../src/privacy/service/dsrStore';

jest.mock('../../src/privacy/service/dsrStore', () => ({
  hasLegalHold: jest.fn(),
}));

describe('removeExpiredRecords', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips deletion for records with an active legal hold', async () => {
    const records = [
      { id: 'hold-user', deleted: true, deletedAt: '2025-01-01T00:00:00Z' },
      { id: 'free-user', deleted: true, deletedAt: '2025-01-01T00:00:00Z' },
    ];

    const deleteMock = jest.fn().mockResolvedValue({});
    const queryMock = jest.fn().mockReturnValue({
      fetchAll: jest.fn().mockResolvedValue({ resources: records }),
    });
    const container = {
      items: {
        query: queryMock,
      },
      item: jest.fn().mockReturnValue({
        delete: deleteMock,
      }),
    };
    const database = {
      container: jest.fn().mockReturnValue(container),
    };

    (hasLegalHold as jest.Mock).mockImplementation((scope, scopeId) => scopeId === 'hold-user');

    const cutoff = new Date().toISOString();
    await removeExpiredRecords(cutoff, {
      containers: [{ name: 'users', scope: 'user' }],
      database: database as any,
    });

    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledWith();
    expect(hasLegalHold).toHaveBeenCalledWith('user', 'hold-user');
  });
});