/// <reference types="jest" />

// Mock applicationinsights before any imports
jest.mock('applicationinsights', () => {
  const mockClient = {
    trackMetric: jest.fn(),
    trackEvent: jest.fn(),
  };
  
  return {
    __esModule: true,
    default: {
      setup: jest.fn().mockReturnThis(),
      setAutoCollectConsole: jest.fn().mockReturnThis(),
      setAutoCollectDependencies: jest.fn().mockReturnThis(),
      setAutoCollectPerformance: jest.fn().mockReturnThis(),
      setAutoCollectRequests: jest.fn().mockReturnThis(),
      setAutoCollectExceptions: jest.fn().mockReturnThis(),
      setSendLiveMetrics: jest.fn().mockReturnThis(),
      start: jest.fn(),
      defaultClient: mockClient,
    },
    mockClient, // Export for test access
  };
});

describe('appInsights telemetry tracking', () => {
  let appInsights: typeof import('@shared/appInsights');
  let mockClient: any;
  let originalEnv: NodeJS.ProcessEnv;
  let originalNodeEnv: string | undefined;

  beforeAll(() => {
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterAll(() => {
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
  });

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.resetModules();
    jest.clearAllMocks();
    
    const ai = require('applicationinsights');
    mockClient = (ai as any).mockClient;
    mockClient.trackMetric.mockClear();
    mockClient.trackEvent.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('when NODE_ENV=test', () => {
    it('does not initialize client and silently ignores trackAppMetric', async () => {
      process.env.NODE_ENV = 'test';
      delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
      delete process.env.APPINSIGHTS_INSTRUMENTATIONKEY;

      appInsights = await import('@shared/appInsights');

      appInsights.trackAppMetric({ name: 'test_metric', value: 123 });
      // Should not throw; client is null in test mode
      expect(mockClient.trackMetric).not.toHaveBeenCalled();
    });

    it('does not initialize client and silently ignores trackAppEvent', async () => {
      process.env.NODE_ENV = 'test';
      delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
      delete process.env.APPINSIGHTS_INSTRUMENTATIONKEY;

      appInsights = await import('@shared/appInsights');

      appInsights.trackAppEvent({ name: 'test_event', properties: { foo: 'bar' } });
      expect(mockClient.trackEvent).not.toHaveBeenCalled();
    });
  });

  describe('when connection string is missing', () => {
    it('does not initialize client when both env vars are missing', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
      delete process.env.APPINSIGHTS_INSTRUMENTATIONKEY;

      appInsights = await import('@shared/appInsights');

      appInsights.trackAppMetric({ name: 'metric', value: 1 });
      appInsights.trackAppEvent({ name: 'event' });
      expect(mockClient.trackMetric).not.toHaveBeenCalled();
      expect(mockClient.trackEvent).not.toHaveBeenCalled();
    });
  });

  describe('when connection string is present', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING =
        'InstrumentationKey=fake-key;IngestionEndpoint=https://fake.applicationinsights.azure.com/';
    });

    it('initializes client and tracks metrics with properties', async () => {
      appInsights = await import('@shared/appInsights');

      appInsights.trackAppMetric({
        name: 'cosmos_ru',
        value: 5.2,
        properties: { operation: 'feed_query', status: 'success' },
      });

      expect(mockClient.trackMetric).toHaveBeenCalledWith({
        name: 'cosmos_ru',
        value: 5.2,
        properties: { operation: 'feed_query', status: 'success' },
      });
    });

    it('tracks metrics without properties', async () => {
      appInsights = await import('@shared/appInsights');

      appInsights.trackAppMetric({ name: 'simple_metric', value: 42 });

      expect(mockClient.trackMetric).toHaveBeenCalledWith({
        name: 'simple_metric',
        value: 42,
        properties: undefined,
      });
    });

    it('tracks events with properties', async () => {
      appInsights = await import('@shared/appInsights');

      appInsights.trackAppEvent({
        name: 'user_action',
        properties: { action: 'post_created', userId: 'u123', count: 5 },
      });

      expect(mockClient.trackEvent).toHaveBeenCalledWith({
        name: 'user_action',
        properties: { action: 'post_created', userId: 'u123', count: '5' },
      });
    });

    it('tracks events without properties', async () => {
      appInsights = await import('@shared/appInsights');

      appInsights.trackAppEvent({ name: 'simple_event' });

      expect(mockClient.trackEvent).toHaveBeenCalledWith({
        name: 'simple_event',
        properties: undefined,
      });
    });

    it('normalizes properties by filtering undefined values', async () => {
      appInsights = await import('@shared/appInsights');

      appInsights.trackAppMetric({
        name: 'mixed_props',
        value: 99,
        properties: {
          defined: 'value',
          undefinedValue: undefined,
          numberValue: 123,
          boolValue: true,
        },
      });

      expect(mockClient.trackMetric).toHaveBeenCalledWith({
        name: 'mixed_props',
        value: 99,
        properties: {
          defined: 'value',
          numberValue: '123',
          boolValue: 'true',
        },
      });
    });

    it('returns undefined properties when all values are undefined', async () => {
      appInsights = await import('@shared/appInsights');

      appInsights.trackAppEvent({
        name: 'all_undefined',
        properties: { a: undefined, b: undefined },
      });

      expect(mockClient.trackEvent).toHaveBeenCalledWith({
        name: 'all_undefined',
        properties: undefined,
      });
    });

    it('reuses client on subsequent calls without re-initializing', async () => {
      appInsights = await import('@shared/appInsights');

      appInsights.trackAppMetric({ name: 'first', value: 1 });
      appInsights.trackAppMetric({ name: 'second', value: 2 });
      appInsights.trackAppEvent({ name: 'first_event' });
      appInsights.trackAppEvent({ name: 'second_event' });

      // Client reused means multiple track calls succeed
      expect(mockClient.trackMetric).toHaveBeenCalledTimes(2);
      expect(mockClient.trackEvent).toHaveBeenCalledTimes(2);
    });

    it('uses APPINSIGHTS_INSTRUMENTATIONKEY as fallback connection string', async () => {
      delete process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
      process.env.APPINSIGHTS_INSTRUMENTATIONKEY = 'fallback-instrumentation-key';

      appInsights = await import('@shared/appInsights');

      appInsights.trackAppMetric({ name: 'fallback', value: 10 });

      // Verifies fallback env var works (metric tracked successfully)
      expect(mockClient.trackMetric).toHaveBeenCalled();
    });
  });
});
