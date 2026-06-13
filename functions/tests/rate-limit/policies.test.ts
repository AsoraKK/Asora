import type { HttpRequest } from '@azure/functions';

import { getPolicyForFunction, getPolicyForRoute } from '@rate-limit/policies';

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

function findLimit(policy: ReturnType<typeof getPolicyForRoute>, idFragment: string) {
  return policy.limits.find((limit) => limit.id.includes(idFragment));
}

describe('getPolicyForRoute', () => {
  describe('anonymous routes', () => {
    it('returns anonymous policy for feed endpoint', () => {
      const policy = getPolicyForRoute(createRequest('GET', 'feed'));

      expect(policy.name).toBe('feed-anonymous');
      expect(policy.routeId).toBe('feed');
      expect(policy.deriveUserId).toBeUndefined();
    });

    it('returns anonymous policy for health endpoint', () => {
      const policy = getPolicyForRoute(createRequest('GET', 'health'));

      expect(policy.name).toBe('health-anonymous');
      expect(policy.deriveUserId).toBeUndefined();
    });

    it('returns anonymous policy for auth ping', () => {
      const policy = getPolicyForRoute(createRequest('GET', 'auth/ping'));

      expect(policy.name).toBe('auth/ping-anonymous');
    });
  });

  describe('feed reads', () => {
    it('returns shared hybrid read policy for discover feed', () => {
      const policy = getPolicyForRoute(createRequest('GET', 'feed/discover'));

      expect(policy.name).toBe('feed/discover-read');
      expect(policy.routeId).toBe('feed/discover');
      expect(findLimit(policy, 'route-user')).toBeDefined();
      expect(findLimit(policy, 'route-ip')).toBeDefined();
      expect(policy.deriveUserId).toBeDefined();
    });

    it('shares discover feed limits with feed/public', () => {
      const policy = getPolicyForRoute(createRequest('GET', 'feed/public'));

      expect(policy.name).toBe('feed/discover-read');
      expect(policy.routeId).toBe('feed/discover');
    });

    it('normalizes dynamic user feed paths', () => {
      const policy = getPolicyForRoute(createRequest('GET', 'feed/user/user-123'));

      expect(policy.name).toBe('feed/user-read');
      expect(policy.routeId).toBe('feed/user');
    });

    it('returns authenticated feed policy for news feed', () => {
      const policy = getPolicyForRoute(createRequest('GET', 'feed/news'));

      expect(policy.name).toBe('feed/news-auth');
      expect(findLimit(policy, 'route-user')).toBeDefined();
      expect(findLimit(policy, 'route-ip')).toBeDefined();
    });
  });

  describe('auth routes with backoff', () => {
    for (const path of ['auth/token', 'auth/authorize', 'auth/redeem-invite', 'auth/refresh']) {
      it(`returns auth endpoint policy for ${path}`, () => {
        const policy = getPolicyForRoute(createRequest('POST', path));

        expect(policy.name).toBe(`${path}-auth-endpoint`);
        expect(policy.authBackoff).toBeDefined();
        expect(policy.authBackoff?.failureStatusCodes).toContain(401);
        expect(policy.authBackoff?.resetOnSuccess).toBe(true);
      });
    }
  });

  describe('profile and authenticated reads', () => {
    it('returns authenticated policy for userinfo', () => {
      const policy = getPolicyForRoute(createRequest('GET', 'auth/userinfo'));

      expect(policy.name).toBe('auth/userinfo-auth');
      expect(policy.deriveUserId).toBeDefined();
      expect(findLimit(policy, 'route-user')).toBeDefined();
      expect(findLimit(policy, 'route-ip')).toBeDefined();
    });

    it('returns explicit profile edit policy for users/me patch', () => {
      const policy = getPolicyForRoute(createRequest('PATCH', 'users/me'));

      expect(policy.name).toBe('users/me-write');
      expect(policy.routeId).toBe('users/me');
      expect(findLimit(policy, 'route-user')?.tokenBucket?.capacity).toBeGreaterThan(0);
      expect(findLimit(policy, 'route-ip')).toBeDefined();
    });

    it('returns authenticated policy for users/me get', () => {
      const policy = getPolicyForRoute(createRequest('GET', 'users/me'));

      expect(policy.name).toBe('users/me-auth');
      expect(findLimit(policy, 'route-user')).toBeDefined();
      expect(findLimit(policy, 'route-ip')).toBeDefined();
    });
  });

  describe('write routes', () => {
    const cases: Array<{ path: string; expectedName: string }> = [
      { path: 'post', expectedName: 'post-write' },
      { path: 'moderation/flag', expectedName: 'moderation/flag-write' },
      { path: 'moderation/appeals', expectedName: 'moderation/appeals-write' },
      { path: 'moderation/appeals/abc123/vote', expectedName: 'moderation/appeals/vote-write' },
      { path: 'user/export', expectedName: 'user/export-write' },
      { path: 'user/delete', expectedName: 'user/delete-write' },
    ];

    for (const { path, expectedName } of cases) {
      it(`returns write policy for ${path}`, () => {
        const policy = getPolicyForRoute(createRequest('POST', path));

        expect(policy.name).toBe(expectedName);
        expect(findLimit(policy, 'route-user')).toBeDefined();
        expect(findLimit(policy, 'route-ip')).toBeDefined();
      });
    }
  });

  describe('admin mutations', () => {
    const cases: Array<{ method: string; path: string; expectedName: string }> = [
      { method: 'POST', path: '_admin/content/content-1/block', expectedName: 'admin/content/block-write' },
      { method: 'POST', path: '_admin/content/content-1/publish', expectedName: 'admin/content/publish-write' },
      { method: 'POST', path: '_admin/users/user-1/disable', expectedName: 'admin/users/disable-write' },
      { method: 'POST', path: '_admin/users/user-1/enable', expectedName: 'admin/users/enable-write' },
      { method: 'POST', path: '_admin/appeals/appeal-1/approve', expectedName: 'admin/appeals/approve-write' },
      { method: 'POST', path: '_admin/appeals/appeal-1/reject', expectedName: 'admin/appeals/reject-write' },
      { method: 'POST', path: '_admin/appeals/appeal-1/override', expectedName: 'admin/appeals/override-write' },
      { method: 'POST', path: '_admin/invites', expectedName: 'admin/invites/create-write' },
      { method: 'POST', path: '_admin/invites/batch', expectedName: 'admin/invites/batch-write' },
      { method: 'DELETE', path: '_admin/invites/ABCD-1234', expectedName: 'admin/invites/delete-write' },
      { method: 'POST', path: '_admin/invites/ABCD-1234/revoke', expectedName: 'admin/invites/revoke-write' },
      { method: 'PUT', path: '_admin/budget', expectedName: 'admin/budget-write' },
      { method: 'PUT', path: 'admin/config', expectedName: 'admin/config-write' },
      { method: 'POST', path: '_admin/flags/flag-1/resolve', expectedName: 'admin/flags/resolve-write' },
      { method: 'POST', path: '_admin/news/ingest', expectedName: 'admin/news/ingest-write' },
      { method: 'POST', path: '_admin/dsr/export', expectedName: 'admin/dsr/export-write' },
      { method: 'POST', path: '_admin/dsr/delete', expectedName: 'admin/dsr/delete-write' },
      { method: 'POST', path: '_admin/dsr/request-1/retry', expectedName: 'admin/dsr/retry-write' },
      { method: 'POST', path: '_admin/dsr/request-1/release', expectedName: 'admin/dsr/release-write' },
      { method: 'POST', path: '_admin/dsr/request-1/cancel', expectedName: 'admin/dsr/cancel-write' },
      { method: 'POST', path: '_admin/dsr/legal-holds', expectedName: 'admin/dsr/place-hold-write' },
      { method: 'POST', path: '_admin/dsr/legal-holds/request-1/clear', expectedName: 'admin/dsr/clear-hold-write' },
      { method: 'POST', path: '_admin/dsr/request-1/reviewA', expectedName: 'admin/dsr/review-a-write' },
      { method: 'POST', path: '_admin/dsr/request-1/reviewB', expectedName: 'admin/dsr/review-b-write' },
      { method: 'POST', path: 'admin/moderation-classes/weights', expectedName: 'admin/moderation-classes/weights-write' },
      { method: 'POST', path: 'admin/moderation-classes/spam/reset', expectedName: 'admin/moderation-classes/reset-write' },
      { method: 'PATCH', path: 'admin/users/user-1/tier', expectedName: 'admin/users/tier-write' },
    ];

    for (const { method, path, expectedName } of cases) {
      it(`returns explicit admin mutation policy for ${method} ${path}`, () => {
        const policy = getPolicyForRoute(createRequest(method, path));

        expect(policy.name).toBe(expectedName);
        expect(findLimit(policy, 'route-user')?.tokenBucket?.capacity).toBeGreaterThan(0);
        expect(findLimit(policy, 'route-ip')).toBeDefined();
      });
    }
  });

  describe('generic fallback', () => {
    it('returns generic policy for unknown routes', () => {
      const policy = getPolicyForRoute(createRequest('GET', 'unknown/route'));

      expect(policy.name).toBe('unknown/route-generic');
      expect(policy.deriveUserId).toBeDefined();
    });
  });
});

describe('getPolicyForFunction', () => {
  it('returns appropriate policies for function IDs', () => {
    const cases: Array<{ fn: string; expectedName: string; hasBackoff: boolean }> = [
      { fn: 'getFeed', expectedName: 'feed/discover-read', hasBackoff: false },
      { fn: 'createPost', expectedName: 'post-write', hasBackoff: false },
      { fn: 'updatePost', expectedName: 'post/update-write', hasBackoff: false },
      { fn: 'deletePost', expectedName: 'post/delete-write', hasBackoff: false },
      { fn: 'likePost', expectedName: 'post/like-write', hasBackoff: false },
      { fn: 'createComment', expectedName: 'post/comment-write', hasBackoff: false },
      { fn: 'analytics.ingest', expectedName: 'analytics/ingest-auth', hasBackoff: false },
      { fn: 'moderation-flag-content', expectedName: 'moderation/flag-write', hasBackoff: false },
      { fn: 'moderation-submit-appeal', expectedName: 'moderation/appeals-write', hasBackoff: false },
      { fn: 'moderation-vote-appeal', expectedName: 'moderation/appeals/vote-write', hasBackoff: false },
      { fn: 'appeals-create', expectedName: 'appeals/create-write', hasBackoff: false },
      { fn: 'appeals-vote', expectedName: 'appeals/vote-write', hasBackoff: false },
      { fn: 'media-upload-url', expectedName: 'media/upload-url-write', hasBackoff: false },
      { fn: 'privacy-export-user', expectedName: 'user/export-write', hasBackoff: false },
      { fn: 'privacy-delete-user', expectedName: 'user/delete-write', hasBackoff: false },
      { fn: 'auth-token', expectedName: 'auth-token-auth-endpoint', hasBackoff: true },
      { fn: 'auth-authorize', expectedName: 'auth-authorize-auth-endpoint', hasBackoff: true },
      { fn: 'auth-redeem-invite', expectedName: 'auth-redeem-invite-auth-endpoint', hasBackoff: true },
      { fn: 'auth-token-refresh', expectedName: 'auth-token-refresh-auth-endpoint', hasBackoff: true },
      { fn: 'auth-sessions-revoke', expectedName: 'auth/sessions/revoke-write', hasBackoff: false },
      { fn: 'auth-userinfo', expectedName: 'auth/userinfo-auth', hasBackoff: false },
      { fn: 'admin_set_user_tier', expectedName: 'admin/users/set-tier-write', hasBackoff: false },
      { fn: 'moderation-review-appeal', expectedName: 'moderation/appeals/review-write', hasBackoff: false },
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
      createRequest('GET', 'feed/discover'),
      createRequest('POST', 'post'),
      createRequest('GET', 'health'),
      createRequest('POST', 'auth/token'),
      createRequest('GET', 'auth/userinfo'),
      createRequest('POST', 'auth/redeem-invite'),
      createRequest('PATCH', 'users/me'),
      createRequest('POST', '_admin/content/content-1/block'),
    ];

    for (const req of routes) {
      const policy = getPolicyForRoute(req);

      expect(policy.name).toBeTruthy();
      expect(policy.routeId).toBeTruthy();
      expect(policy.limits).toBeInstanceOf(Array);
      expect(policy.limits.length).toBeGreaterThan(0);

      for (const limit of policy.limits) {
        expect(limit.id).toBeTruthy();
        expect(['route', 'user', 'ip']).toContain(limit.scope);
        expect(limit.keyResolver).toBeInstanceOf(Function);
        expect(limit.slidingWindow || limit.tokenBucket).toBeTruthy();
      }
    }
  });

  it('write policies include token bucket and route ip controls', () => {
    const policies = [
      getPolicyForRoute(createRequest('POST', 'post')),
      getPolicyForRoute(createRequest('POST', 'moderation/flag')),
      getPolicyForRoute(createRequest('PATCH', 'users/me')),
      getPolicyForRoute(createRequest('POST', '_admin/content/content-1/block')),
    ];

    for (const policy of policies) {
      const routeUserLimit = findLimit(policy, 'route-user');
      const routeIpLimit = findLimit(policy, 'route-ip');

      expect(routeUserLimit?.tokenBucket).toBeDefined();
      expect(routeUserLimit?.tokenBucket?.capacity).toBeGreaterThan(0);
      expect(routeIpLimit?.slidingWindow?.limit).toBeGreaterThan(0);
    }
  });

  it('auth backoff policies have proper configuration', () => {
    const authRoutes = ['auth/token', 'auth/authorize', 'auth/refresh'];

    for (const path of authRoutes) {
      const policy = getPolicyForRoute(createRequest('POST', path));

      expect(policy.authBackoff).toBeDefined();
      expect(policy.authBackoff?.ipKeyResolver).toBeInstanceOf(Function);
      expect(policy.authBackoff?.userKeyResolver).toBeInstanceOf(Function);
      expect(policy.authBackoff?.failureStatusCodes).toContain(401);
      expect(policy.authBackoff?.windowSeconds).toBeGreaterThan(0);
    }
  });
});
