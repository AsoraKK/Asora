import type { HttpRequest } from '@azure/functions';

import { getPolicyForRoute, getPolicyForFunction } from '@rate-limit/policies';

function createRequest(
  method: string,
  path: string,
  headers: Record<string, string> = {}
): HttpRequest {
  const url = `https://api.asora.dev/api/${path}`;
  return {
    method,
    url,
    headers: new Headers({
      'cf-connecting-ip': '203.0.113.10',
      ...headers,
    }),
  } as unknown as HttpRequest;
}

describe('getPolicyForRoute', () => {
  describe('anonymous routes', () => {
    it('returns anonymous policy for feed endpoint', () => {
      const req = createRequest('GET', 'feed');
      const policy = getPolicyForRoute(req);

      expect(policy.name).toBe('feed-anonymous');
      expect(policy.routeId).toBe('feed');
      expect(policy.limits.some((l) => l.scope === 'ip')).toBe(true);
      expect(policy.deriveUserId).toBeUndefined();
    });

    it('returns anonymous policy for health endpoint', () => {
      const req = createRequest('GET', 'health');
      const policy = getPolicyForRoute(req);

      expect(policy.name).toBe('health-anonymous');
      expect(policy.deriveUserId).toBeUndefined();
    });

    it('returns anonymous policy for auth ping', () => {
      const req = createRequest('GET', 'auth/ping');
      const policy = getPolicyForRoute(req);

      expect(policy.name).toBe('auth/ping-anonymous');
    });
  });

  describe('write routes', () => {
    it('returns write policy for post creation', () => {
      const req = createRequest('POST', 'post');
      const policy = getPolicyForRoute(req);

      expect(policy.name).toBe('post-write');
      expect(policy.routeId).toBe('post');
      expect(policy.limits.some((l) => l.scope === 'route')).toBe(true);
      expect(policy.deriveUserId).toBeDefined();
    });

    it('returns write policy for moderation flag', () => {
      const req = createRequest('POST', 'moderation/flag');
      const policy = getPolicyForRoute(req);

      expect(policy.name).toBe('moderation/flag-write');
    });

    it('returns write policy for user export', () => {
      const req = createRequest('POST', 'user/export');
      const policy = getPolicyForRoute(req);

      expect(policy.name).toBe('user/export-write');
    });

    it('returns write policy for user delete', () => {
      const req = createRequest('POST', 'user/delete');
      const policy = getPolicyForRoute(req);

      expect(policy.name).toBe('user/delete-write');
    });

    it('returns write policy for appeal submission', () => {
      const req = createRequest('POST', 'moderation/appeals');
      const policy = getPolicyForRoute(req);

      expect(policy.name).toBe('moderation/appeals-write');
    });

    it('returns write policy for appeal voting', () => {
      const req = createRequest('POST', 'moderation/appeals/abc123/vote');
      const policy = getPolicyForRoute(req);

      expect(policy.name).toBe('moderation/appeals/vote-write');
    });
  });

  describe('auth routes with backoff', () => {
    it('returns auth endpoint policy for token route', () => {
      const req = createRequest('POST', 'auth/token');
      const policy = getPolicyForRoute(req);

      expect(policy.name).toBe('auth/token-auth-endpoint');
      expect(policy.authBackoff).toBeDefined();
      expect(policy.authBackoff?.failureStatusCodes).toContain(401);
      expect(policy.authBackoff?.resetOnSuccess).toBe(true);
    });

    it('returns auth endpoint policy for authorize route', () => {
      const req = createRequest('POST', 'auth/authorize');
      const policy = getPolicyForRoute(req);

      expect(policy.name).toBe('auth/authorize-auth-endpoint');
      expect(policy.authBackoff).toBeDefined();
    });

    it('returns auth endpoint policy for redeem invite route', () => {
      const req = createRequest('POST', 'auth/redeem-invite');
      const policy = getPolicyForRoute(req);

      expect(policy.name).toBe('auth/redeem-invite-auth-endpoint');
      expect(policy.authBackoff).toBeDefined();
    });
  });

  describe('authenticated routes', () => {
    it('returns authenticated policy for userinfo', () => {
      const req = createRequest('GET', 'auth/userinfo');
      const policy = getPolicyForRoute(req);

      expect(policy.name).toBe('auth/userinfo-auth');
      expect(policy.deriveUserId).toBeDefined();
      expect(policy.limits.some((l) => l.scope === 'user')).toBe(true);
    });

    it('returns authenticated policy for appeal listing', () => {
      const req = createRequest('GET', 'moderation/appeals');
      const policy = getPolicyForRoute(req);

      expect(policy.name).toBe('moderation/appeals-auth');
    });
  });

  describe('generic fallback', () => {
    it('returns generic policy for unknown routes', () => {
      const req = createRequest('GET', 'unknown/route');
      const policy = getPolicyForRoute(req);

      expect(policy.name).toBe('unknown/route-generic');
      expect(policy.deriveUserId).toBeDefined();
    });
  });
});

describe('getPolicyForFunction', () => {
  it('returns appropriate policies for function IDs', () => {
    const cases: Array<{ fn: string; expectedName: string; hasBackoff: boolean }> = [
      { fn: 'getFeed', expectedName: 'feed-anonymous', hasBackoff: false },
      { fn: 'createPost', expectedName: 'post-write', hasBackoff: false },
      { fn: 'likePost', expectedName: 'post/like-write', hasBackoff: false },
      { fn: 'createComment', expectedName: 'post/comment-write', hasBackoff: false },
      { fn: 'analytics.ingest', expectedName: 'analytics/ingest-auth', hasBackoff: false },
      { fn: 'moderation-flag-content', expectedName: 'moderation/flag-write', hasBackoff: false },
      { fn: 'privacy-export-user', expectedName: 'user/export-write', hasBackoff: false },
      { fn: 'privacy-delete-user', expectedName: 'user/delete-write', hasBackoff: false },
      { fn: 'auth-token', expectedName: 'auth-token-auth-endpoint', hasBackoff: true },
      { fn: 'auth-authorize', expectedName: 'auth-authorize-auth-endpoint', hasBackoff: true },
      { fn: 'auth-redeem-invite', expectedName: 'auth-redeem-invite-auth-endpoint', hasBackoff: true },
      { fn: 'auth-userinfo', expectedName: 'auth/userinfo-auth', hasBackoff: false },
    ];

    for (const { fn, expectedName, hasBackoff } of cases) {
      const policy = getPolicyForFunction(fn);
      expect(policy.name).toBe(expectedName);
      expect(!!policy.authBackoff).toBe(hasBackoff);
    }
  });

  it('returns generic policy for unknown function IDs', () => {
    const policy = getPolicyForFunction('unknown-function');
    expect(policy.name).toBe('unknown-function-generic');
  });
});

describe('policy structure validation', () => {
  it('all policies have required fields', () => {
    const routes = [
      'feed',
      'post',
      'health',
      'auth/token',
      'auth/userinfo',
      'auth/redeem-invite',
      'user/export',
      'moderation/flag',
    ];

    for (const path of routes) {
      const req = createRequest('POST', path);
      const policy = getPolicyForRoute(req);

      expect(policy.name).toBeTruthy();
      expect(policy.routeId).toBeTruthy();
      expect(policy.limits).toBeInstanceOf(Array);
      expect(policy.limits.length).toBeGreaterThan(0);

      // Each limit should have required fields
      for (const limit of policy.limits) {
        expect(limit.id).toBeTruthy();
        expect(['route', 'user', 'ip']).toContain(limit.scope);
        expect(limit.keyResolver).toBeInstanceOf(Function);
        expect(limit.slidingWindow || limit.tokenBucket).toBeTruthy();
      }
    }
  });

  it('write policies include token bucket for burst control', () => {
    const writeRoutes = ['post', 'moderation/flag', 'user/export'];

    for (const path of writeRoutes) {
      const req = createRequest('POST', path);
      const policy = getPolicyForRoute(req);

      const routeLimit = policy.limits.find((l) => l.id.includes('route-user'));
      if (routeLimit) {
        expect(routeLimit.tokenBucket).toBeDefined();
        expect(routeLimit.tokenBucket?.capacity).toBeGreaterThan(0);
      }
    }
  });

  it('auth backoff policies have proper configuration', () => {
    const authRoutes = ['auth/token', 'auth/authorize'];

    for (const path of authRoutes) {
      const req = createRequest('POST', path);
      const policy = getPolicyForRoute(req);

      expect(policy.authBackoff).toBeDefined();
      expect(policy.authBackoff?.ipKeyResolver).toBeInstanceOf(Function);
      expect(policy.authBackoff?.userKeyResolver).toBeInstanceOf(Function);
      expect(policy.authBackoff?.failureStatusCodes).toContain(401);
      expect(policy.authBackoff?.windowSeconds).toBeGreaterThan(0);
    }
  });
});
