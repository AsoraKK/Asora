import type { HttpRequest } from '@azure/functions';
import {
  ChaosScenario,
  getChaosContext,
  isChaosAvailable,
  getChaosConfigSummary,
} from '@shared/chaos/chaosConfig';

const fakeRequest = (headers: Record<string, string | undefined> = {}): HttpRequest => ({
  headers: {
    get: (key: string) => {
      const normalized = key.toLowerCase();
      return headers[normalized];
    },
  },
} as unknown as HttpRequest);

describe('chaosConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset to non-production by default
    delete process.env.NODE_ENV;
    delete process.env.ENVIRONMENT;
    delete process.env.AZURE_FUNCTIONS_ENVIRONMENT;
    delete process.env.CHAOS_ENABLED;
    delete process.env.CHAOS_DEFAULT_SCENARIO;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv.NODE_ENV;
    process.env.ENVIRONMENT = originalEnv.ENVIRONMENT;
    process.env.AZURE_FUNCTIONS_ENVIRONMENT = originalEnv.AZURE_FUNCTIONS_ENVIRONMENT;
    process.env.CHAOS_ENABLED = originalEnv.CHAOS_ENABLED;
    process.env.CHAOS_DEFAULT_SCENARIO = originalEnv.CHAOS_DEFAULT_SCENARIO;
  });

  describe('production safety', () => {
    it.each([
      ['NODE_ENV', 'production'],
      ['NODE_ENV', 'prod'],
      ['ENVIRONMENT', 'production'],
      ['ENVIRONMENT', 'prod'],
      ['AZURE_FUNCTIONS_ENVIRONMENT', 'production'],
      ['AZURE_FUNCTIONS_ENVIRONMENT', 'prod'],
    ])('blocks chaos when %s=%s', (envVar, envValue) => {
      process.env[envVar] = envValue;
      process.env.CHAOS_ENABLED = 'true';

      const ctx = getChaosContext(
        fakeRequest({
          'x-asora-chaos-enabled': 'true',
          'x-asora-chaos-scenario': ChaosScenario.HiveTimeout,
        })
      );

      expect(ctx.enabled).toBe(false);
      expect(ctx.blockedReason).toBe('production_environment');
      expect(ctx.scenario).toBeUndefined();
    });

    it('allows chaos in development environment', () => {
      process.env.NODE_ENV = 'development';
      process.env.CHAOS_ENABLED = 'true';

      const ctx = getChaosContext(
        fakeRequest({
          'x-asora-chaos-enabled': 'true',
          'x-asora-chaos-scenario': ChaosScenario.HiveTimeout,
        })
      );

      expect(ctx.enabled).toBe(true);
      expect(ctx.scenario).toBe(ChaosScenario.HiveTimeout);
    });

    it('allows chaos in test environment', () => {
      process.env.NODE_ENV = 'test';
      process.env.CHAOS_ENABLED = 'true';

      const ctx = getChaosContext(
        fakeRequest({
          'x-asora-chaos-enabled': 'true',
          'x-asora-chaos-scenario': ChaosScenario.CosmosReadErrors,
        })
      );

      expect(ctx.enabled).toBe(true);
      expect(ctx.scenario).toBe(ChaosScenario.CosmosReadErrors);
    });
  });

  describe('feature flag', () => {
    it('remains disabled when CHAOS_ENABLED is unset', () => {
      delete process.env.CHAOS_ENABLED;
      const ctx = getChaosContext(
        fakeRequest({
          'x-asora-chaos-enabled': 'true',
          'x-asora-chaos-scenario': ChaosScenario.HiveTimeout,
        })
      );
      expect(ctx.enabled).toBe(false);
      expect(ctx.blockedReason).toBe('feature_flag_disabled');
      expect(ctx.scenario).toBeUndefined();
    });

    it('remains disabled when CHAOS_ENABLED=false', () => {
      process.env.CHAOS_ENABLED = 'false';
      const ctx = getChaosContext(
        fakeRequest({
          'x-asora-chaos-enabled': 'true',
          'x-asora-chaos-scenario': ChaosScenario.HiveTimeout,
        })
      );
      expect(ctx.enabled).toBe(false);
      expect(ctx.blockedReason).toBe('feature_flag_disabled');
    });
  });

  describe('request headers', () => {
    it('requires chaos headers even when CHAOS_ENABLED=true', () => {
      process.env.CHAOS_ENABLED = 'true';
      const ctx = getChaosContext(fakeRequest());
      expect(ctx.enabled).toBe(false);
      expect(ctx.blockedReason).toBe('header_not_set');
      expect(ctx.scenario).toBeUndefined();
    });

    it('disables invalid scenario names', () => {
      process.env.CHAOS_ENABLED = 'true';
      const ctx = getChaosContext(
        fakeRequest({
          'x-asora-chaos-enabled': 'yes',
          'x-asora-chaos-scenario': 'unknown_scenario',
        })
      );
      expect(ctx.enabled).toBe(false);
      expect(ctx.blockedReason).toBe('no_valid_scenario');
      expect(ctx.scenario).toBeUndefined();
    });

    it('uses headers to deliver a valid chaos context', () => {
      process.env.CHAOS_ENABLED = 'true';
      const ctx = getChaosContext(
        fakeRequest({
          'x-asora-chaos-enabled': '1',
          'x-asora-chaos-scenario': ChaosScenario.CosmosReadErrors,
        })
      );
      expect(ctx.enabled).toBe(true);
      expect(ctx.scenario).toBe(ChaosScenario.CosmosReadErrors);
    });

    it('falls back to CHAOS_DEFAULT_SCENARIO when header missing', () => {
      process.env.CHAOS_ENABLED = 'true';
      process.env.CHAOS_DEFAULT_SCENARIO = ChaosScenario.Hive5xx;
      const ctx = getChaosContext(
        fakeRequest({
          'x-asora-chaos-enabled': 'true',
        })
      );
      expect(ctx.enabled).toBe(true);
      expect(ctx.scenario).toBe(ChaosScenario.Hive5xx);
    });
  });
});

describe('isChaosAvailable', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.ENVIRONMENT;
    delete process.env.CHAOS_ENABLED;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv.NODE_ENV;
    process.env.ENVIRONMENT = originalEnv.ENVIRONMENT;
    process.env.CHAOS_ENABLED = originalEnv.CHAOS_ENABLED;
  });

  it('returns unavailable in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.CHAOS_ENABLED = 'true';

    const result = isChaosAvailable();
    expect(result.available).toBe(false);
    expect(result.reason).toBe('production_environment');
  });

  it('returns unavailable when feature flag is off', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.CHAOS_ENABLED;

    const result = isChaosAvailable();
    expect(result.available).toBe(false);
    expect(result.reason).toBe('feature_flag_disabled');
  });

  it('returns available when enabled in non-production', () => {
    process.env.NODE_ENV = 'development';
    process.env.CHAOS_ENABLED = 'true';

    const result = isChaosAvailable();
    expect(result.available).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});

describe('getChaosConfigSummary', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.CHAOS_ENABLED;
    delete process.env.CHAOS_DEFAULT_SCENARIO;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv.NODE_ENV;
    process.env.CHAOS_ENABLED = originalEnv.CHAOS_ENABLED;
    process.env.CHAOS_DEFAULT_SCENARIO = originalEnv.CHAOS_DEFAULT_SCENARIO;
  });

  it('returns configuration summary', () => {
    process.env.NODE_ENV = 'development';
    process.env.CHAOS_ENABLED = 'true';
    process.env.CHAOS_DEFAULT_SCENARIO = ChaosScenario.HiveTimeout;

    const summary = getChaosConfigSummary();

    expect(summary.featureEnabled).toBe(true);
    expect(summary.isProduction).toBe(false);
    expect(summary.defaultScenario).toBe(ChaosScenario.HiveTimeout);
    expect(summary.availableScenarios).toEqual(Object.values(ChaosScenario));
  });

  it('detects production environment', () => {
    process.env.NODE_ENV = 'production';

    const summary = getChaosConfigSummary();
    expect(summary.isProduction).toBe(true);
  });
});
