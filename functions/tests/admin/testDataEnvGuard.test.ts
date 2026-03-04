/**
 * Production environment guard tests for test data endpoints
 *
 * Covers:
 *  - admin_test_data_purge returns 403 in production
 *  - test_data_cleanup timer skips in production
 */
import type { InvocationContext, Timer } from '@azure/functions';

// ── Mock shared dependencies ───────────────────────────────────────────
jest.mock('@shared/clients/cosmos', () => ({
  getCosmosClient: jest.fn(() => ({
    database: () => ({
      container: () => ({
        item: jest.fn().mockReturnValue({ read: jest.fn() }),
        items: {
          query: jest.fn().mockReturnValue({ fetchAll: jest.fn().mockResolvedValue({ resources: [] }) }),
          create: jest.fn(),
        },
      }),
    }),
  })),
  getTargetDatabase: jest.fn(() => ({
    posts: {
      items: {
        query: jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
        }),
      },
    },
  })),
}));

jest.mock('@shared/appInsights', () => ({
  trackAppEvent: jest.fn(),
  trackAppMetric: jest.fn(),
}));

jest.mock('@shared/utils/logger', () => ({
  getAzureLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock Azure Functions app registration to prevent side effects
jest.mock('@azure/functions', () => ({
  app: {
    http: jest.fn(),
    timer: jest.fn(),
  },
}));

jest.mock('@shared/http/handler', () => ({
  httpHandler: jest.fn((fn: any) => fn),
}));

jest.mock('@shared/http/authContext', () => ({
  extractAuthContext: jest.fn().mockResolvedValue({
    userId: 'admin-1',
    roles: ['admin'],
  }),
}));

jest.mock('@shared/testMode/testModeContext', () => ({
  TEST_DATA_EXPIRY: 24 * 60 * 60 * 1000,
}));

const contextStub = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  invocationId: 'env-guard-test-1',
} as unknown as InvocationContext;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NODE_ENV = 'test';
  process.env.COSMOS_CONNECTION_STRING = 'mock';
  process.env.COSMOS_DATABASE_NAME = 'asora';
});

// ═══════════════════════════════════════════════════════════════════════
// 1. admin_test_data_purge — production guard
// ═══════════════════════════════════════════════════════════════════════
describe('admin_test_data_purge — env guard', () => {
  it('returns 403 PRODUCTION_BLOCKED in production', async () => {
    process.env.NODE_ENV = 'production';

    // Import handler (httpHandler is mocked to pass through)
    const { admin_test_data_purge } = require('../../src/admin/admin_test_data_purge.function');

    // httpHandler mock passes the raw async fn — call it with a mock ctx
    const ctx = {
      context: contextStub,
      correlationId: 'test-corr-1',
      body: { purgeExpired: true },
      forbidden: jest.fn().mockReturnValue({ status: 403, body: 'PRODUCTION_BLOCKED' }),
      ok: jest.fn(),
    };

    const result = await admin_test_data_purge(ctx as any);

    expect(ctx.forbidden).toHaveBeenCalledWith(
      'Test data purge is not available in production',
      'PRODUCTION_BLOCKED'
    );
    expect(result).toEqual({ status: 403, body: 'PRODUCTION_BLOCKED' });
  });

  it('proceeds past env guard in development', async () => {
    process.env.NODE_ENV = 'development';

    // Re-import to pick up new NODE_ENV
    jest.resetModules();

    // Re-apply mocks after resetModules
    jest.mock('@shared/clients/cosmos', () => ({
      getCosmosClient: jest.fn(() => ({
        database: () => ({ container: () => ({}) }),
      })),
      getTargetDatabase: jest.fn(() => ({
        posts: {
          items: {
            query: jest.fn().mockReturnValue({
              fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
            }),
          },
        },
      })),
    }));
    jest.mock('@shared/appInsights', () => ({
      trackAppEvent: jest.fn(),
      trackAppMetric: jest.fn(),
    }));
    jest.mock('@shared/utils/logger', () => ({
      getAzureLogger: jest.fn(() => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      })),
    }));
    jest.mock('@azure/functions', () => ({
      app: { http: jest.fn(), timer: jest.fn() },
    }));
    jest.mock('@shared/http/handler', () => ({
      httpHandler: jest.fn((fn: any) => fn),
    }));
    jest.mock('@shared/http/authContext', () => ({
      extractAuthContext: jest.fn().mockResolvedValue({
        userId: 'admin-1',
        roles: ['admin'],
      }),
    }));
    jest.mock('@shared/testMode/testModeContext', () => ({
      TEST_DATA_EXPIRY: 24 * 60 * 60 * 1000,
    }));

    const { admin_test_data_purge } = require('../../src/admin/admin_test_data_purge.function');

    const ctx = {
      context: contextStub,
      correlationId: 'test-corr-2',
      body: { purgeExpired: true },
      forbidden: jest.fn(),
      ok: jest.fn(),
      badRequest: jest.fn(),
      internalError: jest.fn(),
    };

    await admin_test_data_purge(ctx as any);

    // Should NOT hit the production guard
    expect(ctx.forbidden).not.toHaveBeenCalledWith(
      'Test data purge is not available in production',
      'PRODUCTION_BLOCKED'
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. test_data_cleanup timer — production guard
// ═══════════════════════════════════════════════════════════════════════
describe('test_data_cleanup timer — env guard', () => {
  it('skips cleanup in production and logs', async () => {
    process.env.NODE_ENV = 'production';

    // The timer handler is registered via app.timer — get the registered fn
    const { app } = require('@azure/functions');
    const timerRegisterMock = app.timer as jest.Mock;

    // Re-import to trigger timer registration
    jest.resetModules();
    jest.mock('@shared/clients/cosmos', () => ({
      getCosmosClient: jest.fn(),
      getTargetDatabase: jest.fn(() => ({
        posts: {
          items: {
            query: jest.fn().mockReturnValue({
              fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
            }),
          },
        },
      })),
    }));
    jest.mock('@shared/appInsights', () => ({
      trackAppEvent: jest.fn(),
      trackAppMetric: jest.fn(),
    }));
    jest.mock('@shared/utils/logger', () => ({
      getAzureLogger: jest.fn(() => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      })),
    }));
    jest.mock('@azure/functions', () => ({
      app: { http: jest.fn(), timer: jest.fn() },
    }));
    jest.mock('@shared/http/handler', () => ({
      httpHandler: jest.fn((fn: any) => fn),
    }));
    jest.mock('@shared/http/authContext', () => ({
      extractAuthContext: jest.fn(),
    }));
    jest.mock('@shared/testMode/testModeContext', () => ({
      TEST_DATA_EXPIRY: 24 * 60 * 60 * 1000,
    }));

    require('../../src/admin/test_data_cleanup.function');

    const { app: appMock } = require('@azure/functions');
    const timerCalls = (appMock.timer as jest.Mock).mock.calls;

    expect(timerCalls.length).toBeGreaterThan(0);

    const registration = timerCalls[0][1];
    const handler = registration.handler;

    const timer: Timer = {
      isPastDue: false,
      schedule: { adjustForDST: false },
      scheduleStatus: { last: '', next: '', lastUpdated: '' },
    };

    const logSpy = jest.fn();
    const timerContext = { log: logSpy, error: jest.fn() } as unknown as InvocationContext;

    await handler(timer, timerContext);

    // Should have logged the skip message
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping')
    );
  });
});
