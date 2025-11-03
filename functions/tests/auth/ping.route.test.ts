import type { HttpRequest, InvocationContext } from '@azure/functions';

import { ping } from '@auth/routes/ping';

describe('auth ping route', () => {
  it('returns service heartbeat payload', async () => {
    const response = await ping({} as HttpRequest, {} as InvocationContext);

    expect(response.status).toBe(200);
    expect(response.jsonBody).toHaveProperty('ok', true);
    expect(response.jsonBody).toHaveProperty('timestamp');
  });
});
