import { httpReqMock } from '../helpers/http';

jest.mock('../../src/privacy/service/dsrStore', () => ({
  getDsrRequest: jest.fn(),
  patchDsrRequest: jest.fn(),
}));
jest.mock('../../src/privacy/common/storage', () => ({
  createUserDelegationUrl: jest.fn(),
}));

describe('releaseHandler SAS TTL', () => {
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
      patchDsrRequest: dsrStore.patchDsrRequest as jest.Mock,
      createUserDelegationUrl: storage.createUserDelegationUrl as jest.Mock,
    };
  }

  function buildRequest() {
    const req = httpReqMock({ method: 'POST', params: { id: 'req-1' } }) as any;
    req.principal = { sub: 'admin', roles: ['privacy_admin'] };
    return req;
  }

  it('passes the configured TTL to storage when set', async () => {
    process.env.DSR_EXPORT_SIGNED_URL_TTL_HOURS = '16';
    const { releaseHandler } = require('../../src/privacy/admin/release');
    const { getDsrRequest, patchDsrRequest, createUserDelegationUrl } = getMocks();

    getDsrRequest.mockResolvedValue({
      id: 'req-1',
      type: 'export',
      status: 'ready_to_release',
      exportBlobPath: 'dsr-exports/dev/req-1.zip',
      review: {},
      audit: [],
      requestedBy: 'admin',
      userId: 'user-1',
      requestedAt: new Date().toISOString(),
      attempt: 1,
    });

    patchDsrRequest.mockResolvedValue({ id: 'req-1', status: 'released' });
    createUserDelegationUrl.mockResolvedValue({ url: 'https://blob.url', expiresAt: new Date().toISOString() });

    const response = await releaseHandler(buildRequest());
    expect(response.status).toBe(200);
    expect(createUserDelegationUrl).toHaveBeenCalledWith('dsr-exports/dev/req-1.zip', 16);
  });

  it('defaults to 12 hours when env var is missing', async () => {
    delete process.env.DSR_EXPORT_SIGNED_URL_TTL_HOURS;
    const { releaseHandler } = require('../../src/privacy/admin/release');
    const { getDsrRequest, patchDsrRequest, createUserDelegationUrl } = getMocks();

    getDsrRequest.mockResolvedValue({
      id: 'req-2',
      type: 'export',
      status: 'ready_to_release',
      exportBlobPath: 'dsr-exports/dev/req-2.zip',
      review: {},
      audit: [],
      requestedBy: 'admin',
      userId: 'user-2',
      requestedAt: new Date().toISOString(),
      attempt: 1,
    });

    patchDsrRequest.mockResolvedValue({ id: 'req-2', status: 'released' });
    createUserDelegationUrl.mockResolvedValue({ url: 'https://blob.url', expiresAt: new Date().toISOString() });

    const response = await releaseHandler(buildRequest());
    expect(response.status).toBe(200);
    expect(createUserDelegationUrl).toHaveBeenCalledWith('dsr-exports/dev/req-2.zip', 12);
  });
});