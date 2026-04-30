import type { HttpRequest, InvocationContext } from '@azure/functions';

import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';
import { applySlidingWindowLimit, getAuthFailureState } from '@rate-limit/store';

jest.mock('@rate-limit/store', () => ({
	applySlidingWindowLimit: jest.fn(),
	applyTokenBucketLimit: jest.fn(),
	getAuthFailureState: jest.fn(),
	incrementAuthFailure: jest.fn(),
	resetAuthFailures: jest.fn(),
}));

jest.mock('applicationinsights', () => {
	const client = { trackMetric: jest.fn(), trackEvent: jest.fn() };
	const chainable = {
		setAutoCollectConsole: jest.fn().mockReturnThis(),
		setAutoCollectDependencies: jest.fn().mockReturnThis(),
		setAutoCollectPerformance: jest.fn().mockReturnThis(),
		setAutoCollectRequests: jest.fn().mockReturnThis(),
		setAutoCollectExceptions: jest.fn().mockReturnThis(),
		setSendLiveMetrics: jest.fn().mockReturnThis(),
		start: jest.fn().mockReturnThis(),
	};

	return {
		__esModule: true,
		default: { defaultClient: client, setup: jest.fn().mockReturnValue(chainable) },
	};
});

const applySlidingWindowLimitMock = applySlidingWindowLimit as jest.MockedFunction<typeof applySlidingWindowLimit>;
const getAuthFailureStateMock = getAuthFailureState as jest.MockedFunction<typeof getAuthFailureState>;

function createRequest(): HttpRequest {
	return {
		method: 'POST',
		url: 'https://api.asora.dev/api/moderation/appeals/appeal-42/vote',
		headers: new Headers({ 'cf-connecting-ip': '203.0.113.42' }),
	} as unknown as HttpRequest;
}

function createContext(): InvocationContext {
	return {
		invocationId: 'vote-rate-limit',
		traceContext: {
			traceParent: '00-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb-cccccccccccccccc-01',
		},
	} as unknown as InvocationContext;
}

beforeEach(() => {
	jest.clearAllMocks();
	process.env.RATE_LIMITS_ENABLED = 'true';
	process.env.EMAIL_HASH_SALT = 'unit-test-salt';
	jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
	getAuthFailureStateMock.mockResolvedValue({
		blocked: false,
		failures: 0,
		retryAfterSeconds: 0,
		windowSeconds: 1800,
	});
});

afterEach(() => {
	(Date.now as jest.Mock | undefined)?.mockRestore?.();
});

describe('voteOnAppeal rate limiting', () => {
	it('maps the route to the write policy for appeal voting', () => {
		const policy = getPolicyForFunction('moderation-vote-appeal');

		expect(policy.routeId).toBe('moderation/appeals/vote');
		expect(policy.limits.length).toBeGreaterThan(0);
		expect(policy.limits[0].slidingWindow?.windowSeconds).toBeGreaterThan(0);
	});

	it('returns 429 with Retry-After when the write policy is blocked', async () => {
		applySlidingWindowLimitMock.mockResolvedValue({
			total: 999,
			limit: 1,
			windowSeconds: 60,
			remaining: 0,
			blocked: true,
			retryAfterSeconds: 45,
			resetAt: 1_700_000_045_000,
			buckets: [],
		});

		const handler = jest.fn(async () => ({ status: 200, body: 'ok', headers: {} }));
		const wrapped = withRateLimit(handler, getPolicyForFunction('moderation-vote-appeal'));
		const response = await wrapped(createRequest(), createContext());

		expect(response.status).toBe(429);
		expect(response.headers?.['Retry-After']).toBe('45');
		expect(response.headers?.['X-RateLimit-Remaining']).toBe('0');
		expect(handler).not.toHaveBeenCalled();
	});

	it('includes a structured rate-limited body', async () => {
		applySlidingWindowLimitMock.mockResolvedValue({
			total: 999,
			limit: 1,
			windowSeconds: 60,
			remaining: 0,
			blocked: true,
			retryAfterSeconds: 30,
			resetAt: 1_700_000_030_000,
			buckets: [],
		});

		const handler = jest.fn(async () => ({ status: 200, body: 'ok', headers: {} }));
		const wrapped = withRateLimit(handler, getPolicyForFunction('moderation-vote-appeal'));
		const response = await wrapped(createRequest(), createContext());

		const body = JSON.parse(response.body as string);
		expect(body.error).toBe('rate_limited');
		expect(body.retry_after_seconds).toBe(30);
		expect(body.scope).toBe('ip');
	});
});
