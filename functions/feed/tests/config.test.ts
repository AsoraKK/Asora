import { describe, expect, it, afterEach, vi } from 'vitest';

function clearFeedEnv() {
  delete process.env.FEED_WEIGHTS_JSON;
  delete process.env.FEED_MODERATION_JSON;
  delete process.env.FEED_FAIRNESS_JSON;
  delete process.env.FEED_FRESHNESS_LAMBDA;
}

describe('loadDynamicConfig', () => {
  afterEach(() => {
    clearFeedEnv();
    vi.resetModules();
  });

  it('overrides defaults using environment JSON', async () => {
    const fairnessOverride = {
      floors: [
        [5, 1],
        [4, 2],
        [3, 3],
        [2, 4],
        [1, 2],
      ],
      caps: [
        [5, 8],
        [4, 6],
        [3, 5],
        [2, 4],
        [1, 3],
      ],
      perAuthorPageCap: 3,
      exploreRatio: 0.2,
    };

    process.env.FEED_WEIGHTS_JSON = JSON.stringify({
      discovery: { freshness: 0.4, rep: 0.3, engagement: 0.2, consistency: 0.1 },
      personalized: { freshness: 0.25, rep: 0.45, engagement: 0.2, consistency: 0.1 },
    });
    process.env.FEED_MODERATION_JSON = JSON.stringify({ aiBlockThreshold: 0.42 });
    process.env.FEED_FAIRNESS_JSON = JSON.stringify(fairnessOverride);
    process.env.FEED_FRESHNESS_LAMBDA = '0.11';

    const config = await import('../pipeline/config');
    await config.loadDynamicConfig();

    expect(config.Weights.discovery.freshness).toBeCloseTo(0.4);
    expect(config.Weights.personalized.rep).toBeCloseTo(0.45);
    expect(config.Moderation.aiBlockThreshold).toBeCloseTo(0.42);
    expect(config.Fairness.perAuthorPageCap).toBe(3);
    expect(config.Fairness.exploreRatio).toBeCloseTo(0.2);
    expect(config.Fairness.floors.get(2)).toBe(4);
    expect(config.Fairness.caps.get(1)).toBe(3);
    expect(config.Freshness.lambdaPerHour).toBeCloseTo(0.11, 5);
  });

  it('falls back to defaults when JSON is invalid', async () => {
    process.env.FEED_WEIGHTS_JSON = '{not-json';
    process.env.FEED_MODERATION_JSON = '{bad';
    process.env.FEED_FAIRNESS_JSON = '{bad';
    process.env.FEED_FRESHNESS_LAMBDA = 'not-a-number';

    const config = await import('../pipeline/config');
    const defaults = config.Defaults;

    await config.loadDynamicConfig();

    expect(config.Weights).toEqual(defaults.Weights);
    expect(config.Moderation).toEqual(defaults.Moderation);
    expect(config.Fairness.perAuthorPageCap).toEqual(defaults.Fairness.perAuthorPageCap);
    expect(config.Freshness.lambdaPerHour).toEqual(defaults.Freshness.lambdaPerHour);
  });
});
