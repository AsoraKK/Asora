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
  })),
}));

jest.mock('@azure/storage-queue', () => ({
  QueueServiceClient: queueServiceClientMock,
}));

describe('DSR queue storage diagnostics', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    queueServiceClientMock.mockClear();
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
});
