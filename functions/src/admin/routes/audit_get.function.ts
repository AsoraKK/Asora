/**
 * Admin Audit Log GET Endpoint
 * 
 * GET /api/admin/audit
 * 
 * Returns audit log entries for admin configuration changes.
 * Protected by Cloudflare Access JWT validation.
 * 
 * Query parameters:
 * - limit: Number of entries to return (default: 50, max: 200)
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { v4 as uuidv4 } from 'uuid';
import { requireCloudflareAccess } from '../accessAuth';
import { getAuditLog } from '../adminService';
import { parseAuditLimit } from '../validation';
import { createCorsPreflightResponse, withCorsHeaders } from '../cors';

async function adminAuditGetHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId = request.headers.get('X-Correlation-ID') || uuidv4();
  const origin = request.headers.get('Origin');

  context.log(`[admin/audit GET] Request received [${correlationId}]`);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return createCorsPreflightResponse(origin);
  }

  // Verify Cloudflare Access
  const authResult = await requireCloudflareAccess(request.headers);

  if ('error' in authResult) {
    context.warn(`[admin/audit GET] Auth failed: ${authResult.error} [${correlationId}]`);
    return withCorsHeaders(
      {
        status: authResult.status,
        jsonBody: {
          error: {
            code: 'UNAUTHORIZED',
            message: authResult.error,
            correlationId,
          },
        },
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId,
        },
      },
      origin
    );
  }

  try {
    // Parse and validate limit parameter
    const limitStr = request.query.get('limit');
    const limit = parseAuditLimit(limitStr);

    const entries = await getAuditLog(limit);

    context.log(`[admin/audit GET] Returning ${entries.length} entries [${correlationId}]`);

    return withCorsHeaders(
      {
        status: 200,
        jsonBody: {
          entries,
          limit,
        },
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'X-Correlation-ID': correlationId,
        },
      },
      origin
    );
  } catch (err) {
    context.error(`[admin/audit GET] Error: ${err instanceof Error ? err.message : err} [${correlationId}]`);

    return withCorsHeaders(
      {
        status: 500,
        jsonBody: {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve audit log',
            correlationId,
          },
        },
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId,
        },
      },
      origin
    );
  }
}

// Register HTTP trigger
app.http('admin_audit_get', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'admin/audit',
  handler: adminAuditGetHandler,
});

export { adminAuditGetHandler };
