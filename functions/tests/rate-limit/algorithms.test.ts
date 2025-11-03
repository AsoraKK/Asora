import {
  applyTokenBucket,
  evaluateSlidingWindow,
  type SlidingWindowBucket,
} from '@rate-limit/algorithms';

describe('evaluateSlidingWindow', () => {
  const NOW = 1_700_000_000_000; // fixed timestamp for deterministic assertions

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    (Date.now as jest.Mock | undefined)?.mockRestore?.();
  });

  it('allows traffic below the configured limit', () => {
    const buckets: SlidingWindowBucket[] = [
      { bucketStartMs: NOW - 20_000, bucketSizeSeconds: 1, count: 10 },
      { bucketStartMs: NOW - 10_000, bucketSizeSeconds: 1, count: 5 },
    ];

    const result = evaluateSlidingWindow(buckets, { limit: 30, windowSeconds: 60 }, NOW);

    expect(result.blocked).toBe(false);
    expect(result.total).toBe(15);
    expect(result.remaining).toBe(15);
    expect(result.retryAfterSeconds).toBe(0);
    expect(result.resetAt).toBeGreaterThanOrEqual(NOW);
  });

  it('blocks requests that exceed the limit and reports retry timing', () => {
    const buckets: SlidingWindowBucket[] = [
      { bucketStartMs: NOW - 50_000, bucketSizeSeconds: 1, count: 3 },
      { bucketStartMs: NOW - 5_000, bucketSizeSeconds: 1, count: 3 },
    ];

    const result = evaluateSlidingWindow(buckets, { limit: 4, windowSeconds: 60 }, NOW);

    expect(result.blocked).toBe(true);
    expect(result.total).toBe(6);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSeconds).toBe(55);
    expect(result.resetAt).toBe(NOW + result.retryAfterSeconds * 1000);
  });
});

describe('applyTokenBucket', () => {
  const NOW = 1_700_000_000_000;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
  });

  afterEach(() => {
    (Date.now as jest.Mock | undefined)?.mockRestore?.();
  });

  it('grants access when sufficient tokens are available', () => {
    const result = applyTokenBucket(undefined, { capacity: 10, refillRatePerSecond: 1 }, 1, NOW);

    expect(result.allowed).toBe(true);
    expect(result.remainingTokens).toBe(9);
    expect(result.retryAfterSeconds).toBe(0);
  });

  it('delays requests when capacity is exhausted', () => {
    const priorState = { tokens: 0, updatedAt: new Date(NOW).toISOString() };
    const result = applyTokenBucket(priorState, { capacity: 5, refillRatePerSecond: 1 }, 1, NOW);

    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(1);
    expect(result.remainingTokens).toBe(0);
  });
});
