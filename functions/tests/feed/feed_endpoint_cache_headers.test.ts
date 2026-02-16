import type { InvocationContext } from '@azure/functions';
import { httpReqMock } from '../helpers/http';
import { feed_discover_get } from '@feed/routes/feed_discover_get.function';
import { feed_news_get } from '@feed/routes/feed_news_get.function';
import { feed_user_get } from '@feed/routes/feed_user_get.function';
import { getFeed } from '@feed/service/feedService';
import { extractAuthContext } from '@shared/http/authContext';
import { postsService } from '@posts/service/postsService';

jest.mock('@feed/service/feedService', () => ({
  getFeed: jest.fn(),
}));

jest.mock('@shared/http/authContext', () => ({
  extractAuthContext: jest.fn(),
}));

jest.mock('@posts/service/postsService', () => ({
  postsService: {
    enrichPost: jest.fn(),
  },
}));

const mockedGetFeed = getFeed as jest.MockedFunction<typeof getFeed>;
const mockedExtractAuthContext = extractAuthContext as jest.MockedFunction<typeof extractAuthContext>;
const mockedEnrichPost = postsService.enrichPost as jest.MockedFunction<typeof postsService.enrichPost>;

const createContextStub = (): InvocationContext =>
  ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    traceContext: {},
    invocationId: 'test-invocation-id',
    functionName: 'feedCacheHeaderTest',
  }) as unknown as InvocationContext;

describe('feed endpoint cache headers', () => {
  let context: InvocationContext;

  beforeEach(() => {
    jest.clearAllMocks();
    context = createContextStub();
    mockedGetFeed.mockResolvedValue({
      body: {
        items: [
          {
            id: 'post-1',
            isNews: true,
            topics: ['tech'],
          },
        ],
        meta: {
          nextCursor: 'next-1',
        },
      },
      headers: {},
    } as any);
    mockedEnrichPost.mockImplementation(async (item: any) => item as any);
  });

  it('sets public cache headers for anonymous discover feed', async () => {
    mockedExtractAuthContext.mockRejectedValueOnce(new Error('unauthenticated'));

    const response = await feed_discover_get(
      httpReqMock({ method: 'GET', query: { limit: '10' } }),
      context
    );

    expect(response.status).toBe(200);
    expect(response.headers?.['Cache-Control']).toBe('public, max-age=60, stale-while-revalidate=30');
    expect(response.headers?.['Vary']).toBe('Authorization');
  });

  it('sets no-store cache headers for authenticated discover feed', async () => {
    mockedExtractAuthContext.mockResolvedValueOnce({
      userId: 'user-123',
      roles: ['user'],
      tier: 'free',
    } as any);

    const response = await feed_discover_get(
      httpReqMock({ method: 'GET', headers: { authorization: 'Bearer token' } }),
      context
    );

    expect(response.status).toBe(200);
    expect(response.headers?.['Cache-Control']).toBe('private, no-store');
    expect(response.headers?.['Vary']).toBe('Authorization');
  });

  it('sets public cache headers for anonymous news feed', async () => {
    mockedExtractAuthContext.mockRejectedValueOnce(new Error('unauthenticated'));

    const response = await feed_news_get(httpReqMock({ method: 'GET' }), context);

    expect(response.status).toBe(200);
    expect(response.headers?.['Cache-Control']).toBe('public, max-age=60, stale-while-revalidate=30');
    expect(response.headers?.['Vary']).toBe('Authorization');
  });

  it('always sets no-store for user feed', async () => {
    mockedExtractAuthContext.mockRejectedValueOnce(new Error('unauthenticated'));

    const response = await feed_user_get(
      httpReqMock({ method: 'GET', params: { userId: 'author-123' } }),
      context
    );

    expect(response.status).toBe(200);
    expect(response.headers?.['Cache-Control']).toBe('private, no-store');
    expect(response.headers?.['Vary']).toBe('Authorization');
  });
});
