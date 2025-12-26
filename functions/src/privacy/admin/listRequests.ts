import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { requirePrivacyAdmin } from '@shared/middleware/auth';
import type { Principal } from '@shared/middleware/auth';
import { handleCorsAndMethod, createErrorResponse, createSuccessResponse } from '@shared/utils/http';
import { getErrorMessage } from '@shared/errorUtils';
import { listDsrRequests } from '../service/dsrStore';
import type { DsrType, DsrStatus } from '../common/models';

type Authed = HttpRequest & { principal: Principal };

const VALID_TYPES: DsrType[] = ['export', 'delete'];
const VALID_STATUSES: DsrStatus[] = [
  'queued',
  'running',
  'awaiting_review',
  'ready_to_release',
  'released',
  'succeeded',
  'failed',
  'canceled',
];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function listRequestsHandler(req: Authed): Promise<HttpResponseInit> {
  const cors = handleCorsAndMethod(req.method ?? 'GET', ['GET']);
  if (cors.shouldReturn && cors.response) return cors.response;

  try {
    // Parse query parameters
    const type = req.query.get('type') as DsrType | null;
    const statusParam = req.query.get('status');
    const fromDate = req.query.get('from');
    const toDate = req.query.get('to');
    const userId = req.query.get('userId');
    const limitParam = req.query.get('limit');
    const continuationToken = req.query.get('continuationToken') ?? undefined;

    // Validate type filter
    if (type && !VALID_TYPES.includes(type)) {
      return createErrorResponse(400, 'invalid_type', `type must be one of: ${VALID_TYPES.join(', ')}`);
    }

    // Parse and validate status filter (can be comma-separated)
    let statuses: DsrStatus[] | undefined;
    if (statusParam) {
      statuses = statusParam.split(',').map(s => s.trim()) as DsrStatus[];
      for (const s of statuses) {
        if (!VALID_STATUSES.includes(s)) {
          return createErrorResponse(400, 'invalid_status', `status must be one of: ${VALID_STATUSES.join(', ')}`);
        }
      }
    }

    // Validate date filters
    if (fromDate && isNaN(Date.parse(fromDate))) {
      return createErrorResponse(400, 'invalid_from_date', 'from must be a valid ISO date');
    }
    if (toDate && isNaN(Date.parse(toDate))) {
      return createErrorResponse(400, 'invalid_to_date', 'to must be a valid ISO date');
    }

    // Parse limit
    let limit = DEFAULT_LIMIT;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (isNaN(parsed) || parsed < 1) {
        return createErrorResponse(400, 'invalid_limit', 'limit must be a positive integer');
      }
      limit = Math.min(parsed, MAX_LIMIT);
    }

    const result = await listDsrRequests({
      type,
      statuses,
      fromDate,
      toDate,
      userId,
      limit,
      continuationToken,
    });

    return createSuccessResponse({
      items: result.items,
      continuationToken: result.continuationToken,
      hasMore: !!result.continuationToken,
    });
  } catch (error: unknown) {
    return createErrorResponse(500, 'internal_error', getErrorMessage(error));
  }
}

const protectedHandler = requirePrivacyAdmin(listRequestsHandler);

app.http('privacy-admin-dsr-list', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: '_admin/dsr',
  handler: protectedHandler,
});
