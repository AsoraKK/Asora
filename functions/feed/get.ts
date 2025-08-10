import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { createHash } from 'crypto';
import { createClient } from 'redis';
import { validateAuth } from '../shared/auth';
import { getCosmosContainer } from '../shared/cosmosClient';

interface FeedQuery {
  page?: number;
  limit?: number;
  type?: 'trending' | 'recent' | 'following';
  filter?: 'all' | 'safe' | 'moderate';
}

interface FeedPost {
  id: string;
  text: string;
  mediaUrl?: string;
  author: {
    id: string;
    displayName: string;
    tier: string;
    reputationScore: number;
  };
  createdAt: string;
  stats: {
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
  };
  userInteraction: {
    liked: boolean;
    commented: boolean;
    flagged: boolean;
  };
  aiScore: {
    overall: 'safe' | 'warning' | 'unsafe';
    confidence: number;
  };
}

interface FeedResponse {
  success: boolean;
  feed: {
    posts: FeedPost[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      hasNext: boolean;
      hasPrevious: boolean;
    };
    algorithm: {
      type: string;
      userTier: string;
      appliedFilters: string[];
    };
  };
}

// Redis client instance
let redisClient: ReturnType<typeof createClient> | null = null;

async function getRedisClient() {
  if (!redisClient) {
    const connectionString = process.env.REDIS_CONNECTION;
    if (!connectionString) {
      return null; // Redis not configured, continue without cache
    }
    
    try {
      redisClient = createClient({
        url: connectionString,
        database: 0
      });
      
      redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });
      
      await redisClient.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      return null;
    }
  }
  
  return redisClient;
}

function createFiltersHash(query: FeedQuery): string {
  const { page, limit, type, filter } = query;
  const hashInput = `${page}-${limit}-${type}-${filter}`;
  return createHash('md5').update(hashInput).digest('hex').substring(0, 8);
}

function getCacheKey(userId: string, page: number, filtersHash: string): string {
  return `feed:${userId}:${page}:${filtersHash}`;
}

async function getCachedFeed(key: string, context: InvocationContext): Promise<FeedResponse | null> {
  const redis = await getRedisClient();
  if (!redis) return null;

  try {
    const startTime = Date.now();
    const cached = await redis.get(key);
    const duration = Date.now() - startTime;
    
    if (cached) {
      context.log(`Cache HIT for key ${key} (${duration}ms)`);
      return JSON.parse(cached);
    } else {
      context.log(`Cache MISS for key ${key} (${duration}ms)`);
      return null;
    }
  } catch (error) {
    context.log.error('Redis get error:', error);
    return null;
  }
}

async function setCachedFeed(key: string, feed: FeedResponse, context: InvocationContext): Promise<void> {
  const redis = await getRedisClient();
  if (!redis) return;

  try {
    const startTime = Date.now();
    await redis.setEx(key, 30, JSON.stringify(feed)); // 30 second TTL
    const duration = Date.now() - startTime;
    context.log(`Cache SET for key ${key} (${duration}ms)`);
  } catch (error) {
    context.log.error('Redis set error:', error);
  }
}

async function queryFeedFromCosmos(userId: string, query: FeedQuery, userTier: string, context: InvocationContext): Promise<FeedResponse> {
  const startTime = Date.now();
  
  // Mock implementation - replace with actual Cosmos query
  const mockPosts: FeedPost[] = [
    {
      id: '1',
      text: 'Welcome to Asora! This is a sample post.',
      author: {
        id: 'user1',
        displayName: 'Sample User',
        tier: 'Free',
        reputationScore: 85
      },
      createdAt: new Date().toISOString(),
      stats: {
        likesCount: 12,
        commentsCount: 3,
        sharesCount: 1
      },
      userInteraction: {
        liked: false,
        commented: false,
        flagged: false
      },
      aiScore: {
        overall: 'safe',
        confidence: 0.95
      }
    }
  ];

  const duration = Date.now() - startTime;
  context.log(`Cosmos query completed in ${duration}ms`);

  return {
    success: true,
    feed: {
      posts: mockPosts,
      pagination: {
        currentPage: query.page || 1,
        totalPages: 1,
        totalItems: mockPosts.length,
        hasNext: false,
        hasPrevious: false
      },
      algorithm: {
        type: query.type || 'trending',
        userTier,
        appliedFilters: [query.filter || 'safe']
      }
    }
  };
}

export async function getFeed(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Validate authentication
    const authResult = await validateAuth(request);
    if (!authResult.success) {
      return {
        status: 401,
        jsonBody: {
          success: false,
          error: authResult.error
        }
      };
    }

    const { userId } = authResult.user!;
    const userTier = authResult.user!.tier || 'Free';

    // Parse query parameters
    const url = new URL(request.url);
    const query: FeedQuery = {
      page: parseInt(url.searchParams.get('page') || '1'),
      limit: parseInt(url.searchParams.get('limit') || '20'),
      type: (url.searchParams.get('type') as FeedQuery['type']) || 'trending',
      filter: (url.searchParams.get('filter') as FeedQuery['filter']) || 'safe'
    };

    // Validate query parameters
    if (query.page! < 1) query.page = 1;
    if (query.limit! < 1 || query.limit! > 100) query.limit = 20;

    // Create cache key
    const filtersHash = createFiltersHash(query);
    const cacheKey = getCacheKey(userId, query.page!, filtersHash);

    // Try cache first
    const cachedFeed = await getCachedFeed(cacheKey, context);
    if (cachedFeed) {
      return {
        status: 200,
        jsonBody: cachedFeed
      };
    }

    // Cache miss - query Cosmos
    const feed = await queryFeedFromCosmos(userId, query, userTier, context);

    // Cache the result
    await setCachedFeed(cacheKey, feed, context);

    return {
      status: 200,
      jsonBody: feed
    };

  } catch (error) {
    context.log.error('Feed get error:', error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: 'Internal server error'
      }
    };
  }
}

app.http('getFeed', {
  methods: ['GET'],
  route: 'feed/get',
  authLevel: 'anonymous',
  handler: getFeed
});
