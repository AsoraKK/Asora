import type { TelemetryClient } from 'applicationinsights';
import appInsights from 'applicationinsights';

const INSTRUMENTATION_CONNECTION_STRING =
  process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ?? process.env.APPINSIGHTS_INSTRUMENTATIONKEY;

let telemetryClient: TelemetryClient | null | undefined;

function shouldEnableTelemetry(): boolean {
  if (process.env.NODE_ENV === 'test') {
    return false;
  }

  return Boolean(INSTRUMENTATION_CONNECTION_STRING);
}

function ensureClient(): TelemetryClient | null {
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
        .setup(INSTRUMENTATION_CONNECTION_STRING!)
        .setAutoCollectConsole(true)
        .setAutoCollectDependencies(true)
        .setAutoCollectPerformance(true, true)
        .setAutoCollectRequests(true)
        .setAutoCollectExceptions(true)
        .setSendLiveMetrics(true)
        .start();
    }

    telemetryClient = appInsights.defaultClient ?? null;
  } catch (error) {
    telemetryClient = null;
  }

  return telemetryClient;
}

export interface AppMetric {
  name: string;
  value: number;
  properties?: Record<string, string | number | boolean | undefined>;
}

export interface AppEvent {
  name: string;
  properties?: Record<string, string | number | boolean | undefined>;
}

function normalizeProperties(
  props?: Record<string, string | number | boolean | undefined>
): Record<string, string> | undefined {
  if (!props) {
    return undefined;
  }

  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) {
      continue;
    }
    normalized[key] = String(value);
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function trackAppMetric(metric: AppMetric): void {
  const client = ensureClient();
  if (!client) {
    return;
  }

  client.trackMetric({
    name: metric.name,
    value: metric.value,
    properties: normalizeProperties(metric.properties),
  });
}

export function trackAppEvent(event: AppEvent): void {
  const client = ensureClient();
  if (!client) {
    return;
  }

  client.trackEvent({
    name: event.name,
    properties: normalizeProperties(event.properties),
  });
}

/**
 * Track an exception in Application Insights.
 */
export function trackException(error: Error, properties?: Record<string, string | number | boolean | undefined>): void {
  const client = ensureClient();
  if (!client) {
    return;
  }

  client.trackException({
    exception: error,
    properties: normalizeProperties(properties),
  });
}

/**
 * Track outbound dependency calls (Cosmos, Redis, external HTTP).
 */
export function trackDependency(opts: {
  dependencyTypeName: string;
  name: string;
  data: string;
  duration: number;
  resultCode: number;
  success: boolean;
  target?: string;
}): void {
  const client = ensureClient();
  if (!client) {
    return;
  }

  client.trackDependency({
    dependencyTypeName: opts.dependencyTypeName,
    name: opts.name,
    data: opts.data,
    duration: opts.duration,
    resultCode: opts.resultCode,
    success: opts.success,
    target: opts.target,
  });
}

/**
 * Get telemetry client for advanced usage
 */
export function getTelemetryClient(): TelemetryClient | null {
  return ensureClient();
}
