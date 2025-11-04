import { InvocationContext } from '@azure/functions';
import { ready } from '../../src/shared/routes/ready';

// Mock the HttpRequest since we don't use it
const mockRequest = {} as any;
const mockContext: InvocationContext = {
  invocationId: 'test-invocation',
  functionName: 'ready',
  logHandler: () => {},
  extraInputs: { get: () => undefined },
  extraOutputs: { set: () => {} },
} as any;

describe('ready endpoint', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env to a clean state
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return 200 when all required env vars are present', async () => {
    process.env.COSMOS_CONNECTION_STRING = 'AccountEndpoint=https://test.documents.azure.com:443/;AccountKey=fake==';
    process.env.EMAIL_HASH_SALT = 'test-salt';

    const response = await ready(mockRequest, mockContext);

    expect(response.status).toBe(200);
    expect(response.jsonBody).toMatchObject({
      ready: true,
      checks: expect.arrayContaining([
        { name: 'environment', status: 'ok' }
      ])
    });
  });

  it('should return 503 when required env vars are missing', async () => {
    delete process.env.COSMOS_CONNECTION_STRING;
    delete process.env.EMAIL_HASH_SALT;

    const response = await ready(mockRequest, mockContext);

    expect(response.status).toBe(503);
    expect(response.jsonBody).toMatchObject({
      ready: false,
      checks: expect.arrayContaining([
        expect.objectContaining({
          name: 'environment',
          status: 'fail',
          message: expect.stringContaining('COSMOS_CONNECTION_STRING')
        })
      ])
    });
  });

  it('should return 503 when only some env vars are missing', async () => {
    process.env.COSMOS_CONNECTION_STRING = 'test-conn';
    delete process.env.EMAIL_HASH_SALT;

    const response = await ready(mockRequest, mockContext);

    expect(response.status).toBe(503);
    expect(response.jsonBody?.ready).toBe(false);
  });

  it('should include Cache-Control headers', async () => {
    process.env.COSMOS_CONNECTION_STRING = 'test';
    process.env.EMAIL_HASH_SALT = 'test';

    const response = await ready(mockRequest, mockContext);

    expect(response.headers).toMatchObject({
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Type': 'application/json'
    });
  });

  it('should include timestamp in response', async () => {
    process.env.COSMOS_CONNECTION_STRING = 'test';
    process.env.EMAIL_HASH_SALT = 'test';

    const response = await ready(mockRequest, mockContext);

    expect(response.jsonBody?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
