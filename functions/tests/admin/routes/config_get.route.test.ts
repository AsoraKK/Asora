/**
 * Tests for admin/config GET endpoint
 */

// Mock accessAuth
jest.mock('../../../src/admin/accessAuth', () => ({
  requireCloudflareAccess: jest.fn(),
}));

// Mock adminService
jest.mock('../../../src/admin/adminService', () => ({
  getAdminConfig: jest.fn(),
}));

// Mock cors
jest.mock('../../../src/admin/cors', () => ({
  createCorsPreflightResponse: jest.fn(() => ({
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*' },
  })),
  withCorsHeaders: jest.fn((response, _origin) => response),
}));

import { adminConfigGetHandler } from '../../../src/admin/routes/config_get.function';
import { requireCloudflareAccess } from '../../../src/admin/accessAuth';
import { getAdminConfig } from '../../../src/admin/adminService';
import { createCorsPreflightResponse } from '../../../src/admin/cors';
import { HttpRequest, InvocationContext } from '@azure/functions';

const mockRequireCloudflareAccess = requireCloudflareAccess as jest.MockedFunction<typeof requireCloudflareAccess>;
const mockGetAdminConfig = getAdminConfig as jest.MockedFunction<typeof getAdminConfig>;
const mockCreateCorsPreflightResponse = createCorsPreflightResponse as jest.MockedFunction<typeof createCorsPreflightResponse>;

describe('admin/config GET handler', () => {
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
    return {
      method: 'GET',
      url: 'http://localhost/api/admin/config',
      headers: new Map([
        ['Origin', 'https://control.asora.co.za'],
        ['X-Correlation-ID', 'test-correlation-id'],
      ]) as unknown as Headers,
      query: new Map() as unknown as URLSearchParams,
      params: {},
      ...overrides,
    } as unknown as HttpRequest;
  }

  it('handles OPTIONS preflight requests', async () => {
    const request = createMockRequest({ method: 'OPTIONS' });

    const response = await adminConfigGetHandler(request, mockContext);

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
    const response = await adminConfigGetHandler(request, mockContext);

    expect(response.status).toBe(401);
    expect(response.jsonBody).toMatchObject({
      error: {
        code: 'MISSING_TOKEN',
        message: 'Missing token',
      },
    });
  });

  it('returns 403 when access denied', async () => {
    mockRequireCloudflareAccess.mockResolvedValue({
      authenticated: false,
      status: 403,
      code: 'FORBIDDEN',
      error: 'Access denied',
    });

    const request = createMockRequest();
    const response = await adminConfigGetHandler(request, mockContext);

    expect(response.status).toBe(403);
    expect(response.jsonBody).toMatchObject({
      error: {
        code: 'FORBIDDEN',
      },
    });
  });

  it('returns 404 when config not found', async () => {
    mockRequireCloudflareAccess.mockResolvedValue({
      authenticated: true,
      actor: 'test@example.com',
    });
    mockGetAdminConfig.mockResolvedValue(null);

    const request = createMockRequest();
    const response = await adminConfigGetHandler(request, mockContext);

    expect(response.status).toBe(404);
    expect(response.jsonBody).toMatchObject({
      error: {
        code: 'NOT_FOUND',
        message: 'Admin configuration not initialized',
      },
    });
  });

  it('returns config on success', async () => {
    const mockConfig = {
      version: 5,
      updatedAt: '2025-12-28T10:00:00.000Z',
      updatedBy: 'admin@example.com',
      payload: {
        schemaVersion: 1,
        moderation: { temperature: 0.2 },
        featureFlags: { appealsEnabled: true },
      },
    };

    mockRequireCloudflareAccess.mockResolvedValue({
      authenticated: true,
      actor: 'test@example.com',
    });
    mockGetAdminConfig.mockResolvedValue(mockConfig);

    const request = createMockRequest();
    const response = await adminConfigGetHandler(request, mockContext);

    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual(mockConfig);
    expect(response.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    });
  });

  it('returns 500 on database error', async () => {
    mockRequireCloudflareAccess.mockResolvedValue({
      authenticated: true,
      actor: 'test@example.com',
    });
    mockGetAdminConfig.mockRejectedValue(new Error('Database connection failed'));

    const request = createMockRequest();
    const response = await adminConfigGetHandler(request, mockContext);

    expect(response.status).toBe(500);
    expect(response.jsonBody).toMatchObject({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve configuration',
      },
    });
    expect(mockContext.error).toHaveBeenCalled();
  });

  it('generates correlation ID when not provided', async () => {
    mockRequireCloudflareAccess.mockResolvedValue({
      authenticated: true,
      actor: 'test@example.com',
    });
    mockGetAdminConfig.mockResolvedValue({
      version: 1,
      updatedAt: '2025-12-28T10:00:00.000Z',
      updatedBy: 'admin@example.com',
      payload: {},
    });

    const request = createMockRequest();
    // Override headers without correlation ID
    (request.headers as unknown as Map<string, string>).delete('X-Correlation-ID');

    const response = await adminConfigGetHandler(request, mockContext);

    expect(response.status).toBe(200);
    expect(response.headers?.['X-Correlation-ID']).toBeDefined();
  });
});
