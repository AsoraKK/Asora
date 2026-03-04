import type { DsrRequest, DsrStatus, DsrType } from '../../src/privacy/common/models';
import { listRequestsHandler } from '../../src/privacy/admin/listRequests';
import { httpReqMock } from '../helpers/http';

// Mock dsrStore functions
const mockListDsrRequests = jest.fn();
jest.mock('../../src/privacy/service/dsrStore', () => ({
  listDsrRequests: (...args: unknown[]) => mockListDsrRequests(...args),
}));

// Helper to create a mock DSR request
function createMockDsrRequest(overrides: Partial<DsrRequest> = {}): DsrRequest {
  return {
    id: 'dsr-001',
    type: 'export',
    userId: 'user-123',
    requestedBy: 'admin-001',
    requestedAt: '2024-01-15T10:00:00.000Z',
    status: 'queued',
    attempt: 0,
    review: {},
    audit: [],
    ...overrides,
  };
}

// Helper to create authenticated request
function createAuthedRequest(queryParams: Record<string, string> = {}) {
  const req = httpReqMock({
    method: 'GET',
    query: queryParams,
  });
  (req as any).principal = {
    sub: 'admin-user',
    roles: ['privacy_admin'],
  };
  return req;
}

describe('listRequests admin endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('successful queries', () => {
    it('lists all DSR requests without filters', async () => {
      const mockRequests = [
        createMockDsrRequest({ id: 'dsr-001' }),
        createMockDsrRequest({ id: 'dsr-002', type: 'delete' }),
      ];
      mockListDsrRequests.mockResolvedValue({
        items: mockRequests,
        continuationToken: undefined,
      });

      const req = createAuthedRequest();
      const res = await listRequestsHandler(req as any);

      expect(res.status).toBe(200);
      const body = JSON.parse(res.body as string);
      expect(body.data.items).toHaveLength(2);
      expect(body.data.hasMore).toBe(false);
      // Verify listDsrRequests was called with expected defaults
      expect(mockListDsrRequests).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          statuses: undefined,
        })
      );
    });

    it('filters by type=export', async () => {
      mockListDsrRequests.mockResolvedValue({
        items: [createMockDsrRequest({ type: 'export' })],
        continuationToken: undefined,
      });

      const req = createAuthedRequest({ type: 'export' });
      const res = await listRequestsHandler(req as any);

      expect(res.status).toBe(200);
      expect(mockListDsrRequests).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'export' })
      );
    });

    it('filters by type=delete', async () => {
      mockListDsrRequests.mockResolvedValue({
        items: [createMockDsrRequest({ type: 'delete' })],
        continuationToken: undefined,
      });

      const req = createAuthedRequest({ type: 'delete' });
      const res = await listRequestsHandler(req as any);

      expect(res.status).toBe(200);
      expect(mockListDsrRequests).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'delete' })
      );
    });

    it('filters by single status', async () => {
      mockListDsrRequests.mockResolvedValue({
        items: [createMockDsrRequest({ status: 'queued' })],
        continuationToken: undefined,
      });

      const req = createAuthedRequest({ status: 'queued' });
      const res = await listRequestsHandler(req as any);

      expect(res.status).toBe(200);
      expect(mockListDsrRequests).toHaveBeenCalledWith(
        expect.objectContaining({ statuses: ['queued'] })
      );
    });

    it('filters by multiple comma-separated statuses', async () => {
      mockListDsrRequests.mockResolvedValue({
        items: [],
        continuationToken: undefined,
      });

      const req = createAuthedRequest({ status: 'queued,running,failed' });
      const res = await listRequestsHandler(req as any);

      expect(res.status).toBe(200);
      expect(mockListDsrRequests).toHaveBeenCalledWith(
        expect.objectContaining({ statuses: ['queued', 'running', 'failed'] })
      );
    });

    it('filters by date range', async () => {
      mockListDsrRequests.mockResolvedValue({
        items: [],
        continuationToken: undefined,
      });

      const req = createAuthedRequest({
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-31T23:59:59Z',
      });
      const res = await listRequestsHandler(req as any);

      expect(res.status).toBe(200);
      expect(mockListDsrRequests).toHaveBeenCalledWith(
        expect.objectContaining({
          fromDate: '2024-01-01T00:00:00Z',
          toDate: '2024-01-31T23:59:59Z',
        })
      );
    });

    it('filters by userId', async () => {
      mockListDsrRequests.mockResolvedValue({
        items: [createMockDsrRequest({ userId: 'target-user' })],
        continuationToken: undefined,
      });

      const req = createAuthedRequest({ userId: 'target-user' });
      const res = await listRequestsHandler(req as any);

      expect(res.status).toBe(200);
      expect(mockListDsrRequests).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'target-user' })
      );
    });

    it('respects custom limit', async () => {
      mockListDsrRequests.mockResolvedValue({
        items: [],
        continuationToken: undefined,
      });

      const req = createAuthedRequest({ limit: '10' });
      const res = await listRequestsHandler(req as any);

      expect(res.status).toBe(200);
      expect(mockListDsrRequests).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10 })
      );
    });

    it('caps limit at MAX_LIMIT (200)', async () => {
      mockListDsrRequests.mockResolvedValue({
        items: [],
        continuationToken: undefined,
      });

      const req = createAuthedRequest({ limit: '999' });
      const res = await listRequestsHandler(req as any);

      expect(res.status).toBe(200);
      expect(mockListDsrRequests).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 200 })
      );
    });

    it('passes continuation token for pagination', async () => {
      mockListDsrRequests.mockResolvedValue({
        items: [createMockDsrRequest()],
        continuationToken: 'next-page-token',
      });

      const req = createAuthedRequest({ continuationToken: 'prev-page-token' });
      const res = await listRequestsHandler(req as any);

      expect(res.status).toBe(200);
      const body = JSON.parse(res.body as string);
      expect(body.data.hasMore).toBe(true);
      expect(body.data.continuationToken).toBe('next-page-token');
      expect(mockListDsrRequests).toHaveBeenCalledWith(
        expect.objectContaining({ continuationToken: 'prev-page-token' })
      );
    });

    it('combines multiple filters', async () => {
      mockListDsrRequests.mockResolvedValue({
        items: [],
        continuationToken: undefined,
      });

      const req = createAuthedRequest({
        type: 'export',
        status: 'awaiting_review,ready_to_release',
        from: '2024-01-01T00:00:00Z',
        userId: 'user-123',
        limit: '25',
      });
      const res = await listRequestsHandler(req as any);

      expect(res.status).toBe(200);
      expect(mockListDsrRequests).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'export',
          statuses: ['awaiting_review', 'ready_to_release'],
          fromDate: '2024-01-01T00:00:00Z',
          userId: 'user-123',
          limit: 25,
        })
      );
    });
  });

  describe('validation errors', () => {
    it('rejects invalid type filter', async () => {
      const req = createAuthedRequest({ type: 'invalid' });
      const res = await listRequestsHandler(req as any);

      expect(res.status).toBe(400);
      const body = JSON.parse(res.body as string);
      expect(body.message).toBe('invalid_type');
    });

    it('rejects invalid status filter', async () => {
      const req = createAuthedRequest({ status: 'invalid_status' });
      const res = await listRequestsHandler(req as any);

      expect(res.status).toBe(400);
      const body = JSON.parse(res.body as string);
      expect(body.message).toBe('invalid_status');
    });

    it('rejects invalid from date', async () => {
      const req = createAuthedRequest({ from: 'not-a-date' });
      const res = await listRequestsHandler(req as any);

      expect(res.status).toBe(400);
      const body = JSON.parse(res.body as string);
      expect(body.message).toBe('invalid_from_date');
    });

    it('rejects invalid to date', async () => {
      const req = createAuthedRequest({ to: 'not-a-date' });
      const res = await listRequestsHandler(req as any);

      expect(res.status).toBe(400);
      const body = JSON.parse(res.body as string);
      expect(body.message).toBe('invalid_to_date');
    });

    it('rejects invalid limit (non-numeric)', async () => {
      const req = createAuthedRequest({ limit: 'abc' });
      const res = await listRequestsHandler(req as any);

      expect(res.status).toBe(400);
      const body = JSON.parse(res.body as string);
      expect(body.message).toBe('invalid_limit');
    });

    it('rejects invalid limit (zero)', async () => {
      const req = createAuthedRequest({ limit: '0' });
      const res = await listRequestsHandler(req as any);

      expect(res.status).toBe(400);
      const body = JSON.parse(res.body as string);
      expect(body.message).toBe('invalid_limit');
    });

    it('rejects invalid limit (negative)', async () => {
      const req = createAuthedRequest({ limit: '-5' });
      const res = await listRequestsHandler(req as any);

      expect(res.status).toBe(400);
      const body = JSON.parse(res.body as string);
      expect(body.message).toBe('invalid_limit');
    });
  });

  describe('error handling', () => {
    it('returns 500 on database error', async () => {
      mockListDsrRequests.mockRejectedValue(new Error('Cosmos connection failed'));

      const req = createAuthedRequest();
      const res = await listRequestsHandler(req as any);

      expect(res.status).toBe(500);
      const body = JSON.parse(res.body as string);
      expect(body.message).toBe('internal_error');
    });
  });

  describe('CORS handling', () => {
    it('returns CORS headers for OPTIONS request', async () => {
      const req = httpReqMock({ method: 'OPTIONS' });
      (req as any).principal = { sub: 'admin', roles: ['privacy_admin'] };

      const res = await listRequestsHandler(req as any);

      // handleCorsAndMethod returns 200 for OPTIONS preflight
      expect(res.status).toBe(200);
    });

    it('rejects non-GET methods', async () => {
      const req = httpReqMock({ method: 'POST' });
      (req as any).principal = { sub: 'admin', roles: ['privacy_admin'] };

      const res = await listRequestsHandler(req as any);

      expect(res.status).toBe(405);
    });
  });
});

describe('listDsrRequests store function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles all valid status values', async () => {
    const allStatuses: DsrStatus[] = [
      'queued',
      'running',
      'awaiting_review',
      'ready_to_release',
      'released',
      'succeeded',
      'failed',
      'canceled',
    ];

    mockListDsrRequests.mockResolvedValue({ items: [], continuationToken: undefined });

    const req = createAuthedRequest({ status: allStatuses.join(',') });
    const res = await listRequestsHandler(req as any);

    expect(res.status).toBe(200);
    expect(mockListDsrRequests).toHaveBeenCalledWith(
      expect.objectContaining({ statuses: allStatuses })
    );
  });

  it('handles all valid type values', async () => {
    const allTypes: DsrType[] = ['export', 'delete'];

    for (const type of allTypes) {
      mockListDsrRequests.mockResolvedValue({ items: [], continuationToken: undefined });

      const req = createAuthedRequest({ type });
      const res = await listRequestsHandler(req as any);

      expect(res.status).toBe(200);
      expect(mockListDsrRequests).toHaveBeenCalledWith(
        expect.objectContaining({ type })
      );
    }
  });
});
