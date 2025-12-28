/**
 * Tests for admin/config PUT endpoint
 */

// Mock accessAuth
jest.mock('../../../src/admin/accessAuth', () => ({
  requireCloudflareAccess: jest.fn(),
}));

// Mock adminService
jest.mock('../../../src/admin/adminService', () => ({
  updateAdminConfig: jest.fn(),
}));

// Mock validation
jest.mock('../../../src/admin/validation', () => ({
  validateAdminConfigRequest: jest.fn(),
  validatePayloadSize: jest.fn(() => true),
}));

// Mock cors
jest.mock('../../../src/admin/cors', () => ({
  createCorsPreflightResponse: jest.fn(() => ({
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*' },
  })),
  withCorsHeaders: jest.fn((response, _origin) => response),
}));

import { adminConfigPutHandler } from '../../../src/admin/routes/config_put.function';
import { requireCloudflareAccess } from '../../../src/admin/accessAuth';
import { updateAdminConfig } from '../../../src/admin/adminService';
import { validateAdminConfigRequest, validatePayloadSize } from '../../../src/admin/validation';
import { createCorsPreflightResponse } from '../../../src/admin/cors';
import { HttpRequest, InvocationContext } from '@azure/functions';

const mockRequireCloudflareAccess = requireCloudflareAccess as jest.MockedFunction<typeof requireCloudflareAccess>;
const mockUpdateAdminConfig = updateAdminConfig as jest.MockedFunction<typeof updateAdminConfig>;
const mockValidateAdminConfigRequest = validateAdminConfigRequest as jest.MockedFunction<typeof validateAdminConfigRequest>;
const mockValidatePayloadSize = validatePayloadSize as jest.MockedFunction<typeof validatePayloadSize>;
const mockCreateCorsPreflightResponse = createCorsPreflightResponse as jest.MockedFunction<typeof createCorsPreflightResponse>;

describe('admin/config PUT handler', () => {
  let mockContext: InvocationContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as InvocationContext;

    // Default: validation passes
    mockValidatePayloadSize.mockReturnValue(true);
  });

  function createMockRequest(body: unknown, overrides: Partial<HttpRequest> = {}): HttpRequest {
    return {
      method: 'PUT',
      url: 'http://localhost/api/admin/config',
      headers: new Map([
        ['Origin', 'https://control.asora.co.za'],
        ['X-Correlation-ID', 'test-correlation-id'],
        ['Content-Type', 'application/json'],
      ]) as unknown as Headers,
      query: new Map() as unknown as URLSearchParams,
      params: {},
      json: jest.fn().mockResolvedValue(body),
      ...overrides,
    } as unknown as HttpRequest;
  }

  const validPayload = {
    schemaVersion: 1,
    expectedVersion: 5,
    payload: {
      moderation: {
        temperature: 0.2,
        toxicityThreshold: 0.85,
        autoRejectThreshold: 0.95,
        enableHiveAi: true,
        enableAzureContentSafety: true,
      },
      featureFlags: {
        appealsEnabled: true,
        communityVotingEnabled: true,
        pushNotificationsEnabled: true,
        maintenanceMode: false,
      },
    },
  };

  it('handles OPTIONS preflight requests', async () => {
    const request = createMockRequest({}, { method: 'OPTIONS' });

    const response = await adminConfigPutHandler(request, mockContext);

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

    const request = createMockRequest(validPayload);
    const response = await adminConfigPutHandler(request, mockContext);

    expect(response.status).toBe(401);
    expect(response.jsonBody).toMatchObject({
      error: {
        code: 'MISSING_TOKEN',
      },
    });
  });

  it('returns 400 on invalid JSON body', async () => {
    mockRequireCloudflareAccess.mockResolvedValue({
      authenticated: true,
      actor: 'admin@example.com',
    });

    const request = createMockRequest(null);
    (request.json as jest.Mock).mockRejectedValue(new SyntaxError('Unexpected token'));

    const response = await adminConfigPutHandler(request, mockContext);

    expect(response.status).toBe(400);
    expect(response.jsonBody).toMatchObject({
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid JSON in request body',
      },
    });
  });

  it('returns 400 on validation failure', async () => {
    mockRequireCloudflareAccess.mockResolvedValue({
      authenticated: true,
      actor: 'admin@example.com',
    });
    mockValidateAdminConfigRequest.mockReturnValue({
      success: false,
      error: 'Invalid schema version',
      details: [{ path: 'schemaVersion', message: 'must be number' }],
    });

    const request = createMockRequest({ invalid: 'data' });
    const response = await adminConfigPutHandler(request, mockContext);

    expect(response.status).toBe(400);
    expect(response.jsonBody).toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid schema version',
      },
    });
  });

  it('returns 413 when payload too large', async () => {
    mockRequireCloudflareAccess.mockResolvedValue({
      authenticated: true,
      actor: 'admin@example.com',
    });
    mockValidateAdminConfigRequest.mockReturnValue({
      success: true,
      data: validPayload,
    });
    mockValidatePayloadSize.mockReturnValue(false);

    const request = createMockRequest(validPayload);
    const response = await adminConfigPutHandler(request, mockContext);

    expect(response.status).toBe(413);
    expect(response.jsonBody).toMatchObject({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
      },
    });
  });

  it('returns 409 on version conflict', async () => {
    mockRequireCloudflareAccess.mockResolvedValue({
      authenticated: true,
      actor: 'admin@example.com',
    });
    mockValidateAdminConfigRequest.mockReturnValue({
      success: true,
      data: validPayload,
    });
    mockUpdateAdminConfig.mockResolvedValue({
      success: false,
      error: 'Version conflict: expected 5, server has 6',
      code: 'VERSION_CONFLICT',
    });

    const request = createMockRequest(validPayload);
    const response = await adminConfigPutHandler(request, mockContext);

    expect(response.status).toBe(409);
    expect(response.jsonBody).toMatchObject({
      error: {
        code: 'VERSION_CONFLICT',
      },
    });
  });

  it('returns 500 on update failure', async () => {
    mockRequireCloudflareAccess.mockResolvedValue({
      authenticated: true,
      actor: 'admin@example.com',
    });
    mockValidateAdminConfigRequest.mockReturnValue({
      success: true,
      data: validPayload,
    });
    mockUpdateAdminConfig.mockResolvedValue({
      success: false,
      error: 'Database error',
    });

    const request = createMockRequest(validPayload);
    const response = await adminConfigPutHandler(request, mockContext);

    expect(response.status).toBe(500);
    expect(response.jsonBody).toMatchObject({
      error: {
        code: 'UPDATE_FAILED',
      },
    });
  });

  it('returns 200 on successful update', async () => {
    mockRequireCloudflareAccess.mockResolvedValue({
      authenticated: true,
      actor: 'admin@example.com',
    });
    mockValidateAdminConfigRequest.mockReturnValue({
      success: true,
      data: validPayload,
    });
    mockUpdateAdminConfig.mockResolvedValue({
      success: true,
      version: 6,
      updatedAt: '2025-12-28T10:00:00.000Z',
    });

    const request = createMockRequest(validPayload);
    const response = await adminConfigPutHandler(request, mockContext);

    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual({
      ok: true,
      version: 6,
      updatedAt: '2025-12-28T10:00:00.000Z',
    });
    expect(mockContext.log).toHaveBeenCalledWith(
      expect.stringContaining('Updated to v6 by admin@example.com')
    );
  });

  it('passes expectedVersion to updateAdminConfig', async () => {
    mockRequireCloudflareAccess.mockResolvedValue({
      authenticated: true,
      actor: 'admin@example.com',
    });
    mockValidateAdminConfigRequest.mockReturnValue({
      success: true,
      data: { ...validPayload, expectedVersion: 10 },
    });
    mockUpdateAdminConfig.mockResolvedValue({
      success: true,
      version: 11,
      updatedAt: '2025-12-28T10:00:00.000Z',
    });

    const request = createMockRequest({ ...validPayload, expectedVersion: 10 });
    await adminConfigPutHandler(request, mockContext);

    expect(mockUpdateAdminConfig).toHaveBeenCalledWith(
      'admin@example.com',
      expect.any(Object),
      10
    );
  });

  it('returns 500 on exception during update', async () => {
    mockRequireCloudflareAccess.mockResolvedValue({
      authenticated: true,
      actor: 'admin@example.com',
    });
    mockValidateAdminConfigRequest.mockReturnValue({
      success: true,
      data: validPayload,
    });
    mockUpdateAdminConfig.mockRejectedValue(new Error('Connection lost'));

    const request = createMockRequest(validPayload);
    const response = await adminConfigPutHandler(request, mockContext);

    expect(response.status).toBe(500);
    expect(response.jsonBody).toMatchObject({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update configuration',
      },
    });
  });
});
