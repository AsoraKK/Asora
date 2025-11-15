import type { InvocationContext } from '@azure/functions';
import { getFeed, encodeCursor } from '@feed/service/feedService';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { withClient } from '@shared/clients/postgres';

jest.mock('@shared/clients/cosmos', () => ({
  getTargetDatabase: jest.fn(),
}));

jest.mock('@shared/clients/postgres', () => ({
  withClient: jest.fn(),
}));

jest.mock('@shared/appInsights', () => ({
  trackAppMetric: jest.fn(),
  trackAppEvent: jest.fn(),
}));

const mockFetchNext = jest.fn();
const mockItemsQuery = jest.fn(() => ({ fetchNext: mockFetchNext }));
const mockContainer = {
  items: {
    query: mockItemsQuery,
  },
};

const getTargetDatabaseMock = getTargetDatabase as jest.MockedFunction<typeof getTargetDatabase>;
const mockedWithClient = withClient as jest.MockedFunction<typeof withClient>;

const mockContext = {
  log: jest.fn(),
} as unknown as InvocationContext;

function setupCosmosResponse(
  resources: Record<string, unknown>[],
  headers: Record<string, string> = {},
  continuationToken?: string
) {
  mockFetchNext.mockResolvedValue({
    resources,
    headers,
    continuationToken,
  });
}

describe('feedService.getFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getTargetDatabaseMock.mockReturnValue({ posts: mockContainer });
    mockFetchNext.mockReset();
    mockItemsQuery.mockReset();
    mockItemsQuery.mockReturnValue({ fetchNext: mockFetchNext });
    mockedWithClient.mockReset();
  });

  it('returns a public feed sorted by createdAt/id with metadata', async () => {
    setupCosmosResponse(
      [
        { id: 'b', createdAt: 1_000 },
        { id: 'c', createdAt: 2_000 },
        { id: 'd', createdAt: 2_000 },
      ],
      { 'x-ms-request-charge': '2.00', 'x-ms-documentdb-query-metrics': 'kql' },
      'token-123'
    );

    const result = await getFeed({ principal: null, context: mockContext });

    expect(result.body.items.map(item => item.id)).toEqual(['d', 'c', 'b']);
    expect(result.body.meta.nextCursor).toBe(encodeCursor({ ts: 1_000, id: 'b' }));
    expect(result.headers['X-Cosmos-RU']).toBe('2.00');
    expect(mockedWithClient).not.toHaveBeenCalled();
    expect(result.body.meta.applied.feedType).toBe('public');
  });

  it('caps multi-author queries to MAX_AUTHOR_BATCH and enables cross partitioning', async () => {
    const followeeRows = Array.from({ length: 55 }, (_, index) => ({
      followee_uuid: `author-${index}`,
    }));

    mockedWithClient.mockImplementation(async callback =>
      callback({
        query: jest.fn(async (query: any) => {
          if (String(query.text).includes('followee_uuid')) {
            return { rows: followeeRows };
          }
          return { rowCount: 0 };
        }),
      })
    );

    setupCosmosResponse([], { 'x-ms-request-charge': '1' });

    const result = await getFeed({
      principal: { sub: 'principal-id', raw: {} } as any,
      context: mockContext,
    });

    expect(result.headers['X-Feed-Author-Count']).toBe('50');
    const options = mockContainer.items.query.mock.calls[0][1];
    expect(options.partitionKey).toBeUndefined();
    expect(options.enableCrossPartition).toBe(true);
  });

  it('restricts profile feeds to a single partition key', async () => {
    setupCosmosResponse([]);

    const result = await getFeed({
      principal: null,
      context: mockContext,
      authorId: 'target-author',
    });

    const options = mockContainer.items.query.mock.calls[0][1];
    expect(options.partitionKey).toBe('target-author');
    expect(options.enableCrossPartition).toBeUndefined();
    expect(result.body.meta.applied.feedType).toBe('profile');
  });
});
