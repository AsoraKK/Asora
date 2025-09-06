import { createPost } from '../post/create';
import { HttpRequest, InvocationContext } from '@azure/functions';

jest.mock('../shared/hive-client', () => ({
  createHiveClient: () => ({
    moderateText: async () => ({ response: { outputs: {} } }),
  }),
  HiveAIClient: { parseModerationResult: () => ({ action: 'accept', confidence: 0.1, flaggedCategories: [] }) },
}));

jest.mock('../shared/auth-utils', () => ({
  verifyJWT: async () => ({ sub: 'user-1' }),
}));

jest.mock('@azure/cosmos', () => ({
  CosmosClient: jest.fn().mockImplementation(() => ({
    database: jest.fn().mockReturnValue({
      container: jest.fn().mockImplementation((name: string) => {
        if (name === 'users') {
          return { item: jest.fn().mockReturnValue({ read: jest.fn().mockResolvedValue({ resource: { id: 'user-1', tier: 'free', reputationScore: 0 } }) }) };
        }
        if (name === 'posts') {
          return { items: { create: jest.fn().mockResolvedValue({}) } };
        }
        if (name === 'reputation_audit') {
          return { item: jest.fn().mockReturnValue({ read: jest.fn().mockRejectedValue({ code: 404 }) }), items: { create: jest.fn().mockResolvedValue({}) } };
        }
        return {} as any;
      })
    })
  }))
}));

function req(body: any): HttpRequest {
  return {
    method: 'POST',
    url: 'http://localhost/api/posts',
    headers: new Headers({ 'content-type': 'application/json', authorization: 'Bearer t' }),
    query: new URLSearchParams(),
    params: {},
    user: null as any,
    json: async () => body,
  } as unknown as HttpRequest;
}

function ctx(): InvocationContext { return ({ invocationId: 't', log: jest.fn() } as any); }

describe('Tier gating', () => {
  it('rejects content exceeding free tier limit', async () => {
    const longText = 'x'.repeat(600);
    const response = await createPost(req({ content: longText, contentType: 'text' }), ctx());
    expect(response.status).toBe(400);
  });

  it('accepts within limits and publishes', async () => {
    const okText = 'hello world';
    const response = await createPost(req({ content: okText, contentType: 'text' }), ctx());
    expect([200,201]).toContain(response.status);
  });
});

