/**
 * Tests for admin/audit_get endpoint
 */

// Mock accessAuth
jest.mock('../../../src/admin/accessAuth', () => ({
  requireCloudflareAccess: jest.fn(),
}));

// Mock adminService
jest.mock('../../../src/admin/adminService', () => ({
  getAuditLog: jest.fn(),
}));

// Mock cors
jest.mock('../../../src/admin/cors', () => ({
  createCorsPreflightResponse: jest.fn(() => ({
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*' },
  })),
  withCorsHeaders: jest.fn((response, _origin) => response),
}));

import { adminAuditGetHandler } from '../../../src/admin/routes/audit_get.function';
import { requireCloudflareAccess } from '../../../src/admin/accessAuth';
import { getAuditLog } from '../../../src/admin/adminService';
import { createCorsPreflightResponse } from '../../../src/admin/cors';
import { HttpRequest, InvocationContext } from '@azure/functions';

const mockRequireCloudflareAccess = requireCloudflareAccess as jest.MockedFunction<typeof requireCloudflareAccess>;
const mockGetAuditLog = getAuditLog as jest.MockedFunction<typeof getAuditLog>;
const mockCreateCorsPreflightResponse = createCorsPreflightResponse as jest.MockedFunction<typeof createCorsPreflightResponse>;

describe('admin/audit_get handler', () => {
  let mockContext: InvocationContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as InvocationContext;
  });

  function createMockRequest(overrides: Partial<HttpRequest> = {}): HttpRequest {
    const query = new Map<string, string>();
    return {
      method: 'GET',
      url: 'http://localhost/_admin/audit',
      headers: new Map([
        ['Origin', 'https://control.asora.co.za'],
        ['X-Correlation-ID', 'test-correlation-id'],
      ]) as unknown as Headers,
      query: {
        get: (key: string) => query.get(key),
        has: (key: string) => query.has(key),
      } as unknown as URLSearchParams,
      params: {},
      ...overrides,
    } as unknown as HttpRequest;
  }

  const sampleAuditLog = [
    {
      id: 'audit-1',
      action: 'CONFIG_UPDATE',
      actor: 'admin@example.com',
      timestamp: '2025-12-28T10:00:00.000Z',
      details: { field: 'temperature', oldValue: 0.1, newValue: 0.2 },
    },
    {
      id: 'audit-2',
      action: 'CONFIG_UPDATE',
      actor: 'admin@example.com',
      timestamp: '2025-12-27T09:00:00.000Z',
      details: { field: 'toxicityThreshold', oldValue: 0.8, newValue: 0.85 },
    },
  ];

  it('handles OPTIONS preflight requests', async () => {
    const request = createMockRequest({ method: 'OPTIONS' });

    const response = await adminAuditGetHandler(request, mockContext);

    expect(mockCreateCorsPreflightResponse).toHaveBeenCalled();
    expect(response.status).toBe(204);
  });

  it('returns 401 when auth fails', async () => {
    mockRequireCloudflareAccess.mockResolvedValue({
      authenticated: false,
      status: 401,
      code: 'MISSING_TOKEN',
      error: 'Missing token',
    });

    const request = createMockRequest();
    const response = await adminAuditGetHandler(request, mockContext);

    expect(response.status).toBe(401);
    expect(response.jsonBody).toMatchObject({
      error: {
        code: 'MISSING_TOKEN',
      },
    });
  });

  it('returns 403 when forbidden', async () => {
    mockRequireCloudflareAccess.mockResolvedValue({
      authenticated: false,
      status: 403,
      code: 'FORBIDDEN',
      error: 'Access denied',
    });

    const request = createMockRequest();
    const response = await adminAuditGetHandler(request, mockContext);

    expect(response.status).toBe(403);
    expect(response.jsonBody).toMatchObject({
      error: {
        code: 'FORBIDDEN',
      },
    });
  });

  it('returns 200 with audit log entries', async () => {
    mockRequireCloudflareAccess.mockResolvedValue({
      authenticated: true,
      actor: 'admin@example.com',
    });
    mockGetAuditLog.mockResolvedValue(sampleAuditLog);

    const request = createMockRequest();
    const response = await adminAuditGetHandler(request, mockContext);

    expect(response.status).toBe(200);
    expect(response.jsonBody).toMatchObject({
      entries: sampleAuditLog,
      limit: 50,
    });
  });

  it('parses limit query parameter', async () => {
    mockRequireCloudflareAccess.mockResolvedValue({
      authenticated: true,
      actor: 'admin@example.com',
    });
    mockGetAuditLog.mockResolvedValue(sampleAuditLog);

    const query = new Map([['limit', '25']]);
    const request = createMockRequest({
      query: {
        get: (key: string) => query.get(key),
        has: (key: string) => query.has(key),
      } as unknown as URLSearchParams,
    });

    const response = await adminAuditGetHandler(request, mockContext);

    expect(mockGetAuditLog).toHaveBeenCalledWith(25);
    expect(response.jsonBody).toMatchObject({ limit: 25 });
  });

  it('uses default limit when not specified', async () => {
    mockRequireCloudflareAccess.mockResolvedValue({
      authenticated: true,
      actor: 'admin@example.com',
    });
    mockGetAuditLog.mockResolvedValue([]);

    const request = createMockRequest();
    await adminAuditGetHandler(request, mockContext);

    // Default limit is 50 when not specified
    expect(mockGetAuditLog).toHaveBeenCalledWith(50);
  });

  it('clamps limit to max value', async () => {
    mockRequireCloudflareAccess.mockResolvedValue({
      authenticated: true,
      actor: 'admin@example.com',
    });
    mockGetAuditLog.mockResolvedValue([]);

    const query = new Map([['limit', '500']]);
    const request = createMockRequest({
      query: {
        get: (key: string) => query.get(key),
        has: (key: string) => query.has(key),
      } as unknown as URLSearchParams,
    });

    await adminAuditGetHandler(request, mockContext);

    // Max limit is 200
    expect(mockGetAuditLog).toHaveBeenCalledWith(200);
  });

  it('returns 500 on unexpected exception', async () => {
    mockRequireCloudflareAccess.mockResolvedValue({
      authenticated: true,
      actor: 'admin@example.com',
    });
    mockGetAuditLog.mockRejectedValue(new Error('Unexpected crash'));

    const request = createMockRequest();
    const response = await adminAuditGetHandler(request, mockContext);

    expect(response.status).toBe(500);
    expect(response.jsonBody).toMatchObject({
      error: {
        code: 'INTERNAL_ERROR',
      },
    });
    expect(mockContext.error).toHaveBeenCalled();
  });

  it('includes correlation ID in response headers', async () => {
    mockRequireCloudflareAccess.mockResolvedValue({
      authenticated: true,
      actor: 'admin@example.com',
    });
    mockGetAuditLog.mockResolvedValue({
      success: true,
      entries: sampleAuditLog,
    });

    const request = createMockRequest();
    const response = await adminAuditGetHandler(request, mockContext);

    expect(response.headers?.['X-Correlation-ID']).toBe('test-correlation-id');
  });
});
