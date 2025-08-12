import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authenticateRequest, AuthResult } from '../shared/auth';
import { getContainer } from '../shared/cosmosClient';
import { enforceReadGate } from '../shared/guards';
import { rankPosts, paginateRankedPosts, generateRankingTelemetry, PostForRanking } from '../shared/ranking';
import { getCache, setCache, generateFeedCacheKey, getCacheMetrics } from '../shared/redisClient';
import { getCacheConfig, isRedisCacheEnabled, isEdgeCacheEnabled, shouldCollectTelemetry } from '../shared/cacheConfig';
import { withTelemetry, AsoraKPIs, PerformanceTimer } from '../shared/telemetry';

interface FeedQuery {
  page?: number;
  limit?: number;
  type?: 'trending' | 'recent' | 'following' | 'popular';
  filter?: 'all' | 'safe' | 'flagged';
}

interface FeedPost {
  id: string;
  text: string;
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
    overall: string;
    confidence: number;
  };
  rankingScore?: number; // Added for ranking display
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
      ranking?: {
        totalPosts: number;
        rankedPosts: number;
        avgScore: number;
        cacheHit: boolean;
      };
    };
  };
}

async function queryPostsFromCosmos(userId: string, query: FeedQuery, context: InvocationContext): Promise<PostForRanking[]> {
  const startTime = Date.now();
  
  try {
    const postsContainer = getContainer('posts');
    
    // Build base query - get recent posts (last 7 days for trending)
    const querySpec = {
      query: `
        SELECT c.id, c.text, c.authorId, c.createdAt, 
               c.stats.likesCount, c.stats.commentsCount, c.stats.sharesCount,
               c.aiScore, c.author
        FROM c 
        WHERE c._ts > @minTimestamp 
          AND (c.aiScore.overall = @safetyFilter OR @safetyFilter = 'all')
        ORDER BY c._ts DESC
      `,
      parameters: [
        { name: '@minTimestamp', value: Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000) },
        { name: '@safetyFilter', value: query.filter || 'safe' }
      ]
    };
    
    const { resources: posts } = await postsContainer.items.query(querySpec).fetchAll();
    
    // Convert to PostForRanking format
    const postsForRanking: PostForRanking[] = posts.map(post => ({
      id: post.id,
      authorId: post.authorId,
      createdAt: post.createdAt.toISOString(), // Convert Date to string
      engagementScore: (post.likesCount || 0) + (post.commentsCount || 0) * 2 + (post.sharesCount || 0) * 3, // Calculate engagement
      authorReputation: post.author?.reputationScore || 50 // Default reputation
    }));
    
    const duration = Date.now() - startTime;
    context.log(`Cosmos query completed: ${postsForRanking.length} posts in ${duration}ms`);
    
    return postsForRanking;
    
  } catch (error) {
    context.log('Error querying posts from Cosmos:', error);
    // Return empty array on error, don't fail the request
    return [];
  }
}

async function enrichPostsWithDetails(postIds: string[], context: InvocationContext): Promise<FeedPost[]> {
  if (postIds.length === 0) return [];
  
  try {
    const postsContainer = getContainer('posts');
    
    const querySpec = {
      query: `
        SELECT c.id, c.text, c.author, c.createdAt, 
               c.stats, c.userInteraction, c.aiScore
        FROM c 
        WHERE ARRAY_CONTAINS(@postIds, c.id)
      `,
      parameters: [
        { name: '@postIds', value: postIds }
      ]
    };
    
    const { resources: posts } = await postsContainer.items.query(querySpec).fetchAll();
    
    // Maintain the order from postIds
    const postMap = new Map(posts.map(p => [p.id, p]));
    const orderedPosts = postIds.map(id => postMap.get(id)).filter(Boolean) as FeedPost[];
    
    context.log(`Enriched ${orderedPosts.length} posts with full details`);
    return orderedPosts;
    
  } catch (error) {
    context.log('Error enriching posts:', error);
    return [];
  }
}

async function getCachedFeed(key: string, context: InvocationContext): Promise<FeedResponse | null> {
  // Only use Redis cache when feature flag is enabled
  if (!isRedisCacheEnabled()) {
    return null;
  }
  
  const result = await getCache<FeedResponse>(key);
  if (result.hit && result.data) {
    context.log(`Redis cache HIT for key ${key} (remaining TTL: ${result.remainingTtl}s)`);
    return result.data;
  } else {
    context.log(`Redis cache MISS for key ${key}`);
    return null;
  }
}

async function setCachedFeed(key: string, feed: FeedResponse, context: InvocationContext): Promise<void> {
  // Only use Redis cache when feature flag is enabled
  if (!isRedisCacheEnabled()) {
    return;
  }
  
  const success = await setCache(key, feed, 30);
  if (success) {
    context.log(`Redis cache SET for key ${key} (30s TTL)`);
  } else {
    context.log(`Redis cache SET failed for key ${key}`);
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

/**
 * Generate appropriate cache headers based on authentication state and cache configuration
 */
export function getCacheHeaders(isAuthenticated: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    'Vary': 'Authorization, x-user-id'
  };

  if (isAuthenticated) {
    // Authenticated users always get private, no-store
    headers['Cache-Control'] = 'private, no-store, must-revalidate';
    headers['X-Cache-Backend'] = 'none';
  } else {
    // Anonymous users get different cache headers based on backend
    const cacheConfig = getCacheConfig();
    
    if (isEdgeCacheEnabled()) {
      headers['Cache-Control'] = `public, s-maxage=${cacheConfig.ttlSeconds}, stale-while-revalidate=${cacheConfig.ttlSeconds * 2}`;
      headers['X-Cache-Backend'] = 'edge';
    } else if (isRedisCacheEnabled()) {
      headers['Cache-Control'] = `public, s-maxage=${cacheConfig.ttlSeconds}, stale-while-revalidate=${cacheConfig.ttlSeconds * 2}`;
      headers['X-Cache-Backend'] = 'redis';
    } else {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['X-Cache-Backend'] = 'none';
    }
  }

  return headers;
}

export async function getFeedInternal(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const timer = new PerformanceTimer('feed_get', context);
  
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const parsedPage = parseInt(url.searchParams.get('page') || '1');
    const parsedLimit = parseInt(url.searchParams.get('limit') || '20');
    const query: FeedQuery = {
      page: Number.isNaN(parsedPage) ? 1 : parsedPage,
      limit: Number.isNaN(parsedLimit) ? 20 : parsedLimit,
      type: (url.searchParams.get('type') as FeedQuery['type']) || 'trending',
      filter: (url.searchParams.get('filter') as FeedQuery['filter']) || 'safe'
    };

    // Validate query parameters
    if (query.page! < 1) query.page = 1;
    if (query.limit! < 1 || query.limit! > 100) query.limit = 20;

    // Handle authentication (optional for anonymous feed)
    let userId = 'anonymous';
    let userTier = 'Free';
    let isAuthenticated = false;
    
    const authResult: AuthResult = authenticateRequest(request);
    if (authResult.success) {
      userId = authResult.userId!;
      userTier = authResult.tier || 'Free';
      isAuthenticated = true;
      
      // Enforce read gate for authenticated users
      try {
        const users = getContainer('users');
        await enforceReadGate({ sub: userId }, users);
      } catch (gateError: any) {
        return {
          status: gateError.status || 403,
          jsonBody: {
            success: false,
            error: gateError.message || 'Access denied'
          }
        };
      }
    }

    // Generate cache key for Redis fallback if enabled
    let cacheKey: string | null = null;
    let cachedFeed: FeedResponse | null = null;
    let cacheHit = false;
    
    if (!isAuthenticated && isRedisCacheEnabled()) {
      cacheKey = generateFeedCacheKey(query.page!, query.limit!);
      cachedFeed = await getCachedFeed(cacheKey, context);
      if (cachedFeed) {
        cacheHit = true;
        context.log(`Anonymous feed Redis cache HIT for key ${cacheKey}`);
        
        // Track cache metrics if Redis is being used
        const metrics = getCacheMetrics();
        context.log('Redis cache hit telemetry:', {
          userId,
          cacheKey,
          page: query.page!.toString(),
          type: query.type!,
          filter: query.filter!,
          ...metrics
        });
        
        // Return with appropriate cache headers
        const headers = getCacheHeaders(isAuthenticated);
        headers['X-Cache-Source'] = 'redis'; // Override to show Redis cache hit
        
        return {
          status: 200,
          headers,
          jsonBody: {
            ...cachedFeed,
            feed: {
              ...cachedFeed.feed,
              algorithm: {
                ...cachedFeed.feed.algorithm,
                ranking: {
                  ...cachedFeed.feed.algorithm.ranking,
                  cacheHit: true
                }
              }
            }
          }
        };
      }
    }

    // Cache miss or authenticated user - query and rank posts
    const startTime = Date.now();
    const posts = await queryPostsFromCosmos(userId, query, context);
    
    // Rank the posts using the ranking system
    const rankedPosts = rankPosts(posts);
    
    // Generate ranking telemetry only if requested
    const processingTime = Date.now() - startTime;
    const collectTelemetry = shouldCollectTelemetry(request);
    
    if (collectTelemetry) {
      const rankingTelemetry = generateRankingTelemetry(
        rankedPosts,
        query.page!,
        query.limit!,
        { recency: 0.5, engagement: 0.3, authorReputation: 0.2 },
        processingTime,
        `feed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      );
      
      context.log('Feed ranking complete:', {
        userId,
        totalPosts: rankingTelemetry.totalPosts.toString(),
        rankedPosts: rankingTelemetry.rankedPosts.toString(),
        avgScore: rankingTelemetry.averageScore.toString(),
        isAuthenticated: isAuthenticated.toString(),
        queryType: query.type!,
        filter: query.filter!,
        processingTimeMs: processingTime
      });
    }
    
    // Paginate the ranked results
    const paginatedResult = paginateRankedPosts(rankedPosts, query.page!, query.limit!);
    
    // Get full post details for the current page
    const postIds = paginatedResult.posts.map(p => p.id);
    const enrichedPosts = await enrichPostsWithDetails(postIds, context);
    
    // Add ranking scores to enriched posts
    const postsWithRanking = enrichedPosts.map(post => {
      const rankedPost = paginatedResult.posts.find(rp => rp.id === post.id);
      return {
        ...post,
        rankingScore: rankedPost?.score || 0
      };
    });
    
    // Build response with conditional ranking metadata
    const feedResponse: FeedResponse = {
      success: true,
      feed: {
        posts: postsWithRanking,
        pagination: {
          currentPage: paginatedResult.pagination.currentPage,
          totalPages: paginatedResult.pagination.totalPages,
          totalItems: paginatedResult.pagination.totalItems,
          hasNext: paginatedResult.pagination.hasNext,
          hasPrevious: paginatedResult.pagination.hasPrevious
        },
        algorithm: {
          type: query.type!,
          userTier,
          appliedFilters: [query.filter!],
          ranking: collectTelemetry ? {
            totalPosts: rankedPosts.length,
            rankedPosts: rankedPosts.length,
            avgScore: rankedPosts.reduce((sum, p) => sum + p.score, 0) / rankedPosts.length || 0,
            cacheHit: false
          } : undefined
        }
      }
    };

    // Cache for Redis fallback if enabled
    if (!isAuthenticated && isRedisCacheEnabled() && cacheKey) {
      await setCachedFeed(cacheKey, feedResponse, context);
      context.log(`Cached anonymous feed in Redis for 30s: ${cacheKey}`);
    }

    // Track feed latency P95 metric
    const duration = timer.stopAndTrack({ 
      user_tier: userTier, 
      feed_type: query.type!, 
      cache_hit: cacheHit.toString() 
    });
    AsoraKPIs.trackFeedLatency(duration, context);

    // Track user event for engagement analytics
    AsoraKPIs.trackUserEvent('feed_request', userId, {
      feed_type: query.type!,
      page: query.page!.toString(),
      limit: query.limit!.toString(),
      user_tier: userTier,
      cache_hit: cacheHit
    }, context);

    // Return response with appropriate cache headers
    const headers = getCacheHeaders(isAuthenticated);

    return {
      status: 200,
      headers,
      jsonBody: feedResponse
    };

  } catch (error) {
    const duration = timer.stop();
    context.log('Feed get error:', error);
    
    // Track error metrics
    AsoraKPIs.trackBusinessMetric('feed_errors', 1, {
      error_type: 'feed_request_error',
      duration_ms: duration.toString()
    }, context);

    return {
      status: 500,
      jsonBody: {
        success: false,
        error: 'Internal server error'
      }
    };
  }
}

// Telemetry-wrapped version of the handler
export const getFeed = withTelemetry('feed_get', getFeedInternal);

app.http('getFeed', {
  methods: ['GET'],
  route: 'feed/get',
  authLevel: 'anonymous',
  handler: getFeed
});
