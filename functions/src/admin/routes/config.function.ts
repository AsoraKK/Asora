/**
 * Admin Config Endpoints (Combined Handler)
 * 
 * GET /api/admin/config - Returns current admin configuration
 * PUT /api/admin/config - Updates configuration with validation and audit
 * OPTIONS /api/admin/config - CORS preflight
 * 
 * Protected by Cloudflare Access JWT validation.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { v4 as uuidv4 } from 'uuid';
import { requireCloudflareAccess } from '../accessAuth';
import { getAdminConfig, updateAdminConfig } from '../adminService';
import { validateAdminConfigRequest, validatePayloadSize } from '../validation';
import { createCorsPreflightResponse, withCorsHeaders } from '../cors';
import type { AdminConfigPayload } from '../types';

async function adminConfigHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId = request.headers.get('X-Correlation-ID') || uuidv4();
  const origin = request.headers.get('Origin');
  const method = request.method.toUpperCase();

  context.log(`[admin/config ${method}] Request received [${correlationId}]`);

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return createCorsPreflightResponse(origin);
  }

  // Verify Cloudflare Access for all methods
  const authResult = await requireCloudflareAccess(request.headers);

  if ('error' in authResult) {
    context.warn(`[admin/config ${method}] Auth failed: ${authResult.error} [${correlationId}]`);
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

  // Route to appropriate handler
  if (method === 'GET') {
    return handleGet(context, correlationId, origin);
  } else if (method === 'PUT') {
    return handlePut(request, context, correlationId, origin, authResult.actor);
  } else {
    return withCorsHeaders(
      {
        status: 405,
        jsonBody: {
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: `Method ${method} not allowed`,
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

async function handleGet(
  context: InvocationContext,
  correlationId: string,
  origin: string | null
): Promise<HttpResponseInit> {
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

async function handlePut(
  request: HttpRequest,
  context: InvocationContext,
  correlationId: string,
  origin: string | null,
  actor: string
): Promise<HttpResponseInit> {
  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch (err) {
    context.warn(`[admin/config PUT] Invalid JSON body [${correlationId}]`);
    return withCorsHeaders(
      {
        status: 400,
        jsonBody: {
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid JSON in request body',
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

  // Validate request schema
  const validation = validateAdminConfigRequest(body);

  if (!validation.success) {
    context.warn(`[admin/config PUT] Validation failed: ${validation.error} [${correlationId}]`);
    return withCorsHeaders(
      {
        status: 400,
        jsonBody: {
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error,
            correlationId,
            details: validation.details,
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

  // Validate payload size
  if (!validatePayloadSize(validation.data)) {
    context.warn(`[admin/config PUT] Payload too large [${correlationId}]`);
    return withCorsHeaders(
      {
        status: 413,
        jsonBody: {
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: 'Configuration payload exceeds maximum size (64KB)',
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

  // Build payload to store
  const newPayload: AdminConfigPayload = {
    schemaVersion: validation.data.schemaVersion,
    ...validation.data.payload,
  };

  try {
    // Update config (transactional with audit logging)
    const result = await updateAdminConfig(actor, newPayload);

    if (!result.success) {
      context.error(`[admin/config PUT] Update failed: ${result.error} [${correlationId}]`);
      return withCorsHeaders(
        {
          status: 500,
          jsonBody: {
            error: {
              code: 'UPDATE_FAILED',
              message: result.error,
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

    // Log success without exposing payload content
    context.log(`[admin/config PUT] Updated to v${result.version} by ${actor} [${correlationId}]`);

    return withCorsHeaders(
      {
        status: 200,
        jsonBody: {
          ok: true,
          version: result.version,
          updatedAt: result.updatedAt,
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
    context.error(`[admin/config PUT] Error: ${err instanceof Error ? err.message : err} [${correlationId}]`);

    return withCorsHeaders(
      {
        status: 500,
        jsonBody: {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update configuration',
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

// Register single HTTP trigger for all methods
app.http('admin_config', {
  methods: ['GET', 'PUT', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'admin/config',
  handler: adminConfigHandler,
});

export { adminConfigHandler };
