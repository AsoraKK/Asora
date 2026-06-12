import {
  CONTAINERS_TO_PURGE,
  removeExpiredRecords,
} from '../../src/privacy/worker/purgeJob';
import { hasLegalHold } from '../../src/privacy/service/dsrStore';

jest.mock('../../src/privacy/service/dsrStore', () => ({
  hasLegalHold: jest.fn(),
}));

describe('removeExpiredRecords', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (hasLegalHold as jest.Mock).mockResolvedValue(false);
  });

  it('skips deletion for records with an active legal hold', async () => {
    const records = [
      {
        id: 'hold-post',
        authorId: '[deleted]',
        anonymized: true,
        anonymizedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 'free-post',
        authorId: '[deleted]',
        anonymized: true,
        anonymizedAt: '2025-01-01T00:00:00Z',
      },
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

    (hasLegalHold as jest.Mock).mockImplementation(
      (scope, scopeId) => scope === 'post' && scopeId === 'hold-post',
    );

    const cutoff = new Date().toISOString();
    await removeExpiredRecords(cutoff, {
      containers: [{
        name: 'posts',
        partitionKeyFields: ['authorId', 'id'],
        holdReferences: [{ scope: 'post', idFields: ['id'] }],
      }],
      database: database as any,
    });

    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledWith();
    expect(container.item).toHaveBeenCalledWith('free-post', '[deleted]');
    expect(hasLegalHold).toHaveBeenCalledWith('post', 'hold-post');
  });

  it('purges soft-deleted and anonymized records older than the retention cutoff', async () => {
    const records = [
      {
        id: 'comment-1',
        postId: 'post-1',
        anonymized: true,
        anonymizedAt: '2025-01-01T00:00:00Z',
      },
      {
        id: 'comment-2',
        postId: 'post-1',
        deleted: true,
        deletedAt: '2025-01-01T00:00:00Z',
      },
    ];

    const deleteMock = jest.fn().mockResolvedValue({});
    const queryMock = jest.fn().mockReturnValue({
      fetchAll: jest.fn().mockResolvedValue({ resources: records }),
    });
    const container = {
      items: { query: queryMock },
      item: jest.fn().mockReturnValue({ delete: deleteMock }),
    };
    const database = {
      container: jest.fn().mockReturnValue(container),
    };

    await removeExpiredRecords('2025-02-01T00:00:00Z', {
      containers: [{
        name: 'comments',
        partitionKeyFields: ['postId', '_partitionKey', 'id'],
        holdReferences: [{ scope: 'post', idFields: ['postId'] }],
      }],
      database: database as any,
    });

    expect(queryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.stringContaining('c.anonymizedAt <= @cutoff'),
        parameters: [{ name: '@cutoff', value: '2025-02-01T00:00:00Z' }],
      }),
    );
    expect(queryMock.mock.calls[0][0].query).toContain('c.deletedAt <= @cutoff');
    expect(container.item).toHaveBeenCalledWith('comment-1', 'post-1');
    expect(container.item).toHaveBeenCalledWith('comment-2', 'post-1');
    expect(deleteMock).toHaveBeenCalledTimes(2);
  });

  it('keeps audit stores outside the DSR content purge set', () => {
    const containerNames = CONTAINERS_TO_PURGE.map(container => container.name);

    expect(containerNames).toContain('moderation_decisions');
    expect(containerNames).not.toContain('audit_logs');
    expect(containerNames).not.toContain('privacy_audit');
  });
});
