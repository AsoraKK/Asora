/**
 * Admin Audit Routes Tests
 * Covers audit log retrieval and auth/CORS branches.
 */

import { InvocationContext } from '@azure/functions';
import { adminAuditGetHandler } from '../../src/admin/routes/audit_get.function';
import { requireCloudflareAccess } from '../../src/admin/accessAuth';
import { getAuditLog } from '../../src/admin/adminService';
import { httpReqMock } from '../helpers/http';

jest.mock('../../src/admin/accessAuth', () => ({
  requireCloudflareAccess: jest.fn(),
}));
jest.mock('../../src/admin/adminService', () => ({
  getAuditLog: jest.fn(),
}));

const contextStub = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as InvocationContext;

const requireCloudflareAccessMock = requireCloudflareAccess as jest.Mock;
const getAuditLogMock = getAuditLog as jest.Mock;

describe('Admin Audit Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns CORS preflight response', async () => {
    const req = httpReqMock({
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:3000' },
    });

    const response = await adminAuditGetHandler(req as any, contextStub);
    expect(response.status).toBe(204);
  });

  it('returns auth error when access is denied', async () => {
    requireCloudflareAccessMock.mockResolvedValue({
      error: 'unauthorized',
      status: 401,
      code: 'UNAUTHORIZED',
    });

    const req = httpReqMock({
      method: 'GET',
      headers: { Origin: 'http://localhost:3000' },
    });

    const response = await adminAuditGetHandler(req as any, contextStub);
    expect(response.status).toBe(401);
  });

  it('returns audit entries with clamped limit', async () => {
    requireCloudflareAccessMock.mockResolvedValue({ actor: 'admin-123' });
    getAuditLogMock.mockResolvedValue([{ id: 'entry-1' }]);

    const req = httpReqMock({
      method: 'GET',
      query: { limit: '999' },
      headers: { Origin: 'http://localhost:3000' },
    });

    const response = await adminAuditGetHandler(req as any, contextStub);
    expect(response.status).toBe(200);
    expect((response as any).jsonBody?.limit).toBe(200);
  });

  it('returns 500 when audit lookup fails', async () => {
    requireCloudflareAccessMock.mockResolvedValue({ actor: 'admin-123' });
    getAuditLogMock.mockRejectedValue(new Error('boom'));

    const req = httpReqMock({
      method: 'GET',
      headers: { Origin: 'http://localhost:3000' },
    });

    const response = await adminAuditGetHandler(req as any, contextStub);
    expect(response.status).toBe(500);
  });
});
