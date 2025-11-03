import { HttpRequest, InvocationContext } from '@azure/functions';

// Set GIT_SHA before importing the health module
process.env.GIT_SHA = 'test-abc123';

import { health as healthCheck } from '@shared/routes/health';

// Mock the InvocationContext
const mockContext: Partial<InvocationContext> = {
  log: jest.fn(),
  invocationId: 'test-id',
  functionName: 'healthCheck',
  extraInputs: new Map(),
  extraOutputs: new Map(),
};

// Helper to create HttpRequest mock
const createHttpRequest = (method: string = 'GET'): Partial<HttpRequest> => ({
  method,
  url: 'http://localhost/api/health',
  headers: new Headers(),
  query: new URLSearchParams(),
  params: {},
  user: null,
});

describe('Health Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 status with build metadata', async () => {
    // Arrange
    const request = createHttpRequest() as HttpRequest;
    const context = mockContext as InvocationContext;

    // Act
    const response = await healthCheck(request, context);

    // Assert
    expect(response.status).toBe(200);
    expect(response.jsonBody).toHaveProperty('status', 'ok');
    expect(response.jsonBody).toHaveProperty('version', 'test-abc123');
    expect(response.jsonBody).toHaveProperty('uptimeSeconds');
    expect(response.jsonBody).toHaveProperty('timestamp');
  });

  it('should include version headers', async () => {
    // Arrange
    const request = createHttpRequest() as HttpRequest;
    const context = mockContext as InvocationContext;

    // Act
    const response = await healthCheck(request, context);

    // Assert
    expect(response.headers).toBeDefined();
    const headers = response.headers as Record<string, string>;
    expect(headers['X-Commit']).toBe('test-abc123');
    expect(headers['Cache-Control']).toContain('no-store');
    expect(headers['X-Uptime-Seconds']).toMatch(/^\d+$/);
  });

  it('should not log anything (minimal implementation)', async () => {
    // Arrange
    const request = createHttpRequest() as HttpRequest;
    const context = mockContext as InvocationContext;

    // Act
    await healthCheck(request, context);

    // Assert - health route doesn't log anything
    expect(context.log).not.toHaveBeenCalled();
  });

  it('should handle GET method', async () => {
    // Arrange
    const request = createHttpRequest('GET') as HttpRequest;
    const context = mockContext as InvocationContext;

    // Act
    const response = await healthCheck(request, context);

    // Assert
    expect(response.status).toBe(200);
    expect((response.jsonBody as any).status).toBe('ok');
  });
});
