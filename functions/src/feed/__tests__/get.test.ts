import { getFeed } from '../get';
import { HttpRequest, InvocationContext } from '@azure/functions';

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
        jest.clearAllMocks();
    });

    it('should return 200 with feed data structure', async () => {
        const response = await getFeed(mockRequest, mockContext);

        expect(response.status).toBe(200);
        expect(response.headers).toEqual({
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=60',
            'Vary': 'Authorization'
        });
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

    it('should handle errors gracefully', async () => {
        // Mock an error in the handler by creating a context that throws
        const errorContext = {
            ...mockContext,
            log: jest.fn(() => {
                throw new Error('Test error');
            })
        } as unknown as InvocationContext;

        const response = await getFeed(mockRequest, errorContext);

        expect(response.status).toBe(500);
        expect(response.jsonBody).toMatchObject({
            status: 'error',
            message: 'Internal server error',
            ts: expect.any(String)
        });
    });
});
