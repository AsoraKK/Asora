import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

interface EdgeTelemetryEvent {
  event: string;
  status: string;
  path: string;
  timestamp: number;
  userAgent?: string;
  country?: string;
  colo?: string;
}

export async function logEdgeTelemetry(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // Only accept POST requests
  if (request.method !== 'POST') {
    return {
      status: 405,
      jsonBody: { error: 'Method not allowed' },
    };
  }

  // Verify shared secret
  const sharedSecret = request.headers.get('x-shared-secret');
  const expectedSecret = process.env.EDGE_TELEMETRY_SECRET;

  if (!expectedSecret || sharedSecret !== expectedSecret) {
    context.log('Edge telemetry: Invalid or missing shared secret');
    return {
      status: 401,
      jsonBody: { error: 'Unauthorized' },
    };
  }

  try {
    // Parse telemetry data
    const body = await request.text();
    const telemetryEvent: EdgeTelemetryEvent = JSON.parse(body);

    // Validate required fields
    if (!telemetryEvent.event || !telemetryEvent.status || !telemetryEvent.path) {
      return {
        status: 400,
        jsonBody: { error: 'Missing required fields: event, status, path' },
      };
    }

    // Log to Application Insights via context.log
    context.log('Edge Cache Telemetry:', {
      event: telemetryEvent.event,
      status: telemetryEvent.status,
      path: telemetryEvent.path,
      timestamp: telemetryEvent.timestamp,
      userAgent: telemetryEvent.userAgent,
      country: telemetryEvent.country,
      colo: telemetryEvent.colo,
      customDimensions: {
        eventType: 'EdgeCacheTelemetry',
        cacheStatus: telemetryEvent.status,
        endpoint: telemetryEvent.path,
      },
    });

    // Track custom event for Application Insights
    // Note: In a real implementation, you'd use the Application Insights SDK
    // For now, we'll use structured logging that App Insights can pick up
    context.log(
      `TELEMETRY_EVENT: ${JSON.stringify({
        name: telemetryEvent.event,
        properties: {
          cacheStatus: telemetryEvent.status,
          path: telemetryEvent.path,
          timestamp: new Date(telemetryEvent.timestamp).toISOString(),
          userAgent: telemetryEvent.userAgent,
          country: telemetryEvent.country,
          datacenter: telemetryEvent.colo,
        },
      })}`
    );

    return {
      status: 204, // No content - success
    };
  } catch (error) {
    context.log('Edge telemetry parsing error:', error);
    return {
      status: 400,
      jsonBody: { error: 'Invalid JSON payload' },
    };
  }
}

app.http('logEdgeTelemetry', {
  methods: ['POST'],
  route: 'edge/log',
  authLevel: 'anonymous',
  handler: logEdgeTelemetry,
});
