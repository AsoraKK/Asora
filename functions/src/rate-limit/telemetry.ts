import type { TelemetryClient } from 'applicationinsights';
import appInsights from 'applicationinsights';

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

let telemetryClient: TelemetryClient | null | undefined;

function shouldEnableTelemetry(): boolean {
  if (process.env.NODE_ENV === 'test') {
    return false;
  }

  if ((process.env.RATE_LIMITS_ENABLED ?? 'true').toLowerCase() === 'false') {
    return false;
  }

  return Boolean(
    process.env.APPLICATIONINSIGHTS_CONNECTION_STRING || process.env.APPINSIGHTS_INSTRUMENTATIONKEY
  );
}

function getTelemetryClient(): TelemetryClient | null {
  if (typeof telemetryClient !== 'undefined') {
    return telemetryClient;
  }

  if (!shouldEnableTelemetry()) {
    telemetryClient = null;
    return telemetryClient;
  }

  try {
    if (!appInsights.defaultClient) {
      appInsights
        .setup()
        .setAutoCollectConsole(false)
        .setAutoCollectDependencies(false)
        .setAutoCollectPerformance(false)
        .setAutoCollectRequests(false)
        .setAutoCollectExceptions(false)
        .setSendLiveMetrics(false)
        .start();
    }

    telemetryClient = appInsights.defaultClient ?? null;
  } catch (error) {
    telemetryClient = null;
  }

  return telemetryClient;
}

function trackRateLimitMetric(kind: RateLimitMetricKind, dimensions: RateLimitMetricDimensions): void {
  const client = getTelemetryClient();
  if (!client) {
    return;
  }

  client.trackMetric({
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
  const client = getTelemetryClient();
  if (!client) {
    return;
  }

  client.trackEvent({
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
  const client = getTelemetryClient();
  if (!client) {
    return;
  }

  client.trackMetric({
    name: 'auth.backoff_seconds',
    value: seconds,
    properties: {
      route,
      policy,
      scope,
    },
  });
}
