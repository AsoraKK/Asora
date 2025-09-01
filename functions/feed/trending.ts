/// ASORA TRENDING FEED ENDPOINT
///
/// 🎯 Purpose: Azure Function for retrieving trending social media posts
/// 🏗️ Architecture: Azure Functions HTTP trigger with Cosmos DB integration
/// 📊 Algorithm: Engagement-based ranking with time decay and boost factors
/// 🚀 Performance: Optimized queries with caching and pagination

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from "@azure/cosmos";
import { createSuccessResponse, createErrorResponse, handleCorsAndMethod } from "../shared/http-utils";
import { validatePagination } from "../shared/validation-utils";
import { getAzureLogger } from "../shared/azure-logger";

const logger = getAzureLogger('feed/trending');

// Cosmos DB configuration
const cosmosClient = new CosmosClient(process.env.COSMOS_CONNECTION_STRING || '');
const database = cosmosClient.database(process.env.COSMOS_DATABASE_NAME || 'asora');
const postsContainer = database.container('posts');

interface TrendingQueryParams {
  page: number;
  pageSize: number;
  timeWindow?: string; // '1h', '24h', '7d', '30d'
}

const httpTrigger = async function (
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startTime = Date.now();
  
  try {
    // Handle CORS and method validation
    const corsCheck = handleCorsAndMethod(req.method, ['GET']);
    if (corsCheck.shouldReturn) {
      return corsCheck.response;
    }

    logger.info('Trending feed request started', {
      requestId: context.invocationId,
      query: Object.fromEntries(req.query.entries()),
      method: req.method
    });

    // Parse and validate query parameters
    const queryParams = Object.fromEntries(req.query.entries());
    const params = parseQueryParams(queryParams);
    const validationResult = validatePagination(params.page, params.pageSize);
    
    if (!validationResult.valid) {
      return createErrorResponse(400, validationResult.error || 'Validation failed');
    }

    // Build trending query with engagement-based scoring
    const { query, parameters } = buildTrendingQuery(params);
    
    logger.info('Executing trending query', {
      requestId: context.invocationId,
      query,
      parameters,
      timeWindow: params.timeWindow
    });

    // Execute query with pagination
    const querySpec = {
      query,
      parameters
    };

    const { resources: posts, requestCharge, activityId } = await postsContainer
      .items
      .query(querySpec, {
        maxItemCount: params.pageSize
      })
      .fetchAll();

    logger.info('Trending query completed', {
      requestId: context.invocationId,
      activityId,
      requestCharge,
      resultCount: posts.length,
      timeWindow: params.timeWindow
    });

    // Get total count for trending posts in the time window
    const countQuery = buildTrendingCountQuery(params);
    const { resources: countResult } = await postsContainer
      .items
      .query(countQuery)
      .fetchAll();
    
    const totalCount = countResult[0]?.count || 0;
    const hasMore = (params.page * params.pageSize) < totalCount;

    // Transform posts for response
    const authHeader = req.headers.get('authorization');
    const transformedPosts = posts.map(post => transformPostForResponse(post, authHeader || undefined));

    // Calculate trending metrics for response metadata
    const trendingStats = calculateTrendingStats(transformedPosts);

    // Build response
    const response = {
      posts: transformedPosts,
      totalCount,
      hasMore,
      page: params.page,
      pageSize: params.pageSize,
      trendingWindow: params.timeWindow,
      stats: trendingStats
    };

    const duration = Date.now() - startTime;
    
    logger.info('Trending feed request completed successfully', {
      requestId: context.invocationId,
      duration,
      postsReturned: transformedPosts.length,
      hasMore,
      totalCount,
      timeWindow: params.timeWindow
    });

    return createSuccessResponse(response, {
      'X-Total-Count': totalCount.toString(),
      'X-Page': params.page.toString(),
      'X-Page-Size': params.pageSize.toString(),
      'X-Has-More': hasMore.toString(),
      'X-Trending-Window': params.timeWindow || '24h',
      'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error('Trending feed request failed', {
      requestId: context.invocationId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      duration
    });

    return createErrorResponse(
      500, 
      'Failed to load trending feed',
      process.env.NODE_ENV === 'development' ? errorMessage : undefined
    );
  }
};

function parseQueryParams(query: any): TrendingQueryParams {
  return {
    page: parseInt(query.page || '1', 10),
    pageSize: Math.min(parseInt(query.pageSize || '20', 10), 50), // Max 50 per page
    timeWindow: query.timeWindow || '24h' // Default to 24 hours
  };
}

function buildTrendingQuery(params: TrendingQueryParams): { query: string; parameters: any[] } {
  const offset = (params.page - 1) * params.pageSize;
  const parameters: any[] = [];

  // Calculate time threshold based on window
  const timeThreshold = getTimeThreshold(params.timeWindow || '24h');
  parameters.push({ name: '@timeThreshold', value: timeThreshold });

  // Advanced trending algorithm:
  // Score = (likes - dislikes * 0.5 + comments * 2) * time_decay_factor
  // Time decay: more recent posts get higher scores
  const query = `
    SELECT *, 
           (c.likeCount - c.dislikeCount * 0.5 + c.commentCount * 2) * 
           EXP(-1 * (DateTimeDiff("hour", c.createdAt, GetCurrentDateTime())) * 0.1) AS trendingScore,
           DateTimeDiff("hour", c.createdAt, GetCurrentDateTime()) AS hoursAgo
    FROM c 
    WHERE c.createdAt >= @timeThreshold
    ORDER BY trendingScore DESC, c.createdAt DESC
    OFFSET ${offset} LIMIT ${params.pageSize}
  `;

  return { query, parameters };
}

function buildTrendingCountQuery(params: TrendingQueryParams): { query: string; parameters: any[] } {
  const parameters: any[] = [];
  const timeThreshold = getTimeThreshold(params.timeWindow || '24h');
  parameters.push({ name: '@timeThreshold', value: timeThreshold });

  const query = `
    SELECT VALUE COUNT(1) as count 
    FROM c 
    WHERE c.createdAt >= @timeThreshold
  `;

  return { query, parameters };
}

function getTimeThreshold(timeWindow: string): string {
  const now = new Date();
  let hoursBack: number;

  switch (timeWindow) {
    case '1h':
      hoursBack = 1;
      break;
    case '24h':
      hoursBack = 24;
      break;
    case '7d':
      hoursBack = 24 * 7;
      break;
    case '30d':
      hoursBack = 24 * 30;
      break;
    default:
      hoursBack = 24; // Default to 24 hours
  }

  const threshold = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
  return threshold.toISOString();
}

function transformPostForResponse(post: any, _authHeader?: string): any {
  // Calculate trending score for display
  const hoursAgo = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
  const engagementScore = post.likeCount - post.dislikeCount * 0.5 + post.commentCount * 2;
  const timeDecay = Math.exp(-hoursAgo * 0.1);
  const trendingScore = Math.round(engagementScore * timeDecay);

  return {
    id: post.id,
    authorId: post.authorId,
    authorUsername: post.authorUsername,
    text: post.text,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    likeCount: post.likeCount,
    dislikeCount: post.dislikeCount,
    commentCount: post.commentCount,
    mediaUrls: post.mediaUrls,
    moderation: post.moderation,
    metadata: {
      ...post.metadata,
      trendingScore,
      hoursAgo: Math.round(hoursAgo * 10) / 10 // Round to 1 decimal
    },
    userLiked: false, // TODO: Calculate from user interactions
    userDisliked: false // TODO: Calculate from user interactions
  };
}

function calculateTrendingStats(posts: any[]): any {
  if (posts.length === 0) {
    return {
      averageEngagement: 0,
      topScore: 0,
      totalEngagements: 0
    };
  }

  const engagements = posts.map(post => 
    post.likeCount + post.dislikeCount + post.commentCount
  );

  const totalEngagements = engagements.reduce((sum, eng) => sum + eng, 0);
  const averageEngagement = Math.round(totalEngagements / posts.length);
  const topScore = posts[0]?.metadata?.trendingScore || 0;

  return {
    averageEngagement,
    topScore,
    totalEngagements
  };
}

// Register the function with Azure Functions runtime
app.http('trending', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'feed/trending',
  handler: httpTrigger
});

export default httpTrigger;
