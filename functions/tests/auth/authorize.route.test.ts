import type { InvocationContext } from '@azure/functions';

import { authorizeRoute } from '@auth/routes/authorize';
import { authorizeHandler } from '@auth/service/authorizeService';
import { httpReqMock } from '../helpers/http';

jest.mock('@auth/service/authorizeService', () => ({
  authorizeHandler: jest.fn(),
}));

const contextStub = { log: jest.fn() } as unknown as InvocationContext;

describe('authorize route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns CORS response for OPTIONS', async () => {
    const response = await authorizeRoute(httpReqMock({ method: 'OPTIONS' }), contextStub);
    expect(response.status).toBe(200);
    expect(response.body).toBe('');
  });

  it('rejects disallowed method', async () => {
    const response = await authorizeRoute(httpReqMock({ method: 'POST' }), contextStub);
    expect(response.status).toBe(405);
    expect(JSON.parse(response.body)).toMatchObject({
      success: false,
      message: 'Method POST not allowed',
    });
  });

  it('delegates to handler for success', async () => {
    const handler = authorizeHandler as jest.MockedFunction<typeof authorizeHandler>;
    handler.mockResolvedValueOnce({ status: 200, jsonBody: { authorized: true } });

    const request = httpReqMock({ method: 'GET' });
    const response = await authorizeRoute(request, contextStub);
    expect(handler).toHaveBeenCalledWith(request, contextStub);
    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual({ authorized: true });
  });

  it('propagates handler response for unauthorized guests', async () => {
    const handler = authorizeHandler as jest.MockedFunction<typeof authorizeHandler>;
    handler.mockResolvedValueOnce({ status: 401, jsonBody: { error: 'unauthorized' } });

    const response = await authorizeRoute(httpReqMock({ method: 'GET' }), contextStub);
    expect(response.status).toBe(401);
    expect(response.jsonBody).toEqual({ error: 'unauthorized' });
  });
});
