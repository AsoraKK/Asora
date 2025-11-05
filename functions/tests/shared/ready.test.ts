import { ready } from '../../src/shared/routes/ready';

// Mock the HttpRequest
const mockRequest = {} as any;

describe('ready endpoint', () => {
  it('should return 200 with ready status', async () => {
    const response = await ready(mockRequest);

    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual({ status: 'ready' });
  });
});
