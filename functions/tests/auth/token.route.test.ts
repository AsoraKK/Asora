import { InvocationContext } from '@azure/functions';
import { tokenRoute } from '@auth/routes/token';
import { httpReqMock } from '../helpers/http';

// Mock the tokenHandler service
jest.mock('@auth/service/tokenService', () => ({
  tokenHandler: jest.fn(),
}));

const { tokenHandler } = require('@auth/service/tokenService');

describe('auth/routes/token - CORS and method handling', () => {
  const mockContext: InvocationContext = {
    invocationId: 'test-id',
    log: jest.fn(),
    error: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles OPTIONS request with 200 response', async () => {
    const req = httpReqMock({ method: 'OPTIONS' });
    const res = await tokenRoute(req as any, mockContext);
    
    expect(res.status).toBe(200);
    expect(tokenHandler).not.toHaveBeenCalled();
  });

  it('rejects GET request with 405 Method Not Allowed', async () => {
    const req = httpReqMock({ method: 'GET' });
    const res = await tokenRoute(req as any, mockContext);
    
    expect(res.status).toBe(405);
    expect(tokenHandler).not.toHaveBeenCalled();
  });

  it('rejects PUT request with 405 Method Not Allowed', async () => {
    const req = httpReqMock({ method: 'PUT' });
    const res = await tokenRoute(req as any, mockContext);
    
    expect(res.status).toBe(405);
    expect(tokenHandler).not.toHaveBeenCalled();
  });

  it('rejects DELETE request with 405 Method Not Allowed', async () => {
    const req = httpReqMock({ method: 'DELETE' });
    const res = await tokenRoute(req as any, mockContext);
    
    expect(res.status).toBe(405);
    expect(tokenHandler).not.toHaveBeenCalled();
  });

  it('rejects PATCH request with 405 Method Not Allowed', async () => {
    const req = httpReqMock({ method: 'PATCH' });
    const res = await tokenRoute(req as any, mockContext);
    
    expect(res.status).toBe(405);
    expect(tokenHandler).not.toHaveBeenCalled();
  });

  it('forwards POST request to tokenHandler', async () => {
    const mockResponse = { status: 200, body: '{"success":true}' };
    tokenHandler.mockResolvedValue(mockResponse);
    
    const req = httpReqMock({ method: 'POST', body: { grant_type: 'authorization_code' } });
    const res = await tokenRoute(req as any, mockContext);
    
    expect(tokenHandler).toHaveBeenCalledWith(req, mockContext);
    expect(res).toEqual(mockResponse);
  });

  it('handles missing method gracefully (defaults to GET, returns 405)', async () => {
    const req = httpReqMock({ method: undefined as any });
    const res = await tokenRoute(req as any, mockContext);
    
    expect(res.status).toBe(405);
    expect(tokenHandler).not.toHaveBeenCalled();
  });

  it('propagates tokenHandler errors', async () => {
    const error = new Error('Token service error');
    tokenHandler.mockRejectedValue(error);
    
    const req = httpReqMock({ method: 'POST', body: { grant_type: 'authorization_code' } });
    
    await expect(tokenRoute(req as any, mockContext)).rejects.toThrow('Token service error');
  });
});
