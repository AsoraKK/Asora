import { trackAppEvent, trackAppMetric } from '@shared/appInsights';

type RateLimitMetricKind = 'allowed' | 'blocked';

export interface RateLimitMetricDimensions {
  route: string;
  scope: 'ip' | 'user' | 'route' | 'auth_backoff';
  keyKind: 'ip' | 'user' | 'route';
  policy: string;
}

export interface AuthBackoffEventDimensions {
  route: string;
  ipHash?: string | null;
  userIdPresent: boolean;
}

function trackRateLimitMetric(kind: RateLimitMetricKind, dimensions: RateLimitMetricDimensions): void {
  trackAppMetric({
    name: `rate_limit.${kind}`,
    value: 1,
    properties: {
      route: dimensions.route,
      scope: dimensions.scope,
      key_kind: dimensions.keyKind,
      policy: dimensions.policy,
    },
  });
}

export function trackRateLimitAllowed(dimensions: RateLimitMetricDimensions): void {
  trackRateLimitMetric('allowed', dimensions);
}

export function trackRateLimitBlocked(dimensions: RateLimitMetricDimensions): void {
  trackRateLimitMetric('blocked', dimensions);
}

export function trackAuthBackoffApplied(dimensions: AuthBackoffEventDimensions): void {
  trackAppEvent({
    name: 'auth.backoff_applied',
    properties: {
      route: dimensions.route,
      ip_hash: dimensions.ipHash ?? undefined,
      user_id_present: dimensions.userIdPresent ? 'true' : 'false',
    },
  });
}

export function trackAuthBackoffSeconds(
  seconds: number,
  route: string,
  policy: string,
  scope: string
): void {
  trackAppMetric({
    name: 'auth.backoff_seconds',
    value: seconds,
    properties: {
      route,
      policy,
      scope,
    },
  });
}
