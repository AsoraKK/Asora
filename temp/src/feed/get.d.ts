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
export declare function getFeed(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit>;
//# sourceMappingURL=get.d.ts.map