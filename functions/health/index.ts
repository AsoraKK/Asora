import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

/**
 * Health check endpoint for Azure Functions
 * Returns 200 OK with basic status information
 */
export default async function healthCheck(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Health check endpoint called');

  // Basic health response
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
}
