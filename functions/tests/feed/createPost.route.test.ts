import type { HttpRequest, InvocationContext } from '@azure/functions';

import { createPost } from '@feed/routes/createPost';

const contextStub = {
  log: jest.fn(),
} as unknown as InvocationContext;

function guestRequest(): HttpRequest {
  return {
    headers: new Map(),
    json: jest.fn(),
  } as unknown as HttpRequest;
}

describe('createPost route auth', () => {
  it('returns 401 for guest principal', async () => {
    const response = await createPost(guestRequest(), contextStub);
    expect(response.status).toBe(401);
    expect(response.body).toBe(JSON.stringify({ error: 'unauthorized' }));
  });
});
