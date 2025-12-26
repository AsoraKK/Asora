/**
 * Admin Config GET Endpoint
 * 
 * GET /api/admin/config
 * 
 * Returns current admin configuration with version and metadata.
 * Protected by Cloudflare Access JWT validation.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { v4 as uuidv4 } from 'uuid';
import { requireCloudflareAccess } from '../accessAuth';
import { getAdminConfig } from '../adminService';
import { createCorsPreflightResponse, withCorsHeaders } from '../cors';

async function adminConfigGetHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId = request.headers.get('X-Correlation-ID') || uuidv4();
  const origin = request.headers.get('Origin');

  context.log(`[admin/config GET] Request received [${correlationId}]`);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return createCorsPreflightResponse(origin);
  }

  // Verify Cloudflare Access
  const authResult = await requireCloudflareAccess(request.headers);

  if ('error' in authResult) {
    context.warn(`[admin/config GET] Auth failed: ${authResult.error} [${correlationId}]`);
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
    const config = await getAdminConfig();

    if (!config) {
      context.warn(`[admin/config GET] Config not found [${correlationId}]`);
      return withCorsHeaders(
        {
          status: 404,
          jsonBody: {
            error: {
              code: 'NOT_FOUND',
              message: 'Admin configuration not initialized',
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

    context.log(`[admin/config GET] Returning config v${config.version} [${correlationId}]`);

    return withCorsHeaders(
      {
        status: 200,
        jsonBody: config,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'X-Correlation-ID': correlationId,
        },
      },
      origin
    );
  } catch (err) {
    context.error(`[admin/config GET] Error: ${err instanceof Error ? err.message : err} [${correlationId}]`);

    return withCorsHeaders(
      {
        status: 500,
        jsonBody: {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve configuration',
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
app.http('admin_config_get', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'admin/config',
  handler: adminConfigGetHandler,
});

export { adminConfigGetHandler };
