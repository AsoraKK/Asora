import { InvocationContext } from '@azure/functions';
import { getOpsMetrics } from '../../src/admin/routes/ops_metrics.function';
import { buildOpsMetrics } from '../../src/admin/service/opsMetricsService';
import { httpReqMock } from '../helpers/http';
import { configService } from '../../shared/configService';
import { getFcmConfigStatus } from '../../src/notifications/clients/fcmClient';
import { getNotificationsDegradationStatus } from '../../src/notifications/shared/errorHandler';

jest.mock('../../src/admin/adminAuthUtils', () => ({
  requireActiveModerator: jest.fn((handler) => handler),
}));

jest.mock('@shared/clients/cosmos', () => ({
  getTargetDatabase: jest.fn(),
  getCosmosDatabase: jest.fn(),
}));

jest.mock('../../shared/configService', () => ({
  configService: {
    getHealthSummary: jest.fn(),
  },
}));

jest.mock('../../src/notifications/clients/fcmClient', () => ({
  getFcmConfigStatus: jest.fn(),
}));

jest.mock('../../src/notifications/shared/errorHandler', () => ({
  getNotificationsDegradationStatus: jest.fn(),
}));

const { getTargetDatabase, getCosmosDatabase } = jest.requireMock('@shared/clients/cosmos') as {
  getTargetDatabase: jest.Mock;
  getCosmosDatabase: jest.Mock;
};

let flagTrendRows: Array<{ createdAt: string }>;
let appealTrendRows: Array<{ createdAt: string }>;
let openFlagsCount: number;
let pendingAppealsCount: number;
let audit24hCount: number;
let failFlagTrend = false;
let failAppealTrend = false;
let lastAuditQueryText = '';

const contextStub = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as InvocationContext;

function makeContainerQuery(fetcher: (queryText: string) => Promise<{ resources: unknown[] }>) {
  return jest.fn((spec: { query: string }) => ({
    fetchAll: () => fetcher(spec.query),
  }));
}

describe('ops metrics routes/service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-01T12:34:00.000Z'));

    flagTrendRows = [];
    appealTrendRows = [];
    openFlagsCount = 0;
    pendingAppealsCount = 0;
    audit24hCount = 0;
    failFlagTrend = false;
    failAppealTrend = false;
    lastAuditQueryText = '';

    const flagsQuery = makeContainerQuery(async (queryText) => {
      if (queryText.includes('COUNT(1)')) {
        return { resources: [openFlagsCount] };
      }
      if (failFlagTrend) {
        throw new Error('flags boom');
      }
      return { resources: flagTrendRows };
    });

    const appealsQuery = makeContainerQuery(async (queryText) => {
      if (queryText.includes('COUNT(1)')) {
        return { resources: [pendingAppealsCount] };
      }
      if (failAppealTrend) {
        throw new Error('appeals boom');
      }
      return { resources: appealTrendRows };
    });

    const auditQuery = makeContainerQuery(async () => ({ resources: [audit24hCount] }));
    const wrappedAuditQuery = jest.fn((spec: { query: string }) => {
      lastAuditQueryText = spec.query;
      return auditQuery(spec);
    });

    getTargetDatabase.mockReturnValue({
      flags: { items: { query: flagsQuery } },
      appeals: { items: { query: appealsQuery } },
    });
    getCosmosDatabase.mockReturnValue({
      container: jest.fn(() => ({
        items: { query: wrappedAuditQuery },
      })),
    });

    (configService.getHealthSummary as jest.Mock).mockReturnValue({
      cosmos: { configured: true },
    });
    (getFcmConfigStatus as jest.Mock).mockReturnValue({ configured: true });
    (getNotificationsDegradationStatus as jest.Mock).mockReturnValue({
      degraded: false,
      lastErrorCode: null,
      recentErrorCount: 0,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('rejects invalid window on route handler', async () => {
    const req = httpReqMock({
      method: 'GET',
      query: { window: '30d' },
    });

    const response = await getOpsMetrics(req as any, contextStub);
    expect(response.status).toBe(400);
  });

  it('returns zero-filled 24h buckets when no trend data exists', async () => {
    const metrics = await buildOpsMetrics('24h', contextStub);
    expect(metrics.trends.flags).toHaveLength(24);
    expect(metrics.trends.appeals).toHaveLength(24);
    expect(metrics.trends.flags.every((point) => point.count === 0)).toBe(true);
    expect(metrics.partial).toBe(false);
  });

  it('aligns 24h buckets in UTC with non-zero oldest bucket', async () => {
    flagTrendRows = [
      { createdAt: '2026-02-28T13:00:00.000Z' },
      { createdAt: '2026-03-01T12:00:00.000Z' },
    ];
    appealTrendRows = [{ createdAt: '2026-03-01T12:00:00.000Z' }];

    const metrics = await buildOpsMetrics('24h', contextStub);
    expect(metrics.trends.flags[0].t).toBe('2026-02-28T13:00:00.000Z');
    expect(metrics.trends.flags[0].count).toBe(1);
    expect(metrics.trends.flags[metrics.trends.flags.length - 1].count).toBe(1);
    expect(metrics.trends.appeals[metrics.trends.appeals.length - 1].count).toBe(1);
  });

  it('returns 7d buckets and detects incident when health probe fails', async () => {
    (configService.getHealthSummary as jest.Mock).mockImplementation(() => {
      throw new Error('health exploded');
    });

    const metrics = await buildOpsMetrics('7d', contextStub);
    expect(metrics.trends.flags).toHaveLength(7);
    expect(metrics.trends.bucketSeconds).toBe(86400);
    expect(metrics.incident.severity).toBe('incident');
    expect(metrics.incident.healthStatus).toBe('error');
  });

  it('marks payload partial when one trend source fails', async () => {
    failFlagTrend = true;
    openFlagsCount = 7;
    pendingAppealsCount = 2;
    audit24hCount = 10;

    const metrics = await buildOpsMetrics('24h', contextStub);
    expect(metrics.partial).toBe(true);
    expect(metrics.errors.some((entry) => entry.code === 'flags_trend_unavailable')).toBe(true);
    expect(metrics.queues.openFlags).toBe(7);
    expect(metrics.queues.pendingAppeals).toBe(2);
  });

  it('route responds with success envelope and no-store cache header', async () => {
    openFlagsCount = 11;
    pendingAppealsCount = 5;
    audit24hCount = 27;

    const req = httpReqMock({
      method: 'GET',
      query: { window: '24h' },
    });

    const response = await getOpsMetrics(req as any, contextStub);
    expect(response.status).toBe(200);
    expect((response.headers as Record<string, string>)['Cache-Control']).toBe('private, no-store');

    const body = JSON.parse(response.body as string);
    expect(body.success).toBe(true);
    expect(body.data.schemaVersion).toBe(1);
    expect(body.data.queues.openFlags).toBe(11);
  });

  it('uses actorType-aware audit24h filtering with legacy fallback', async () => {
    await buildOpsMetrics('24h', contextStub);
    expect(lastAuditQueryText).toContain('IS_DEFINED(c.actorType)');
    expect(lastAuditQueryText).toContain("LOWER(c.actorType) = 'human'");
    expect(lastAuditQueryText).toContain('NOT IS_DEFINED(c.actorType)');
    expect(lastAuditQueryText).toContain('c.actorId != @systemActor');
  });
});
