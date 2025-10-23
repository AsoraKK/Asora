import { health as healthCheck } from '@shared/routes/health';
import { HttpRequest, InvocationContext } from '@azure/functions';

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

  it('should return 200 status with ok: true', async () => {
    // Arrange
    const request = createHttpRequest() as HttpRequest;
    const context = mockContext as InvocationContext;

    // Act
    const response = await healthCheck(request, context);

    // Assert
    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual({ ok: true });
  });

  it('should have minimal response body', async () => {
    // Arrange
    const request = createHttpRequest() as HttpRequest;
    const context = mockContext as InvocationContext;

    // Act
    const response = await healthCheck(request, context);

    // Assert
    expect(response.jsonBody).toHaveProperty('ok');
    expect(response.jsonBody).toEqual({ ok: true });
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
    expect((response.jsonBody as any).ok).toBe(true);
  });
});
