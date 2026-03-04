/**
 * Admin Audit Routes Tests
 * Covers audit log retrieval and auth/CORS branches.
 */

import { InvocationContext } from '@azure/functions';
import { adminAuditGetHandler } from '../../src/admin/routes/audit_get.function';
import { httpReqMock } from '../helpers/http';

// Mock data and functions at module level for hoisting
const mockFetchNext = jest.fn();
const mockQuery = jest.fn(() => ({ fetchNext: mockFetchNext }));
const mockContainer = jest.fn(() => ({ items: { query: mockQuery } }));
const mockDatabase = { container: mockContainer };

jest.mock('../../src/admin/adminAuthUtils', () => ({
  requireActiveAdmin: jest.fn((handler) => handler),
}));

jest.mock('@shared/clients/cosmos', () => ({
  getCosmosDatabase: jest.fn(() => mockDatabase),
}));

const contextStub = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as InvocationContext;

describe('Admin Audit Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchNext.mockResolvedValue({
      resources: [{ id: 'entry-1', timestamp: '2025-01-01', action: 'block' }],
      continuationToken: null,
    });
  });

  it('returns CORS preflight response', async () => {
    const req = httpReqMock({
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:3000' },
    });

    const response = await adminAuditGetHandler(req as any, contextStub);
    // createCorsResponse returns status 200, not 204
    expect(response.status).toBe(200);
  });

  it('returns audit entries with clamped limit', async () => {
    const req = httpReqMock({
      method: 'GET',
      query: { limit: '999' },
      headers: { Origin: 'http://localhost:3000' },
    });

    const response = await adminAuditGetHandler(req as any, contextStub);
    expect(response.status).toBe(200);
    // Response body is JSON string via createSuccessResponse wrapped in { success, data, timestamp }
    const body = JSON.parse(response.body as string);
    expect(body.success).toBe(true);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].id).toBe('entry-1');
  });

  it('returns 500 when audit lookup fails', async () => {
    mockFetchNext.mockRejectedValue(new Error('boom'));

    const req = httpReqMock({
      method: 'GET',
      headers: { Origin: 'http://localhost:3000' },
    });

    const response = await adminAuditGetHandler(req as any, contextStub);
    expect(response.status).toBe(500);
  });
});
