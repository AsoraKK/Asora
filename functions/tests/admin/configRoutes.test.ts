/**
 * Admin Config Routes Tests
 * Covers combined handler plus legacy GET/PUT handlers for coverage gates.
 */

import { InvocationContext } from '@azure/functions';
import { adminConfigHandler } from '../../src/admin/routes/config.function';
import { adminConfigGetHandler } from '../../src/admin/routes/config_get.function';
import { adminConfigPutHandler } from '../../src/admin/routes/config_put.function';
import { requireCloudflareAccess } from '../../src/admin/accessAuth';
import { getAdminConfig, updateAdminConfig } from '../../src/admin/adminService';
import { httpReqMock } from '../helpers/http';

jest.mock('../../src/admin/accessAuth', () => ({
  requireCloudflareAccess: jest.fn(),
}));
jest.mock('../../src/admin/adminService', () => ({
  getAdminConfig: jest.fn(),
  updateAdminConfig: jest.fn(),
}));

const contextStub = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as InvocationContext;

const requireCloudflareAccessMock = requireCloudflareAccess as jest.Mock;
const getAdminConfigMock = getAdminConfig as jest.Mock;
const updateAdminConfigMock = updateAdminConfig as jest.Mock;

describe('Admin Config Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireCloudflareAccessMock.mockResolvedValue({ actor: 'admin-123' });
    getAdminConfigMock.mockResolvedValue(null);
    updateAdminConfigMock.mockResolvedValue({
      success: true,
      version: 2,
      updatedAt: '2024-01-01T00:00:00Z',
    });
  });

  describe('adminConfigHandler', () => {
    it('returns CORS preflight response', async () => {
      const req = httpReqMock({
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:3000' },
      });

      const response = await adminConfigHandler(req as any, contextStub);
      expect(response.status).toBe(204);
    });

    it('returns auth error for unauthorized access', async () => {
      requireCloudflareAccessMock.mockResolvedValue({
        error: 'unauthorized',
        status: 401,
        code: 'UNAUTHORIZED',
      });

      const req = httpReqMock({
        method: 'GET',
        headers: { Origin: 'http://localhost:3000' },
      });

      const response = await adminConfigHandler(req as any, contextStub);
      expect(response.status).toBe(401);
    });

    it('returns 404 when config is missing', async () => {
      requireCloudflareAccessMock.mockResolvedValue({ actor: 'admin-123' });
      getAdminConfigMock.mockResolvedValue(null);

      const req = httpReqMock({
        method: 'GET',
        headers: { Origin: 'http://localhost:3000' },
      });

      const response = await adminConfigHandler(req as any, contextStub);
      expect(response.status).toBe(404);
    });

    it('returns config when it exists', async () => {
      requireCloudflareAccessMock.mockResolvedValue({ actor: 'admin-123' });
      getAdminConfigMock.mockResolvedValue({
        schemaVersion: 1,
        version: 3,
        updatedAt: '2024-01-01T00:00:00Z',
        payload: { feature: 'enabled' },
      });

      const req = httpReqMock({
        method: 'GET',
        headers: { Origin: 'http://localhost:3000' },
      });

      const response = await adminConfigHandler(req as any, contextStub);
      expect(response.status).toBe(200);
    });

    it('returns 405 for unsupported methods', async () => {
      const req = httpReqMock({
        method: 'DELETE',
        headers: { Origin: 'http://localhost:3000' },
      });

      const response = await adminConfigHandler(req as any, contextStub);
      expect(response.status).toBe(405);
    });

    it('returns 500 when GET throws', async () => {
      requireCloudflareAccessMock.mockResolvedValue({ actor: 'admin-123' });
      getAdminConfigMock.mockRejectedValue(new Error('boom'));

      const req = httpReqMock({
        method: 'GET',
        headers: { Origin: 'http://localhost:3000' },
      });

      const response = await adminConfigHandler(req as any, contextStub);
      expect(response.status).toBe(500);
    });

    it('rejects invalid JSON body', async () => {
      requireCloudflareAccessMock.mockResolvedValue({ actor: 'admin-123' });

      const req = httpReqMock({
        method: 'PUT',
        headers: { Origin: 'http://localhost:3000' },
      });
      (req as any).json = async () => {
        throw new Error('bad json');
      };

      const response = await adminConfigHandler(req as any, contextStub);
      expect(response.status).toBe(400);
    });

    it('updates config successfully', async () => {
      requireCloudflareAccessMock.mockResolvedValue({ actor: 'admin-123' });
      updateAdminConfigMock.mockResolvedValue({
        success: true,
        version: 2,
        updatedAt: '2024-01-01T00:00:00Z',
      });

      const req = httpReqMock({
        method: 'PUT',
        headers: { Origin: 'http://localhost:3000' },
        body: { schemaVersion: 1, payload: { feature: 'on' } },
      });

      const response = await adminConfigHandler(req as any, contextStub);
      expect(response.status).toBe(200);
    });

    it('rejects payloads that exceed size limits', async () => {
      requireCloudflareAccessMock.mockResolvedValue({ actor: 'admin-123' });

      const req = httpReqMock({
        method: 'PUT',
        headers: { Origin: 'http://localhost:3000' },
        body: {
          schemaVersion: 1,
          payload: { blob: 'x'.repeat(70 * 1024) },
        },
      });

      const response = await adminConfigHandler(req as any, contextStub);
      expect(response.status).toBe(413);
    });

    it('returns validation errors for invalid payloads', async () => {
      requireCloudflareAccessMock.mockResolvedValue({ actor: 'admin-123' });

      const req = httpReqMock({
        method: 'PUT',
        headers: { Origin: 'http://localhost:3000' },
        body: { schemaVersion: 0 },
      });

      const response = await adminConfigHandler(req as any, contextStub);
      expect(response.status).toBe(400);
    });

    it('returns 500 when update returns failure', async () => {
      requireCloudflareAccessMock.mockResolvedValue({ actor: 'admin-123' });
      updateAdminConfigMock.mockResolvedValue({
        success: false,
        error: 'Version conflict',
      });

      const req = httpReqMock({
        method: 'PUT',
        headers: { Origin: 'http://localhost:3000' },
        body: { schemaVersion: 1, payload: { feature: 'flag' } },
      });

      const response = await adminConfigHandler(req as any, contextStub);
      expect(response.status).toBe(500);
    });

    it('returns 500 when update throws', async () => {
      requireCloudflareAccessMock.mockResolvedValue({ actor: 'admin-123' });
      updateAdminConfigMock.mockRejectedValue(new Error('boom'));

      const req = httpReqMock({
        method: 'PUT',
        headers: { Origin: 'http://localhost:3000' },
        body: { schemaVersion: 1, payload: { feature: 'flag' } },
      });

      const response = await adminConfigHandler(req as any, contextStub);
      expect(response.status).toBe(500);
    });
  });

  describe('adminConfigGetHandler', () => {
    it('returns config when available', async () => {
      requireCloudflareAccessMock.mockResolvedValue({ actor: 'admin-123' });
      getAdminConfigMock.mockResolvedValue({
        schemaVersion: 1,
        version: 1,
        updatedAt: '2024-01-01T00:00:00Z',
      });

      const req = httpReqMock({
        method: 'GET',
        headers: { Origin: 'http://localhost:3000' },
      });

      const response = await adminConfigGetHandler(req as any, contextStub);
      expect(response.status).toBe(200);
    });

    it('returns CORS preflight response', async () => {
      const req = httpReqMock({
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:3000' },
      });

      const response = await adminConfigGetHandler(req as any, contextStub);
      expect(response.status).toBe(204);
    });
  });

  describe('adminConfigPutHandler', () => {
    it('rejects payloads that exceed size limits', async () => {
      requireCloudflareAccessMock.mockResolvedValue({ actor: 'admin-123' });

      const req = httpReqMock({
        method: 'PUT',
        headers: { Origin: 'http://localhost:3000' },
        body: {
          schemaVersion: 1,
          payload: { blob: 'x'.repeat(70 * 1024) },
        },
      });

      const response = await adminConfigPutHandler(req as any, contextStub);
      expect(response.status).toBe(413);
    });

    it('returns version conflict when optimistic lock fails', async () => {
      requireCloudflareAccessMock.mockResolvedValue({ actor: 'admin-123' });
      updateAdminConfigMock.mockResolvedValue({
        success: false,
        error: 'Version conflict',
        code: 'VERSION_CONFLICT',
      });

      const req = httpReqMock({
        method: 'PUT',
        headers: { Origin: 'http://localhost:3000' },
        body: { schemaVersion: 1, payload: { feature: 'on' }, expectedVersion: 2 },
      });

      const response = await adminConfigPutHandler(req as any, contextStub);
      expect(response.status).toBe(409);
    });
  });
});
