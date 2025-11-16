import type { HttpRequest } from '@azure/functions';
import { ChaosScenario, getChaosContext } from '@shared/chaos/chaosConfig';

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

  afterEach(() => {
    process.env.CHAOS_ENABLED = originalEnv.CHAOS_ENABLED;
    process.env.CHAOS_DEFAULT_SCENARIO = originalEnv.CHAOS_DEFAULT_SCENARIO;
  });

  it('remains disabled when CHAOS_ENABLED is unset', () => {
    delete process.env.CHAOS_ENABLED;
    const ctx = getChaosContext(
      fakeRequest({
        'x-asora-chaos-enabled': 'true',
        'x-asora-chaos-scenario': ChaosScenario.HiveTimeout,
      })
    );
    expect(ctx.enabled).toBe(false);
    expect(ctx.scenario).toBeUndefined();
  });

  it('requires chaos headers even when CHAOS_ENABLED=true', () => {
    process.env.CHAOS_ENABLED = 'true';
    const ctx = getChaosContext(fakeRequest());
    expect(ctx.enabled).toBe(false);
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
