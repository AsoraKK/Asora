import { healthCheck } from '../health/healthCheck';
import { HttpRequest, InvocationContext } from '@azure/functions';

// Mock the InvocationContext
const mockContext: Partial<InvocationContext> = {
    log: jest.fn(),
    invocationId: 'test-id',
    functionName: 'healthCheck',
    extraInputs: new Map(),
    extraOutputs: new Map()
};

// Helper to create HttpRequest mock
const createHttpRequest = (method: string = 'GET'): Partial<HttpRequest> => ({
    method,
    url: 'http://localhost/api/health',
    headers: new Headers(),
    query: new URLSearchParams(),
    params: {},
    user: null
});

describe('Health Function', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 200 status with ok: true', async () => {
        // Arrange
        const request = createHttpRequest() as HttpRequest;
        const context = mockContext as InvocationContext;

        // Act
        const response = await healthCheck(request, context);

        // Assert
        expect(response.status).toBe(200);
        expect(response.headers).toEqual({
            'Content-Type': 'application/json'
        });
        expect(response.jsonBody).toEqual(
            expect.objectContaining({
                ok: true,
                status: 'healthy',
                service: 'asora-functions',
                version: '1.0.0'
            })
        );
    });

    it('should include timestamp in response', async () => {
        // Arrange
        const request = createHttpRequest() as HttpRequest;
        const context = mockContext as InvocationContext;
        const beforeTime = Date.now();

        // Act
        const response = await healthCheck(request, context);
        const afterTime = Date.now();

        // Assert
        expect(response.jsonBody).toHaveProperty('timestamp');
        const responseTime = new Date((response.jsonBody as any).timestamp).getTime();
        expect(responseTime).toBeGreaterThanOrEqual(beforeTime);
        expect(responseTime).toBeLessThanOrEqual(afterTime);
    });

    it('should log health check call', async () => {
        // Arrange
        const request = createHttpRequest() as HttpRequest;
        const context = mockContext as InvocationContext;

        // Act
        await healthCheck(request, context);

        // Assert
        expect(context.log).toHaveBeenCalledWith('Health check endpoint called');
    });

    it('should handle GET method', async () => {
        // Arrange
        const request = createHttpRequest('GET') as HttpRequest;
        const context = mockContext as InvocationContext;

        // Act
        const response = await healthCheck(request, context);

        // Assert
        expect(response.status).toBe(200);
        expect((response.jsonBody as any).ok).toBe(true);
    });
});
