import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

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
            version: '1.0.0'
        };

        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            jsonBody: healthResponse
        };
    }
});

// =============================================================================
// FEED ENDPOINT
// =============================================================================

app.http('feed', {
    methods: ['GET'], 
    authLevel: 'anonymous',
    route: 'feed',
    handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        context.log('Feed endpoint called');

        const feedResponse = {
            ok: true,
            timestamp: new Date().toISOString(),
            service: 'feed',
            version: '1.0.0',
            data: {
                posts: [],
                pagination: {
                    limit: 20,
                    offset: 0,
                    total: 0
                }
            }
        };

        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=60'
            },
            jsonBody: feedResponse
        };
    }
});
