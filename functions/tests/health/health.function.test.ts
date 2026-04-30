import type { InvocationContext } from '@azure/functions';
import { httpReqMock } from '../helpers/http';

const mockGetHealthSummary = jest.fn();
const mockGetFcmConfigStatus = jest.fn();
const mockGetNotificationsDegradationStatus = jest.fn();
const mockAppHttp = jest.fn();

jest.mock('@azure/functions', () => ({
  app: {
    http: mockAppHttp,
  },
}));

jest.mock('../../shared/configService', () => ({
  configService: {
    getHealthSummary: (...args: unknown[]) => mockGetHealthSummary(...args),
  },
}));

jest.mock('../../src/notifications/clients/fcmClient', () => ({
  getFcmConfigStatus: (...args: unknown[]) => mockGetFcmConfigStatus(...args),
}));

jest.mock('../../src/notifications/shared/errorHandler', () => ({
  getNotificationsDegradationStatus: (...args: unknown[]) => mockGetNotificationsDegradationStatus(...args),
}));

function loadHealthHandler(): (req: any, ctx: InvocationContext) => Promise<any> {
  mockAppHttp.mockClear();
  jest.isolateModules(() => {
    require('../../src/health/health.function');
  });

  return mockAppHttp.mock.calls[0][1].handler;
}

function createContext(): InvocationContext {
  return {
    invocationId: 'health-test',
    log: jest.fn(),
    error: jest.fn(),
  } as unknown as InvocationContext;
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NODE_ENV = 'test';
  process.env.APP_ENV = 'local';
  process.env.WEBSITE_AUTH_ENABLED = 'false';
});

describe('health function', () => {
  it('returns safe healthy output without secrets', async () => {
    mockGetHealthSummary.mockReturnValue({
      environment: 'local',
      notifications: {
        enabled: true,
        fcmProjectId: 'demo-project',
        fcmConfigured: true,
      },
      cosmos: {
        databaseName: 'asora',
        configured: true,
      },
    });
    mockGetFcmConfigStatus.mockReturnValue({
      configured: true,
      projectId: 'demo-project',
      error: null,
    });
    mockGetNotificationsDegradationStatus.mockReturnValue({
      degraded: false,
      lastErrorCode: null,
      recentErrorCount: 0,
    });

    const handler = loadHealthHandler();
    const response = await handler(httpReqMock({ method: 'GET' }), createContext());
    const body = response.jsonBody as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.status).toBe('healthy');
    expect(body.degradations).toEqual([]);
    expect(body.auth).toMatchObject({ easyAuthEnabled: false, easyAuthMisconfigured: false });
    expect(body.notifications).toMatchObject({
      enabled: true,
      fcmConfigured: true,
      projectId: 'demo-project',
      error: null,
      degraded: false,
      lastErrorCode: null,
      recentErrorCount: 0,
    });
    expect(response.headers).toMatchObject({
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
  });

  it('returns degraded status when production-like auth is disabled', async () => {
    process.env.NODE_ENV = 'production';
    process.env.WEBSITE_AUTH_ENABLED = 'false';

    mockGetHealthSummary.mockReturnValue({
      environment: 'prod',
      notifications: {
        enabled: true,
        fcmProjectId: 'demo-project',
        fcmConfigured: true,
      },
      cosmos: {
        databaseName: 'asora',
        configured: true,
      },
    });
    mockGetFcmConfigStatus.mockReturnValue({
      configured: true,
      projectId: 'demo-project',
      error: null,
    });
    mockGetNotificationsDegradationStatus.mockReturnValue({
      degraded: false,
      lastErrorCode: null,
      recentErrorCount: 0,
    });

    const handler = loadHealthHandler();
    const response = await handler(httpReqMock({ method: 'GET' }), createContext());
    const body = response.jsonBody as Record<string, unknown>;

    expect(response.status).toBe(503);
    expect(body.status).toBe('degraded');
    expect(body.degradations).toContain('easyauth_not_enabled');
  });

  it('does not leak exception messages in the error response', async () => {
    mockGetHealthSummary.mockImplementation(() => {
      throw new Error('secret=top-secret-token');
    });

    const handler = loadHealthHandler();
    const response = await handler(httpReqMock({ method: 'GET' }), createContext());
    const body = response.jsonBody as Record<string, unknown>;

    expect(response.status).toBe(503);
    expect(body.status).toBe('error');
    expect(String(body.error)).toBe('Health check failed');
    expect(String(body.error)).not.toContain('top-secret-token');
  });
});