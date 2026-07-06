jest.mock('@azure/identity', () => ({
  DefaultAzureCredential: jest.fn(),
}));

jest.mock('@azure/storage-blob', () => ({
  BlobServiceClient: jest.fn().mockImplementation(() => ({
    getContainerClient: jest.fn(),
    getUserDelegationKey: jest.fn(),
  })),
  BlobSASPermissions: { parse: jest.fn() },
  generateBlobSASQueryParameters: jest.fn(),
}));

const queueServiceClientMock = jest.fn().mockImplementation(() => ({
  getQueueClient: jest.fn(() => ({
    sendMessage: jest.fn(),
    getProperties: jest.fn().mockResolvedValue({ approximateMessagesCount: 0 }),
  })),
}));

jest.mock('@azure/storage-queue', () => ({
  QueueServiceClient: queueServiceClientMock,
}));

describe('DSR queue storage diagnostics', () => {
  const originalEnv = process.env;
  let getQueueClientMock: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    queueServiceClientMock.mockClear();
    getQueueClientMock = jest.fn((queueName: string) => ({
      sendMessage: jest.fn(),
      getProperties: jest.fn().mockResolvedValue({
        approximateMessagesCount: queueName.endsWith('-poison') ? 0 : 2,
      }),
    }));
    queueServiceClientMock.mockImplementation(() => ({
      getQueueClient: getQueueClientMock,
    }));
    process.env = {
      ...originalEnv,
      DSR_EXPORT_STORAGE_ACCOUNT: 'exportacct',
      DSR_QUEUE_NAME: 'dsr-requests',
      DSR_QUEUE_CONNECTION: 'DsrQueueStorage',
      DsrQueueStorage__queueServiceUri: 'https://queueacct.queue.core.windows.net',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses the queue connection service URI when present', () => {
    const storage = require('../../src/privacy/common/storage');

    expect(storage.getDsrQueueDiagnostics()).toEqual({
      queueName: 'dsr-requests',
      queueConnectionSetting: 'DsrQueueStorage',
      queueServiceAccount: 'queueacct',
      exportStorageAccount: 'exportacct',
    });
    expect(queueServiceClientMock).toHaveBeenCalledWith(
      'https://queueacct.queue.core.windows.net',
      expect.anything(),
    );
  });

  it('falls back to export storage account when queue service URI is absent', () => {
    delete process.env.DsrQueueStorage__queueServiceUri;

    const storage = require('../../src/privacy/common/storage');

    expect(storage.getDsrQueueDiagnostics()).toEqual({
      queueName: 'dsr-requests',
      queueConnectionSetting: 'DsrQueueStorage',
      queueServiceAccount: 'exportacct',
      exportStorageAccount: 'exportacct',
    });
    expect(queueServiceClientMock).toHaveBeenCalledWith(
      'https://exportacct.queue.core.windows.net',
      expect.anything(),
    );
  });

  it('reports queue and poison queue depth for monitor snapshots', async () => {
    const storage = require('../../src/privacy/common/storage');

    await expect(storage.getDsrQueueMonitorSnapshot()).resolves.toMatchObject({
      queueName: 'dsr-requests',
      approximateMessageCount: 2,
      poisonQueueName: 'dsr-requests-poison',
      poisonApproximateMessageCount: 0,
      poisonQueueExists: true,
    });
    expect(getQueueClientMock).toHaveBeenCalledWith('dsr-requests');
    expect(getQueueClientMock).toHaveBeenCalledWith('dsr-requests-poison');
  });

  it('reports missing poison queue without failing the monitor snapshot', async () => {
    getQueueClientMock.mockImplementation((queueName: string) => ({
      sendMessage: jest.fn(),
      getProperties: jest.fn().mockImplementation(() => {
        if (queueName.endsWith('-poison')) {
          return Promise.reject(new Error('QueueNotFound'));
        }
        return Promise.resolve({ approximateMessagesCount: 0 });
      }),
    }));

    const storage = require('../../src/privacy/common/storage');

    await expect(storage.getDsrQueueMonitorSnapshot()).resolves.toMatchObject({
      approximateMessageCount: 0,
      poisonApproximateMessageCount: null,
      poisonQueueExists: false,
    });
  });
});
