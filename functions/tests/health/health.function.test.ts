import type { InvocationContext } from '@azure/functions';
import { httpReqMock } from '../helpers/http';

const mockGetHealthSummary = jest.fn();
const mockGetFcmConfigStatus = jest.fn();
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
  it('returns a minimal healthy readiness envelope', async () => {
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

    const handler = loadHealthHandler();
    const response = await handler(httpReqMock({ method: 'GET' }), createContext());
    const body = response.jsonBody as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: 'healthy',
      timestamp: expect.any(String),
      ready: true,
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

    const handler = loadHealthHandler();
    const response = await handler(httpReqMock({ method: 'GET' }), createContext());
    const body = response.jsonBody as Record<string, unknown>;

    expect(response.status).toBe(503);
    expect(body.status).toBe('degraded');
    expect(body.ready).toBe(false);
    expect(body).not.toHaveProperty('config');
    expect(body).not.toHaveProperty('auth');
    expect(body).not.toHaveProperty('notifications');
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
    expect(body.ready).toBe(false);
    expect(String(body.error)).toBe('Health check failed');
    expect(String(body.error)).not.toContain('top-secret-token');
  });
});
