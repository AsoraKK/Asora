/**
 * Admin Config PUT Endpoint
 * 
 * PUT /api/admin/config
 * 
 * Updates admin configuration with validation, version bumping, and audit logging.
 * Protected by Cloudflare Access JWT validation.
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { v4 as uuidv4 } from 'uuid';
import { requireCloudflareAccess } from '../accessAuth';
import { updateAdminConfig } from '../adminService';
import { validateAdminConfigRequest, validatePayloadSize } from '../validation';
import { createCorsPreflightResponse, withCorsHeaders } from '../cors';
import type { AdminConfigPayload } from '../types';

async function adminConfigPutHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const correlationId = request.headers.get('X-Correlation-ID') || uuidv4();
  const origin = request.headers.get('Origin');

  context.log(`[admin/config PUT] Request received [${correlationId}]`);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return createCorsPreflightResponse(origin);
  }

  // Verify Cloudflare Access
  const authResult = await requireCloudflareAccess(request.headers);

  if ('error' in authResult) {
    context.warn(`[admin/config PUT] Auth failed: ${authResult.error} [${correlationId}]`);
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

  const actor = authResult.actor;

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

// Register HTTP trigger
app.http('admin_config_put', {
  methods: ['PUT', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'admin/config',
  handler: adminConfigPutHandler,
});

export { adminConfigPutHandler };
