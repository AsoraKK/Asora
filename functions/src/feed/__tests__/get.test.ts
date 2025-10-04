import { getFeed } from '../get';
import { HttpRequest, InvocationContext } from '@azure/functions';
import * as redisClient from '../../../shared/redisClient';

let isRedisEnabledSpy: jest.SpyInstance<boolean, []>;
let withRedisSpy: jest.SpyInstance<Promise<unknown> | null, any[]>;

// Mock the InvocationContext
const mockContext = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    invocationId: 'test-invocation-id',
    functionName: 'feedGet',
    traceContext: {},
    triggerMetadata: {},
    retryContext: {},
    extraInputs: {},
    extraOutputs: {},
    options: {}
} as unknown as InvocationContext;

// Mock HttpRequest
const mockRequest = {
    method: 'GET',
    url: 'https://test.com/api/feed',
    headers: new Headers(),
    query: new URLSearchParams(),
    params: {},
    user: null,
    body: {},
    formData: jest.fn(),
    json: jest.fn(),
    text: jest.fn(),
    arrayBuffer: jest.fn(),
    blob: jest.fn()
} as unknown as HttpRequest;

describe('Feed GET Handler', () => {
    beforeEach(() => {
        isRedisEnabledSpy = jest.spyOn(redisClient, 'isRedisEnabled').mockReturnValue(false);
        withRedisSpy = jest.spyOn(redisClient, 'withRedis').mockResolvedValue(null);
        mockRequest.headers = new Headers();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should return 200 with feed data structure', async () => {
        const response = await getFeed(mockRequest, mockContext);

        expect(response.status).toBe(200);
        const headers = response.headers as Record<string, string> | undefined;
        expect(headers).toEqual(expect.objectContaining({
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=60',
            'Vary': 'Authorization',
            'X-Cache-Status': 'disabled',
            'X-Redis-Status': 'disabled',
            'X-RU-Estimate': '1'
        }));
        expect(headers?.['X-Request-Duration']).toBeDefined();
        expect(response.jsonBody).toMatchObject({
            status: 'ok',
            service: 'asora-function-dev',
            ts: expect.any(String),
            data: {
                posts: expect.any(Array),
                pagination: {
                    page: expect.any(Number),
                    limit: expect.any(Number),
                    total: expect.any(Number),
                    hasMore: expect.any(Boolean)
                }
            }
        });
    });

    it('should log the request', async () => {
        await getFeed(mockRequest, mockContext);

        expect(mockContext.log).toHaveBeenCalledWith('Feed GET endpoint called');
    });

    it('should surface redis failures via headers without crashing', async () => {
        isRedisEnabledSpy.mockReturnValue(true);
        withRedisSpy.mockImplementationOnce(async () => {
            throw new Error('redis boom');
        });

        const response = await getFeed(mockRequest, mockContext);

        expect(response.status).toBe(200);
        const headers = response.headers as Record<string, string> | undefined;
        expect(headers).toEqual(expect.objectContaining({
            'X-Redis-Status': 'error',
            'X-Cache-Status': 'miss'
        }));
    });

    it('should return cached posts when redis returns data', async () => {
        isRedisEnabledSpy.mockReturnValue(true);
        withRedisSpy.mockImplementation(async (fn: any) => {
            const redisMock = {
                zrevrange: jest.fn().mockResolvedValue([
                    JSON.stringify({ id: 'p1', title: 'Cached' }),
                    '{"id"' // malformed to trigger parse guard
                ])
            };
            await fn(redisMock);
            return null;
        });

        const response = await getFeed(mockRequest, mockContext);
        const headers = response.headers as Record<string, string> | undefined;
        expect(headers).toEqual(expect.objectContaining({
            'X-Cache-Status': 'hit',
            'X-Redis-Status': 'connected',
            'X-RU-Estimate': '0'
        }));
        const body = response.jsonBody as any;
        expect(body.data.posts).toEqual([{ id: 'p1', title: 'Cached' }]);
    });

    it('should use private cache headers when Authorization header is present', async () => {
        mockRequest.headers = new Headers({ authorization: 'Bearer token' });

        const response = await getFeed(mockRequest, mockContext);
        const headers = response.headers as Record<string, string> | undefined;
        expect(headers?.['Cache-Control']).toBe('private, no-store');
        expect(headers?.['X-Cache-Status']).toBe('disabled');
    });

    it('should return 500 when unexpected error occurs', async () => {
        const failingRequest = {
            ...mockRequest,
            headers: {
                has: () => {
                    throw new Error('header failure');
                }
            }
        } as any;

        const response = await getFeed(failingRequest, mockContext);

        expect(response.status).toBe(500);
        const body = response.jsonBody as any;
        expect(body.status).toBe('error');
    });
});
