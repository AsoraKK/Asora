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

const GLOBAL_IP_LIMIT = { limit: 120, windowSeconds: 60 };
const GLOBAL_USER_LIMIT = { limit: 240, windowSeconds: 60 };
const DEFAULT_ROUTE_IP_LIMIT = { limit: 60, windowSeconds: 60 };
const WRITE_USER_LIMIT = {
  userLimit: 30,
  ipLimit: 30,
  windowSeconds: 60,
  burst: 10,
};
const ANON_IP_LIMIT = { limit: 60, windowSeconds: 60 };
const AUTH_BASE_LIMIT = { limit: 20, windowSeconds: 60 };
const FEED_HYBRID_READ_LIMIT = {
  userLimit: 90,
  authenticatedIpLimit: 30,
  guestIpLimit: 20,
  windowSeconds: 60,
};
const FEED_AUTHENTICATED_READ_LIMIT = { userLimit: 90, ipLimit: 30, windowSeconds: 60 };
const USERINFO_LIMIT = { userLimit: 60, ipLimit: 20, windowSeconds: 60 };
const POST_CREATE_LIMIT = { userLimit: 15, ipLimit: 20, windowSeconds: 60, burst: 5 };
const COMMENT_CREATE_LIMIT = { userLimit: 20, ipLimit: 25, windowSeconds: 60, burst: 6 };
const FLAG_CREATE_LIMIT = { userLimit: 10, ipLimit: 15, windowSeconds: 60, burst: 4 };
const APPEAL_CREATE_LIMIT = { userLimit: 6, ipLimit: 10, windowSeconds: 60, burst: 2 };
const APPEAL_VOTE_LIMIT = { userLimit: 20, ipLimit: 25, windowSeconds: 60, burst: 5 };
const PROFILE_EDIT_LIMIT = { userLimit: 10, ipLimit: 15, windowSeconds: 60, burst: 4 };
const MEDIA_UPLOAD_LIMIT = { userLimit: 10, ipLimit: 12, windowSeconds: 60, burst: 3 };
const ADMIN_MUTATION_LIMIT = { userLimit: 12, ipLimit: 20, windowSeconds: 60, burst: 3 };
// Auth endpoints rely on this base limit. Increasing it gives attackers more retries and should only happen after a security review.
const AUTH_FAILURE_WINDOW_SECONDS = 30 * 60;
// This window bounds how long failure lockouts persist. Lengthening it decreases protection and needs explicit review.

interface ReadPolicyConfig {
  userLimit: number;
  ipLimit: number;
  windowSeconds: number;
}

interface HybridReadPolicyConfig {
  userLimit: number;
  authenticatedIpLimit: number;
  guestIpLimit: number;
  windowSeconds: number;
}

interface WritePolicyConfig extends ReadPolicyConfig {
  burst: number;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const payloadSegment = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const normalized = payloadSegment.padEnd(Math.ceil(payloadSegment.length / 4) * 4, '=');
    const decoded = Buffer.from(normalized, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function getCloudflareRateLimitPrincipal(req: HttpRequest): string | null {
  const token = req.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    return null;
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (email) {
    return `cf:${email}`;
  }

  const sub = typeof payload.sub === 'string' ? payload.sub.trim() : '';
  if (sub) {
    return `cf:${sub}`;
  }

  return null;
}

async function derivePrincipalId(ctx: RateLimitRequestContext): Promise<string | null> {
  try {
    const principal = await parseAuth(ctx.req);
    if (principal?.sub) {
      return principal.sub;
    }
  } catch {
    // Fall through to alternate auth headers below.
  }

  return getCloudflareRateLimitPrincipal(ctx.req);
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

function createConditionalRouteIpRule(
  routeId: string,
  idSuffix: string,
  limit: number,
  windowSeconds: number,
  shouldApply: (ctx: RateLimitRequestContext) => boolean
): RateLimitRule {
  return {
    id: `${routeId}-${idSuffix}`,
    scope: 'route',
    keyResolver: (ctx) => {
      if (!ctx.hashedIp || !shouldApply(ctx)) {
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

function createAuthenticatedRouteIpRule(routeId: string, limit: number, windowSeconds: number): RateLimitRule {
  return createConditionalRouteIpRule(routeId, 'route-auth-ip', limit, windowSeconds, (ctx) => Boolean(ctx.userId));
}

function createGuestRouteIpRule(routeId: string, limit: number, windowSeconds: number): RateLimitRule {
  return createConditionalRouteIpRule(routeId, 'route-guest-ip', limit, windowSeconds, (ctx) => !ctx.userId);
}

function createGenericPolicy(routeId: string): RateLimitPolicy {
  return {
    name: `${routeId}-generic`,
    routeId,
    limits: [createGlobalUserRule(routeId), createGlobalIpRule(routeId)],
    deriveUserId: derivePrincipalId,
  };
}

function createAnonymousPolicy(routeId: string, limit = ANON_IP_LIMIT.limit): RateLimitPolicy {
  return {
    name: `${routeId}-anonymous`,
    routeId,
    limits: [createRouteIpRule(routeId, limit, ANON_IP_LIMIT.windowSeconds), createGlobalIpRule(routeId)],
  };
}

function createAuthenticatedPolicy(
  routeId: string,
  config: ReadPolicyConfig = {
    userLimit: GLOBAL_USER_LIMIT.limit,
    ipLimit: DEFAULT_ROUTE_IP_LIMIT.limit,
    windowSeconds: GLOBAL_USER_LIMIT.windowSeconds,
  }
): RateLimitPolicy {
  return {
    name: `${routeId}-auth`,
    routeId,
    limits: [
      createRouteUserRule(routeId, config.userLimit, config.windowSeconds),
      createRouteIpRule(routeId, config.ipLimit, config.windowSeconds),
      createGlobalUserRule(routeId),
      createGlobalIpRule(routeId),
    ],
    deriveUserId: derivePrincipalId,
  };
}

function createHybridReadPolicy(routeId: string, config: HybridReadPolicyConfig): RateLimitPolicy {
  return {
    name: `${routeId}-read`,
    routeId,
    limits: [
      createRouteUserRule(routeId, config.userLimit, config.windowSeconds),
      createAuthenticatedRouteIpRule(routeId, config.authenticatedIpLimit, config.windowSeconds),
      createGuestRouteIpRule(routeId, config.guestIpLimit, config.windowSeconds),
      createGlobalUserRule(routeId),
      createGlobalIpRule(routeId),
    ],
    deriveUserId: derivePrincipalId,
  };
}

function createWritePolicy(routeId: string, config: WritePolicyConfig = WRITE_USER_LIMIT): RateLimitPolicy {
  return {
    name: `${routeId}-write`,
    routeId,
    limits: [
      createRouteUserRule(routeId, config.userLimit, config.windowSeconds, config.burst),
      createRouteIpRule(routeId, config.ipLimit, config.windowSeconds),
      createGlobalUserRule(routeId),
      createGlobalIpRule(routeId),
    ],
    deriveUserId: derivePrincipalId,
  };
}

function createAdminMutationPolicy(routeId: string): RateLimitPolicy {
  return createWritePolicy(routeId, ADMIN_MUTATION_LIMIT);
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
    deriveUserId: derivePrincipalId,
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

function isAdminMutationPath(path: string, method: string): boolean {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return false;
  }

  if (path === '_admin/invites' || path === '_admin/invites/batch') {
    return method === 'POST';
  }

  if (path.startsWith('_admin/invites/')) {
    return method === 'DELETE' || path.endsWith('/revoke');
  }

  if (path.startsWith('_admin/content/') && (path.endsWith('/block') || path.endsWith('/publish'))) {
    return true;
  }

  if (path.startsWith('_admin/users/') && (path.endsWith('/disable') || path.endsWith('/enable'))) {
    return true;
  }

  if (path.startsWith('_admin/appeals/') && (path.endsWith('/approve') || path.endsWith('/reject') || path.endsWith('/override'))) {
    return true;
  }

  if (path === '_admin/news/ingest') {
    return true;
  }

  if (path.startsWith('_admin/flags/') && path.endsWith('/resolve')) {
    return true;
  }

  if (path.startsWith('_admin/dsr/')) {
    return true;
  }

  if (path === '_admin/budget' || path === 'admin/config' || path === '_admin/config') {
    return method === 'PUT';
  }

  if (path === 'admin/moderation-classes/weights' || path.startsWith('admin/moderation-classes/')) {
    return true;
  }

  if (path.startsWith('admin/users/') && path.endsWith('/tier')) {
    return true;
  }

  return false;
}

function getAdminMutationRouteId(path: string): string {
  if (path === '_admin/invites') {
    return 'admin/invites/create';
  }
  if (path === '_admin/invites/batch') {
    return 'admin/invites/batch';
  }
  if (path.startsWith('_admin/invites/')) {
    return path.endsWith('/revoke') ? 'admin/invites/revoke' : 'admin/invites/delete';
  }
  if (path.startsWith('_admin/content/')) {
    return path.endsWith('/publish') ? 'admin/content/publish' : 'admin/content/block';
  }
  if (path.startsWith('_admin/users/')) {
    return path.endsWith('/enable') ? 'admin/users/enable' : 'admin/users/disable';
  }
  if (path.startsWith('_admin/appeals/')) {
    if (path.endsWith('/approve')) {
      return 'admin/appeals/approve';
    }
    if (path.endsWith('/reject')) {
      return 'admin/appeals/reject';
    }
    if (path.endsWith('/override')) {
      return 'admin/appeals/override';
    }
  }
  if (path.startsWith('_admin/flags/') && path.endsWith('/resolve')) {
    return 'admin/flags/resolve';
  }
  if (path === '_admin/news/ingest') {
    return 'admin/news/ingest';
  }
  if (path === '_admin/dsr/export') {
    return 'admin/dsr/export';
  }
  if (path === '_admin/dsr/delete') {
    return 'admin/dsr/delete';
  }
  if (path.endsWith('/cancel')) {
    return 'admin/dsr/cancel';
  }
  if (path.endsWith('/retry')) {
    return 'admin/dsr/retry';
  }
  if (path.endsWith('/release')) {
    return 'admin/dsr/release';
  }
  if (path === '_admin/dsr/legal-holds') {
    return 'admin/dsr/place-hold';
  }
  if (path.endsWith('/clear')) {
    return 'admin/dsr/clear-hold';
  }
  if (path.endsWith('/reviewA')) {
    return 'admin/dsr/review-a';
  }
  if (path.endsWith('/reviewB')) {
    return 'admin/dsr/review-b';
  }
  if (path === '_admin/budget') {
    return 'admin/budget';
  }
  if (path === 'admin/config' || path === '_admin/config') {
    return 'admin/config';
  }
  if (path === 'admin/moderation-classes/weights') {
    return 'admin/moderation-classes/weights';
  }
  if (path.endsWith('/reset')) {
    return 'admin/moderation-classes/reset';
  }
  if (path.startsWith('admin/users/') && path.endsWith('/tier')) {
    return 'admin/users/tier';
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

  if (path === 'feed/discover' || path === 'feed/public') {
    return createHybridReadPolicy('feed/discover', FEED_HYBRID_READ_LIMIT);
  }

  if (path.startsWith('feed/user/')) {
    return createHybridReadPolicy('feed/user', FEED_HYBRID_READ_LIMIT);
  }

  if (path === 'feed/news') {
    return createAuthenticatedPolicy('feed/news', FEED_AUTHENTICATED_READ_LIMIT);
  }

  if (path === 'users/me') {
    return method === 'PATCH'
      ? createWritePolicy('users/me', PROFILE_EDIT_LIMIT)
      : createAuthenticatedPolicy('users/me', USERINFO_LIMIT);
  }

  if (isAdminMutationPath(path, method)) {
    return createAdminMutationPolicy(getAdminMutationRouteId(path));
  }

  switch (path) {
    case 'feed':
      return createHybridReadPolicy('feed/discover', FEED_HYBRID_READ_LIMIT);
    case 'post':
      return createWritePolicy('post', POST_CREATE_LIMIT);
    case 'moderation/flag':
      return createWritePolicy('moderation/flag', FLAG_CREATE_LIMIT);
    case 'moderation/appeals':
      return method === 'POST'
        ? createWritePolicy('moderation/appeals', APPEAL_CREATE_LIMIT)
        : createAuthenticatedPolicy('moderation/appeals', USERINFO_LIMIT);
    case 'moderation/appeals/{appealId}/vote':
      return createWritePolicy('moderation/appeals/vote', APPEAL_VOTE_LIMIT);
    case 'user/export':
      return createAdminMutationPolicy('user/export');
    case 'user/delete':
      return createAdminMutationPolicy('user/delete');
    case 'auth/token':
    case 'auth/email':
    case 'auth/refresh':
    case 'auth/authorize':
    case 'auth/redeem-invite':
      return createAuthEndpointPolicy(path);
    case 'auth/userinfo':
      return createAuthenticatedPolicy('auth/userinfo', USERINFO_LIMIT);
    case 'auth/sessions/revoke':
      return createWritePolicy('auth/sessions/revoke');
    case 'auth/ping':
    case 'auth/invite/validate':
      return createAnonymousPolicy(path, 30);
    case 'health':
      return createAnonymousPolicy('health', ANON_IP_LIMIT.limit);
    case '_admin/ops/metrics':
      return createAuthenticatedPolicy('admin/ops/metrics', {
        userLimit: 120,
        ipLimit: 60,
        windowSeconds: 60,
      });
    case '_admin/ops/state':
      return method === 'PUT'
        ? createAdminMutationPolicy('admin/ops/state')
        : createAuthenticatedPolicy('admin/ops/state', {
            userLimit: 120,
            ipLimit: 60,
            windowSeconds: 60,
          });
    default:
      return createGenericPolicy(path || 'unknown');
  }
}

export function getPolicyForFunction(routeId: string): RateLimitPolicy {
  switch (routeId) {
    case 'getFeed':
      return createHybridReadPolicy('feed/discover', FEED_HYBRID_READ_LIMIT);
    case 'createPost':
      return createWritePolicy('post', POST_CREATE_LIMIT);
    case 'updatePost':
      return createWritePolicy('post/update');
    case 'deletePost':
      return createWritePolicy('post/delete');
    case 'likePost':
    case 'unlikePost':
      return createWritePolicy('post/like');
    case 'getLikeStatus':
      return createAuthenticatedPolicy('post/like', {
        userLimit: 120,
        ipLimit: 60,
        windowSeconds: 60,
      });
    case 'createComment':
      return createWritePolicy('post/comment', COMMENT_CREATE_LIMIT);
    case 'listComments':
      return createAnonymousPolicy('post/comments');
    case 'analytics.ingest':
      // Analytics: 60 requests/min per user (batch up to 50 events each)
      return createAuthenticatedPolicy('analytics/ingest', {
        userLimit: 60,
        ipLimit: 30,
        windowSeconds: 60,
      });
    case 'moderation-flag-content':
      return createWritePolicy('moderation/flag', FLAG_CREATE_LIMIT);
    case 'moderation-submit-appeal':
      return createWritePolicy('moderation/appeals', APPEAL_CREATE_LIMIT);
    case 'moderation-vote-appeal':
      return createWritePolicy('moderation/appeals/vote', APPEAL_VOTE_LIMIT);
    case 'appeals-create':
      return createWritePolicy('appeals/create', APPEAL_CREATE_LIMIT);
    case 'appeals-vote':
      return createWritePolicy('appeals/vote', APPEAL_VOTE_LIMIT);
    case 'media-upload-url':
      return createWritePolicy('media/upload-url', MEDIA_UPLOAD_LIMIT);
    case 'privacy-export-user':
      return createAdminMutationPolicy('user/export');
    case 'privacy-delete-user':
      return createAdminMutationPolicy('user/delete');
    case 'auth-token':
    case 'auth-email-login':
    case 'auth-token-refresh':
    case 'auth-authorize':
      return createAuthEndpointPolicy(routeId);
    case 'auth-redeem-invite':
      return createAuthEndpointPolicy(routeId);
    case 'auth-userinfo':
      return createAuthenticatedPolicy('auth/userinfo', USERINFO_LIMIT);
    case 'auth-sessions-revoke':
      return createWritePolicy('auth/sessions/revoke');
    case 'auth-ping':
      return createAnonymousPolicy(routeId);
    case 'auth-invite-validate':
      return createAnonymousPolicy('auth/invite/validate', 30);
    case 'health':
      return createAnonymousPolicy('health', ANON_IP_LIMIT.limit);
    case 'admin_set_user_tier':
      return createAdminMutationPolicy('admin/users/set-tier');
    case 'moderation-review-appeal':
      return createAdminMutationPolicy('moderation/appeals/review');
    default:
      return createGenericPolicy(routeId);
  }
}
