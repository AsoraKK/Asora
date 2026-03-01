import type { InvocationContext } from '@azure/functions';
import { getCosmosDatabase, getTargetDatabase } from '@shared/clients/cosmos';
import { trackAppEvent, trackAppMetric } from '@shared/appInsights';
import { getFcmConfigStatus } from '../../notifications/clients/fcmClient';
import { getNotificationsDegradationStatus } from '../../notifications/shared/errorHandler';
import { configService } from '../../../shared/configService';

export type OpsMetricsWindow = '24h' | '7d';
type HealthStatus = 'healthy' | 'degraded' | 'error';
type ReadinessStatus = 'ready' | 'degraded' | 'not_ready';
type IncidentSeverity = 'normal' | 'degraded' | 'incident';

interface TimeBucket {
  t: string;
  count: number;
}

interface WindowConfig {
  bucketMs: number;
  bucketCount: number;
}

interface QueryError {
  code: string;
  message: string;
}

export interface OpsMetricsData {
  schemaVersion: number;
  partial: boolean;
  incident: {
    severity: IncidentSeverity;
    healthStatus: HealthStatus;
    readinessStatus: ReadinessStatus;
    severityReasons: string[];
    generatedAt: string;
  };
  queues: {
    openFlags: number;
    pendingAppeals: number;
    audit24h: number;
  };
  trends: {
    window: OpsMetricsWindow;
    bucketSeconds: number;
    flags: TimeBucket[];
    appeals: TimeBucket[];
  };
  signals: {
    flagsDeltaBuckets: number;
    appealsDeltaBuckets: number;
  };
  errors: QueryError[];
}

const WINDOW_CONFIG: Record<OpsMetricsWindow, WindowConfig> = {
  '24h': { bucketMs: 60 * 60 * 1000, bucketCount: 24 },
  '7d': { bucketMs: 24 * 60 * 60 * 1000, bucketCount: 7 },
};

const DEFAULT_QUERY_TIMEOUT_MS = 1200;

export function isValidOpsWindow(value: string | null | undefined): value is OpsMetricsWindow {
  return value === '24h' || value === '7d';
}

function floorToBucket(timestampMs: number, bucketMs: number): number {
  return Math.floor(timestampMs / bucketMs) * bucketMs;
}

function buildEmptyBuckets(window: OpsMetricsWindow, nowMs: number): TimeBucket[] {
  const config = WINDOW_CONFIG[window];
  const endAligned = floorToBucket(nowMs, config.bucketMs);
  const start = endAligned - config.bucketMs * (config.bucketCount - 1);
  return Array.from({ length: config.bucketCount }, (_, index) => ({
    t: new Date(start + index * config.bucketMs).toISOString(),
    count: 0,
  }));
}

function toBucketedCounts(
  timestamps: Array<string | undefined>,
  window: OpsMetricsWindow,
  nowMs: number
): TimeBucket[] {
  const config = WINDOW_CONFIG[window];
  const buckets = buildEmptyBuckets(window, nowMs);
  if (buckets.length === 0) {
    return buckets;
  }
  const startMs = Date.parse(buckets[0]!.t);
  const endMsExclusive = startMs + config.bucketCount * config.bucketMs;

  for (const timestamp of timestamps) {
    if (!timestamp) {
      continue;
    }
    const valueMs = Date.parse(timestamp);
    if (!Number.isFinite(valueMs) || valueMs < startMs || valueMs >= endMsExclusive) {
      continue;
    }
    const offset = valueMs - startMs;
    const index = Math.floor(offset / config.bucketMs);
    if (index < 0 || index >= buckets.length) {
      continue;
    }
    const bucket = buckets[index];
    if (!bucket) {
      continue;
    }
    bucket.count += 1;
  }

  return buckets;
}

function calcLastBucketDelta(buckets: TimeBucket[]): number {
  if (buckets.length < 2) {
    return 0;
  }
  const last = buckets[buckets.length - 1]?.count ?? 0;
  const prev = buckets[buckets.length - 2]?.count ?? 0;
  return last - prev;
}

function getIncidentSnapshot(): {
  severity: IncidentSeverity;
  healthStatus: HealthStatus;
  readinessStatus: ReadinessStatus;
  severityReasons: string[];
} {
  const reasons: string[] = [];

  let healthStatus: HealthStatus = 'healthy';
  let readinessStatus: ReadinessStatus = 'ready';

  try {
    const summary = configService.getHealthSummary();
    const cosmosInfo = summary.cosmos as { configured?: boolean };
    const cosmosConfigured = Boolean(cosmosInfo?.configured);
    const fcmStatus = getFcmConfigStatus();
    const notificationsDegradation = getNotificationsDegradationStatus();

    if (!cosmosConfigured) {
      healthStatus = 'degraded';
      readinessStatus = 'not_ready';
      reasons.push('cosmos_not_configured');
    }

    if (!fcmStatus.configured) {
      healthStatus = healthStatus === 'healthy' ? 'degraded' : healthStatus;
      reasons.push('fcm_not_configured');
    }

    if (notificationsDegradation.degraded) {
      healthStatus = healthStatus === 'healthy' ? 'degraded' : healthStatus;
      reasons.push('notifications_degraded');
    }
  } catch (error) {
    healthStatus = 'error';
    readinessStatus = 'degraded';
    reasons.push('health_probe_failed');
  }

  let severity: IncidentSeverity = 'normal';
  if (healthStatus === 'error' || readinessStatus === 'not_ready') {
    severity = 'incident';
  } else if (healthStatus === 'degraded' || readinessStatus === 'degraded') {
    severity = 'degraded';
  }

  return {
    severity,
    healthStatus,
    readinessStatus,
    severityReasons: reasons,
  };
}

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout | null = null;

  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function queryFlagTimestamps(startIso: string, timeoutMs: number): Promise<string[]> {
  const db = getTargetDatabase();
  const result = await withTimeout(
    db.flags.items
      .query(
        {
          query: `
            SELECT c.createdAt
            FROM c
            WHERE IS_DEFINED(c.createdAt) AND c.createdAt >= @start
          `,
          parameters: [{ name: '@start', value: startIso }],
        },
        { maxItemCount: 1000 }
      )
      .fetchAll(),
    timeoutMs,
    'flags trend query timed out'
  );

  return result.resources
    .map((item) => (typeof item.createdAt === 'string' ? item.createdAt : undefined))
    .filter((value): value is string => Boolean(value));
}

async function queryAppealTimestamps(startIso: string, timeoutMs: number): Promise<string[]> {
  const db = getTargetDatabase();
  const result = await withTimeout(
    db.appeals.items
      .query(
        {
          query: `
            SELECT c.createdAt
            FROM c
            WHERE IS_DEFINED(c.createdAt) AND c.createdAt >= @start
          `,
          parameters: [{ name: '@start', value: startIso }],
        },
        { maxItemCount: 1000 }
      )
      .fetchAll(),
    timeoutMs,
    'appeals trend query timed out'
  );

  return result.resources
    .map((item) => (typeof item.createdAt === 'string' ? item.createdAt : undefined))
    .filter((value): value is string => Boolean(value));
}

async function queryOpenFlagsCount(timeoutMs: number): Promise<number> {
  const db = getTargetDatabase();
  const result = await withTimeout(
    db.flags.items
      .query({
        query: 'SELECT VALUE COUNT(1) FROM c WHERE c.status = @status',
        parameters: [{ name: '@status', value: 'active' }],
      })
      .fetchAll(),
    timeoutMs,
    'open flags count query timed out'
  );
  return Number(result.resources[0] ?? 0);
}

async function queryPendingAppealsCount(timeoutMs: number): Promise<number> {
  const db = getTargetDatabase();
  const result = await withTimeout(
    db.appeals.items
      .query({
        query: 'SELECT VALUE COUNT(1) FROM c WHERE c.status = @status',
        parameters: [{ name: '@status', value: 'pending' }],
      })
      .fetchAll(),
    timeoutMs,
    'pending appeals count query timed out'
  );
  return Number(result.resources[0] ?? 0);
}

async function queryAudit24hCount(cutoffIso: string, timeoutMs: number): Promise<number> {
  const database = getCosmosDatabase();
  const auditLogs = database.container('audit_logs');
  const result = await withTimeout(
    auditLogs.items
      .query({
        query: `
          SELECT VALUE COUNT(1)
          FROM c
          WHERE IS_DEFINED(c.timestamp)
            AND c.timestamp >= @cutoff
            AND (
              (
                IS_DEFINED(c.actorType)
                AND (
                  LOWER(c.actorType) = 'human'
                  OR LOWER(c.actorType) = 'admin'
                  OR LOWER(c.actorType) = 'moderator'
                  OR LOWER(c.actorType) = 'operator'
                )
              )
              OR (
                NOT IS_DEFINED(c.actorType)
                AND IS_DEFINED(c.actorId)
                AND c.actorId != @systemActor
              )
            )
        `,
        parameters: [
          { name: '@cutoff', value: cutoffIso },
          { name: '@systemActor', value: 'system' },
        ],
      })
      .fetchAll(),
    timeoutMs,
    'audit24h count query timed out'
  );
  return Number(result.resources[0] ?? 0);
}

function toQueryError(code: string, error: unknown): QueryError {
  const message = error instanceof Error ? error.message : String(error);
  return { code, message };
}

export async function buildOpsMetrics(
  window: OpsMetricsWindow,
  context: InvocationContext,
  timeoutMs = DEFAULT_QUERY_TIMEOUT_MS
): Promise<OpsMetricsData> {
  const startedAt = Date.now();
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const windowConfig = WINDOW_CONFIG[window];
  const rangeStartMs = floorToBucket(nowMs, windowConfig.bucketMs) - windowConfig.bucketMs * (windowConfig.bucketCount - 1);
  const rangeStartIso = new Date(rangeStartMs).toISOString();
  const auditCutoffIso = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();

  const incident = getIncidentSnapshot();
  const errors: QueryError[] = [];

  const [
    flagsTrendResult,
    appealsTrendResult,
    openFlagsCountResult,
    pendingAppealsCountResult,
    audit24hCountResult,
  ] = await Promise.allSettled([
    queryFlagTimestamps(rangeStartIso, timeoutMs),
    queryAppealTimestamps(rangeStartIso, timeoutMs),
    queryOpenFlagsCount(timeoutMs),
    queryPendingAppealsCount(timeoutMs),
    queryAudit24hCount(auditCutoffIso, timeoutMs),
  ]);

  let flagsBuckets = buildEmptyBuckets(window, nowMs);
  if (flagsTrendResult.status === 'fulfilled') {
    flagsBuckets = toBucketedCounts(flagsTrendResult.value, window, nowMs);
  } else {
    errors.push(toQueryError('flags_trend_unavailable', flagsTrendResult.reason));
  }

  let appealsBuckets = buildEmptyBuckets(window, nowMs);
  if (appealsTrendResult.status === 'fulfilled') {
    appealsBuckets = toBucketedCounts(appealsTrendResult.value, window, nowMs);
  } else {
    errors.push(toQueryError('appeals_trend_unavailable', appealsTrendResult.reason));
  }

  let openFlags = 0;
  if (openFlagsCountResult.status === 'fulfilled') {
    openFlags = openFlagsCountResult.value;
  } else {
    errors.push(toQueryError('open_flags_unavailable', openFlagsCountResult.reason));
  }

  let pendingAppeals = 0;
  if (pendingAppealsCountResult.status === 'fulfilled') {
    pendingAppeals = pendingAppealsCountResult.value;
  } else {
    errors.push(toQueryError('pending_appeals_unavailable', pendingAppealsCountResult.reason));
  }

  let audit24h = 0;
  if (audit24hCountResult.status === 'fulfilled') {
    audit24h = audit24hCountResult.value;
  } else {
    errors.push(toQueryError('audit24h_unavailable', audit24hCountResult.reason));
  }

  const partial = errors.length > 0;
  const durationMs = Date.now() - startedAt;

  context.log('admin.ops.metrics.computed', {
    window,
    durationMs,
    partial,
    severity: incident.severity,
    errorCount: errors.length,
  });

  trackAppMetric({
    name: 'admin_ops_metrics_duration_ms',
    value: durationMs,
    properties: {
      window,
      partial,
      severity: incident.severity,
      errorCount: errors.length,
    },
  });

  if (errors.length > 0) {
    trackAppEvent({
      name: 'admin_ops_metrics_partial',
      properties: {
        window,
        errorCodes: errors.map((entry) => entry.code).join(','),
      },
    });
  }

  return {
    schemaVersion: 1,
    partial,
    incident: {
      severity: incident.severity,
      healthStatus: incident.healthStatus,
      readinessStatus: incident.readinessStatus,
      severityReasons: incident.severityReasons,
      generatedAt: nowIso,
    },
    queues: {
      openFlags,
      pendingAppeals,
      audit24h,
    },
    trends: {
      window,
      bucketSeconds: Math.floor(windowConfig.bucketMs / 1000),
      flags: flagsBuckets,
      appeals: appealsBuckets,
    },
    signals: {
      flagsDeltaBuckets: calcLastBucketDelta(flagsBuckets),
      appealsDeltaBuckets: calcLastBucketDelta(appealsBuckets),
    },
    errors,
  };
}
