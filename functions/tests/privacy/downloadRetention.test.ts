import { httpReqMock } from '../helpers/http';

jest.mock('../../src/privacy/service/dsrStore', () => ({
  getDsrRequest: jest.fn(),
}));
jest.mock('../../src/privacy/common/storage', () => ({
  createUserDelegationUrl: jest.fn(async () => ({
    url: 'https://storage.example.com/export.zip',
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
  })),
}));

describe('download handler retention guard', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.DSR_EXPORT_STORAGE_ACCOUNT = 'mock-storage';
  });

  function getMocks() {
    const dsrStore = require('../../src/privacy/service/dsrStore');
    const storage = require('../../src/privacy/common/storage');
    return {
      getDsrRequest: dsrStore.getDsrRequest as jest.Mock,
      createUserDelegationUrl: storage.createUserDelegationUrl as jest.Mock,
    };
  }

  function buildRequest() {
    const req = httpReqMock({ method: 'GET', params: { id: 'req-download' } }) as any;
    req.principal = { sub: 'admin', roles: ['privacy_admin'] };
    return req;
  }

  it('returns SAS metadata when export still in retention window', async () => {
    const { downloadHandler } = require('../../src/privacy/admin/download');
    const { getDsrRequest, createUserDelegationUrl } = getMocks();
    getDsrRequest.mockResolvedValue({
      id: 'req-download',
      type: 'export',
      status: 'released',
      exportBlobPath: 'dsr-exports/dev/download.zip',
      requestedBy: 'admin',
      userId: 'user-d',
      requestedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });

    const response = await downloadHandler(buildRequest());
    expect(response.status).toBe(200);
    expect(createUserDelegationUrl).toHaveBeenCalledWith('dsr-exports/dev/download.zip', 12);
    const payload = JSON.parse(response.body);
    expect(payload.data.downloadUrl).toBe('https://storage.example.com/export.zip');
    expect(payload.data.status).toBe('released');
  });

  it('blocks downloads when export has aged past retention', async () => {
    process.env.DSR_EXPORT_RETENTION_DAYS = '1';
    const { downloadHandler } = require('../../src/privacy/admin/download');
    const { getDsrRequest, createUserDelegationUrl } = getMocks();
    getDsrRequest.mockResolvedValue({
      id: 'req-download-old',
      type: 'export',
      status: 'released',
      exportBlobPath: 'dsr-exports/dev/download-old.zip',
      requestedBy: 'admin',
      userId: 'user-d',
      requestedAt: new Date().toISOString(),
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const response = await downloadHandler(buildRequest());
    expect(response.status).toBe(409);
    expect(createUserDelegationUrl).not.toHaveBeenCalled();
    const payload = JSON.parse(response.body);
    expect(payload.message).toBe('retention_expired');
  });
});
