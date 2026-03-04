/**
 * Rate-limited route decorator helpers.
 *
 * Provides a simple, minimal-code way to apply rate limiting to Azure Functions handlers.
 *
 * @example
 * // Simple usage with predefined policy
 * const handler = rateLimited('createPost', async (req, context) => {
 *   // Your handler logic
 *   return { status: 200, body: 'ok' };
 * });
 *
 * @example
 * // Using route-based policy detection
 * const handler = rateLimitedByRoute(async (req, context) => {
 *   return { status: 200, body: 'ok' };
 * });
 */

import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { withRateLimit, type RateLimitPolicy } from './withRateLimit';
import { getPolicyForFunction, getPolicyForRoute } from '@rate-limit/policies';

type HttpHandler = (req: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>;

/**
 * Decorate a handler with rate limiting using a function ID to select the policy.
 *
 * @param functionId - The function identifier (e.g., 'createPost', 'auth-token')
 * @param handler - The HTTP handler function
 * @returns A rate-limited version of the handler
 *
 * @example
 * export const createPostHandler = rateLimited('createPost', async (req, ctx) => {
 *   const post = await createPost(req);
 *   return { status: 201, body: JSON.stringify(post) };
 * });
 */
export function rateLimited(functionId: string, handler: HttpHandler): HttpHandler {
  const policy = getPolicyForFunction(functionId);
  return withRateLimit(handler, policy);
}

/**
 * Decorate a handler with rate limiting using automatic route detection.
 *
 * The policy is determined at runtime based on the request path.
 *
 * @param handler - The HTTP handler function
 * @returns A rate-limited version of the handler
 *
 * @example
 * export const handler = rateLimitedByRoute(async (req, ctx) => {
 *   return { status: 200, body: 'ok' };
 * });
 */
export function rateLimitedByRoute(handler: HttpHandler): HttpHandler {
  return withRateLimit(handler, (req) => getPolicyForRoute(req));
}

/**
 * Decorate a handler with a custom rate limit policy.
 *
 * @param policy - The rate limit policy configuration
 * @param handler - The HTTP handler function
 * @returns A rate-limited version of the handler
 *
 * @example
 * const customPolicy: RateLimitPolicy = {
 *   name: 'custom-api',
 *   routeId: 'custom/endpoint',
 *   limits: [{
 *     id: 'custom-limit',
 *     scope: 'user',
 *     keyResolver: (ctx) => ctx.userId ? `user:${ctx.userId}` : null,
 *     slidingWindow: { limit: 50, windowSeconds: 60 }
 *   }],
 *   deriveUserId: async (ctx) => extractUserFromToken(ctx.req)
 * };
 *
 * export const handler = rateLimitedWith(customPolicy, async (req, ctx) => {
 *   return { status: 200, body: 'ok' };
 * });
 */
export function rateLimitedWith(policy: RateLimitPolicy, handler: HttpHandler): HttpHandler {
  return withRateLimit(handler, policy);
}

/**
 * Pre-configured rate limit decorators for common route types.
 */
export const RateLimitDecorators = {
  /**
   * Apply anonymous (IP-based) rate limiting.
   * Good for public endpoints like health checks or public feeds.
   */
  anonymous: (routeId: string, handler: HttpHandler): HttpHandler => {
    return rateLimited(routeId, handler);
  },

  /**
   * Apply write-operation rate limiting with burst control.
   * Good for POST/PUT/DELETE operations that modify data.
   */
  write: (routeId: string, handler: HttpHandler): HttpHandler => {
    return rateLimited(routeId, handler);
  },

  /**
   * Apply auth-endpoint rate limiting with backoff on failures.
   * Good for login, token refresh, and other auth endpoints.
   */
  auth: (routeId: string, handler: HttpHandler): HttpHandler => {
    return rateLimited(routeId, handler);
  },

  /**
   * Apply authenticated-user rate limiting.
   * Good for API endpoints that require authentication.
   */
  authenticated: (routeId: string, handler: HttpHandler): HttpHandler => {
    return rateLimited(routeId, handler);
  },
};
