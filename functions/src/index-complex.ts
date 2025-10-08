import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import './feed';

/**
 * ASORA AZURE FUNCTIONS v4 ENTRY POINT
 *
 * This file registers all HTTP-triggered functions using the Azure Functions v4 programming model.
 * Each function is registered with app.http() and includes proper typing and error handling.
 */

// =============================================================================
// HEALTH CHECK ENDPOINT
// =============================================================================

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    context.log('Health check endpoint called');

    const healthResponse = {
      ok: true,
      timestamp: new Date().toISOString(),
      status: 'healthy',
      service: 'asora-functions',
      version: '1.0.0',
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      jsonBody: healthResponse,
    };
  },
});

// =============================================================================
// PRIVACY FUNCTIONS (GDPR/POPIA Compliance)
// =============================================================================

app.http('exportUser', {
  methods: ['GET'],
  authLevel: 'function',
  route: 'privacy/exportUser',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    // Import the actual implementation
    const { exportUser } = await import('../privacy/exportUser.js');
    return exportUser(request, context);
  },
});

app.http('deleteUser', {
  methods: ['POST'],
  authLevel: 'function',
  route: 'privacy/deleteUser',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    // Import the actual implementation
    const { deleteUser } = await import('../privacy/deleteUser.js');
    return deleteUser(request, context);
  },
});

// =============================================================================
// FEED FUNCTIONS are registered in src/feed/index.ts (v4 style)
// =============================================================================

// =============================================================================
// FUTURE FUNCTIONS
// =============================================================================

/*
TODO: Register additional functions here as they are migrated to v4:

app.http('userAuth', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'auth',
    handler: userAuthHandler
});
*/

// =============================================================================
// EXPORT FOR AZURE FUNCTIONS RUNTIME
// =============================================================================

// The app object is automatically exported by @azure/functions v4
// No explicit export needed - the runtime discovers registered functions
