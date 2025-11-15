import { httpReqMock } from '../helpers/http';

jest.mock('../../src/privacy/service/dsrStore', () => ({
  getDsrRequest: jest.fn(),
  patchDsrRequest: jest.fn(),
}));
jest.mock('../../src/privacy/common/storage', () => ({
  createUserDelegationUrl: jest.fn(),
}));

describe('export release integration', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.DSR_EXPORT_STORAGE_ACCOUNT = 'mock-assets';
  });

  it('transitions the request and returns SAS metadata', async () => {
    const { releaseHandler } = require('../../src/privacy/admin/release');
    const { getDsrRequest, patchDsrRequest } = require('../../src/privacy/service/dsrStore');
    const { createUserDelegationUrl } = require('../../src/privacy/common/storage');

    getDsrRequest.mockResolvedValue({
      id: 'integration-req',
      type: 'export',
      status: 'ready_to_release',
      exportBlobPath: 'dsr-exports/dev/integration-req.zip',
      review: {},
      audit: [],
      requestedBy: 'admin',
      userId: 'userX',
      requestedAt: new Date().toISOString(),
      attempt: 1,
    });

    patchDsrRequest.mockResolvedValue({ id: 'integration-req', status: 'released' });
    createUserDelegationUrl.mockResolvedValue({ url: 'https://host/req.zip', expiresAt: '2050-01-01T00:00:00Z' });

    const req = httpReqMock({ method: 'POST', params: { id: 'integration-req' } }) as any;
    req.principal = { sub: 'admin', roles: ['privacy_admin'] };

    const response = await releaseHandler(req);

    expect(response.status).toBe(200);
    expect(response.body).toContain('https://host/req.zip');
    expect(patchDsrRequest).toHaveBeenCalledWith(
      'integration-req',
      { status: 'released' },
      expect.objectContaining({
        event: 'export.released',
        by: expect.any(String),
      }),
    );
  });
});