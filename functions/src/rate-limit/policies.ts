import type { HttpRequest } from '@azure/functions';

import { parseAuth } from '@shared/middleware/auth';

import {
  buildAuthFailureIpKeyResolver,
  buildAuthFailureUserKeyResolver,
  buildGlobalIpKey,
  buildUserScopeKey,
  type RateLimitPolicy,
  type RateLimitRequestContext,
  type RateLimitRule,
} from '../http/withRateLimit';

const GLOBAL_IP_LIMIT = { limit: 120, windowSeconds: 60 } as const;
const GLOBAL_USER_LIMIT = { limit: 240, windowSeconds: 60 } as const;
const WRITE_USER_LIMIT = { limit: 30, windowSeconds: 60, burst: 10 } as const;
const ANON_IP_LIMIT = { limit: 60, windowSeconds: 60 } as const;
const AUTH_BASE_LIMIT = { limit: 20, windowSeconds: 60 } as const;
const AUTH_FAILURE_WINDOW_SECONDS = 30 * 60;

async function deriveUserIdFromAuth(ctx: RateLimitRequestContext): Promise<string | null> {
  try {
    const principal = await parseAuth(ctx.req);
    return principal?.sub ?? null;
  } catch {
    return null;
  }
}

function createGlobalIpRule(routeId: string, limit = GLOBAL_IP_LIMIT.limit, windowSeconds = GLOBAL_IP_LIMIT.windowSeconds): RateLimitRule {
  return {
    id: `${routeId}-global-ip`,
    scope: 'ip',
    keyResolver: buildGlobalIpKey,
    slidingWindow: {
      limit,
      windowSeconds,
    },
  };
}

function createGlobalUserRule(
  routeId: string,
  limit = GLOBAL_USER_LIMIT.limit,
  windowSeconds = GLOBAL_USER_LIMIT.windowSeconds
): RateLimitRule {
  return {
    id: `${routeId}-global-user`,
    scope: 'user',
    keyResolver: buildUserScopeKey,
    slidingWindow: {
      limit,
      windowSeconds,
    },
  };
}

function createRouteUserRule(routeId: string, limit: number, windowSeconds: number, burst?: number): RateLimitRule {
  return {
    id: `${routeId}-route-user`,
    scope: 'route',
    keyResolver: (ctx) => {
      if (!ctx.userId) {
        return null;
      }
      return `route:${routeId}:user:${ctx.userId}`;
    },
    slidingWindow: {
      limit,
      windowSeconds,
    },
    tokenBucket:
      burst && burst > 0
        ? {
            capacity: burst,
            refillRatePerSecond: limit / windowSeconds,
            limitOverride: limit,
            windowSeconds,
          }
        : undefined,
  };
}

function createRouteIpRule(routeId: string, limit: number, windowSeconds: number): RateLimitRule {
  return {
    id: `${routeId}-route-ip`,
    scope: 'route',
    keyResolver: (ctx) => {
      if (!ctx.hashedIp) {
        return null;
      }
      return `route:${routeId}:ip:${ctx.hashedIp}`;
    },
    slidingWindow: {
      limit,
      windowSeconds,
    },
  };
}

function createGenericPolicy(routeId: string): RateLimitPolicy {
  return {
    name: `${routeId}-generic`,
    routeId,
    limits: [createGlobalUserRule(routeId), createGlobalIpRule(routeId)],
    deriveUserId: deriveUserIdFromAuth,
  };
}

function createAnonymousPolicy(routeId: string, limit = ANON_IP_LIMIT.limit): RateLimitPolicy {
  return {
    name: `${routeId}-anonymous`,
    routeId,
    limits: [createRouteIpRule(routeId, limit, ANON_IP_LIMIT.windowSeconds), createGlobalIpRule(routeId)],
  };
}

function createAuthenticatedPolicy(routeId: string): RateLimitPolicy {
  return {
    name: `${routeId}-auth`,
    routeId,
    limits: [createRouteUserRule(routeId, GLOBAL_USER_LIMIT.limit, GLOBAL_USER_LIMIT.windowSeconds), createGlobalUserRule(routeId), createGlobalIpRule(routeId)],
    deriveUserId: deriveUserIdFromAuth,
  };
}

function createWritePolicy(routeId: string): RateLimitPolicy {
  return {
    name: `${routeId}-write`,
    routeId,
    limits: [
      createRouteUserRule(routeId, WRITE_USER_LIMIT.limit, WRITE_USER_LIMIT.windowSeconds, WRITE_USER_LIMIT.burst),
      createGlobalUserRule(routeId),
      createGlobalIpRule(routeId),
    ],
    deriveUserId: deriveUserIdFromAuth,
  };
}

function createAuthEndpointPolicy(routeId: string): RateLimitPolicy {
  return {
    name: `${routeId}-auth-endpoint`,
    routeId,
    limits: [
      createRouteIpRule(routeId, AUTH_BASE_LIMIT.limit, AUTH_BASE_LIMIT.windowSeconds),
  createGlobalUserRule(routeId),
      createGlobalIpRule(routeId),
    ],
    deriveUserId: deriveUserIdFromAuth,
    authBackoff: {
      limit: AUTH_BASE_LIMIT.limit,
      windowSeconds: AUTH_FAILURE_WINDOW_SECONDS,
      failureStatusCodes: [400, 401, 403],
      ipKeyResolver: buildAuthFailureIpKeyResolver(),
      userKeyResolver: buildAuthFailureUserKeyResolver(),
      resetOnSuccess: true,
    },
  };
}

function normalizePath(path: string): string {
  if (path.startsWith('moderation/appeals/') && path.endsWith('/vote')) {
    return 'moderation/appeals/{appealId}/vote';
  }
  return path;
}

function extractRequestPath(req: HttpRequest): string {
  try {
    const url = new URL(req.url);
    let path = url.pathname || '';
    if (path.startsWith('/')) {
      path = path.slice(1);
    }
    if (path.startsWith('api/')) {
      path = path.slice(4);
    }
    return normalizePath(path);
  } catch {
    return '';
  }
}

export function getPolicyForRoute(req: HttpRequest): RateLimitPolicy {
  const path = extractRequestPath(req);
  const method = (req.method || 'GET').toUpperCase();

  switch (path) {
    case 'feed':
      return createAnonymousPolicy('feed');
    case 'post':
      return createWritePolicy('post');
    case 'moderation/flag':
      return createWritePolicy('moderation/flag');
    case 'moderation/appeals':
      return method === 'POST'
        ? createWritePolicy('moderation/appeals')
        : createAuthenticatedPolicy('moderation/appeals');
    case 'moderation/appeals/{appealId}/vote':
      return createWritePolicy('moderation/appeals/vote');
    case 'user/export':
      return createWritePolicy('user/export');
    case 'user/delete':
      return createWritePolicy('user/delete');
    case 'auth/token':
    case 'auth/authorize':
      return createAuthEndpointPolicy(path);
    case 'auth/userinfo':
      return createAuthenticatedPolicy('auth/userinfo');
    case 'auth/b2c-config':
    case 'auth/ping':
      return createAnonymousPolicy(path);
    case 'health':
  return createAnonymousPolicy('health', ANON_IP_LIMIT.limit);
    default:
      return createGenericPolicy(path || 'unknown');
  }
}

export function getPolicyForFunction(routeId: string): RateLimitPolicy {
  switch (routeId) {
    case 'getFeed':
      return createAnonymousPolicy('feed');
    case 'createPost':
      return createWritePolicy('post');
    case 'analytics.ingest':
      // Analytics: 60 requests/min per user (batch up to 50 events each)
      return createAuthenticatedPolicy('analytics/ingest', 60, 60);
    case 'moderation-flag-content':
      return createWritePolicy('moderation/flag');
    case 'moderation-submit-appeal':
      return createWritePolicy('moderation/appeals');
    case 'moderation-vote-appeal':
      return createWritePolicy('moderation/appeals/vote');
    case 'privacy-export-user':
      return createWritePolicy('user/export');
    case 'privacy-delete-user':
      return createWritePolicy('user/delete');
    case 'auth-token':
    case 'auth-authorize':
      return createAuthEndpointPolicy(routeId);
    case 'auth-userinfo':
      return createAuthenticatedPolicy('auth/userinfo');
    case 'auth-config':
    case 'auth-ping':
      return createAnonymousPolicy(routeId);
    case 'health':
  return createAnonymousPolicy('health', ANON_IP_LIMIT.limit);
    default:
      return createGenericPolicy(routeId);
  }
}
