import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

/**
 * Feed Get Handler - Returns feed data
 * 
 * This endpoint provides the main feed data for the Asora platform.
 * It's designed to be cached at the edge via Cloudflare Workers.
 * 
 * @param request - The HTTP request object
 * @param context - The Azure Functions invocation context
 * @returns HTTP response with feed data
 */
export async function getFeed(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        context.log('Feed GET endpoint called');

        // For now, return a simple response
        // TODO: Implement actual feed data retrieval from Cosmos DB
        const feedResponse = {
            ok: true,                  // <-- add this line
            status: "ok",
            service: "asora-function-dev",
            ts: new Date().toISOString(),
            data: {
                posts: [],
                pagination: {
                    page: 1,
                    limit: 20,
                    total: 0,
                    hasMore: false
                }
            }
        };

        // Cache behavior: unauthenticated requests cache for 60s at the edge,
        // authenticated requests must not be cached.
        const hasAuth = request.headers?.has('authorization') || false;
        const cacheControl = hasAuth ? 'private, no-store' : 'public, max-age=60';

        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': cacheControl,
                'Vary': 'Authorization'
            },
            jsonBody: feedResponse
        };
    } catch (error) {
        context.error('Error in feed GET handler:', error);
        
        return {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            },
            jsonBody: {
                status: "error",
                message: "Internal server error",
                ts: new Date().toISOString()
            }
        };
    }
}
