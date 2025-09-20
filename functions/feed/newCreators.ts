/// ASORA SOCIAL FEED - NEW CREATORS ENDPOINT
///
/// 🎯 Purpose: Azure Function for showcasing posts from new/emerging creators
/// 🏗️ Architecture: Azure Functions HTTP trigger with creator discovery logic
/// 🔐 Security: Optional authentication, CORS enabled, input validation
/// 📊 Database: Cosmos DB queries with creator metrics and post freshness
/// 🌟 Discovery: Promotes content from creators with lower follower counts

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from "@azure/cosmos";
import { createSuccessResponse, createErrorResponse } from "../shared/http-utils";
import { encodeCt, decodeCt } from "../shared/paging";
import { validatePagination } from "../shared/validation-utils";
import { getAzureLogger } from "../shared/azure-logger";

const logger = getAzureLogger('feed/newCreators');

// Cosmos DB configuration
const cosmosClient = new CosmosClient(process.env.COSMOS_CONNECTION_STRING || '');
const database = cosmosClient.database(process.env.COSMOS_DATABASE_NAME || 'asora');
const postsContainer = database.container('posts');
const usersContainer = database.container('users'); // For creator metrics

interface NewCreatorsParams {
  page: number;
  pageSize: number;
  maxFollowers?: number; // Maximum follower count to be considered "new"
  minEngagement?: number; // Minimum engagement to show quality content
  timeWindow?: number; // Days to look back for "new" content
}

interface CreatorMetrics {
  authorId: string;
  followerCount: number;
  totalPosts: number;
  accountAge: number; // Days since account creation
  avgEngagement: number;
}

const httpTrigger = async function (
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startTime = Date.now();
  
  try {
    logger.info('New creators feed request started', {
      requestId: context.invocationId,
      query: Object.fromEntries(req.query.entries())
    });

    // Parse and validate query parameters
    const queryParams = Object.fromEntries(req.query.entries());
    const params = parseNewCreatorsParams(queryParams);
    
    const paginationResult = validatePagination(params.page, params.pageSize);
    if (!paginationResult.valid) {
      return createErrorResponse(400, paginationResult.error || 'Invalid pagination');
    }

    // Build new creators query
    const { query, parameters } = buildNewCreatorsQuery(params);
    
    logger.info('Executing new creators query', {
      requestId: context.invocationId,
      maxFollowers: params.maxFollowers,
      minEngagement: params.minEngagement,
      timeWindow: params.timeWindow
    });

    const querySpec = { query, parameters };
    const ctParam = req.query.get('ct') || undefined;
    const state = ctParam ? (decodeCt(ctParam) as any) : undefined;
    const prevToken: string | undefined = state?.c;

    const qStart = Date.now();
    const iterator = postsContainer.items.query(querySpec, { maxItemCount: params.pageSize, continuationToken: prevToken });
    const { resources: posts, requestCharge, activityId, continuationToken } = await iterator.fetchNext();
    const queryDurationMs = Date.now() - qStart;

    logger.info('New creators query completed', {
      requestId: context.invocationId,
      activityId,
      requestCharge,
      resultCount: posts.length,
      queryDurationMs
    });

    const hasMore = !!continuationToken;

    // Transform posts and add creator discovery metadata
    const authHeader = req.headers.get('authorization');
    const transformedPosts = await Promise.all(
      posts.map(post => transformPostWithCreatorInfo(post, authHeader || undefined))
    );

    // Build response with discovery metadata
    const response = {
      posts: transformedPosts,
      hasMore,
      pageSize: params.pageSize,
      discoverySettings: {
        maxFollowers: params.maxFollowers,
        minEngagement: params.minEngagement,
        timeWindow: params.timeWindow
      },
      nextCt: continuationToken ? encodeCt({ v: 1, q: 'newCreators', c: continuationToken }) : undefined
    };

    const duration = Date.now() - startTime;
    
    logger.info('New creators feed request completed successfully', {
      requestId: context.invocationId,
      duration,
      postsReturned: transformedPosts.length,
      discoveryPosts: transformedPosts.filter(p => p.isNewCreator).length
    });

    return createSuccessResponse(response, {
      'X-New-Creators': transformedPosts.filter(p => p.isNewCreator).length.toString(),
      'X-Cosmos-RU': requestCharge?.toString() || '0',
      'X-Query-Duration-ms': queryDurationMs.toString(),
      'X-Next-Page': (!!continuationToken).toString()
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('New creators feed request failed', {
      requestId: context.invocationId,
      error: errorMessage,
      stack: errorStack,
      duration
    });

    return createErrorResponse(
      500, 
      'Failed to load new creators feed',
      process.env.NODE_ENV === 'development' ? errorMessage : undefined
    );
  }
};

function parseNewCreatorsParams(query: any): NewCreatorsParams {
  return {
    page: parseInt(query.page || '1', 10),
    pageSize: Math.min(parseInt(query.pageSize || '20', 10), 50),
    maxFollowers: parseInt(query.maxFollowers || '1000', 10), // Default: under 1k followers
    minEngagement: parseInt(query.minEngagement || '5', 10), // Minimum total engagement
    timeWindow: parseInt(query.timeWindow || '30', 10) // Last 30 days
  };
}

function buildNewCreatorsQuery(params: NewCreatorsParams): { query: string; parameters: any[] } {
  const offset = (params.page - 1) * params.pageSize;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - (params.timeWindow || 30));
  const cutoffDateStr = cutoffDate.toISOString();

  // This query combines posts with engagement and creator freshness
  // In a real implementation, you might want to join with user data or 
  // maintain denormalized creator metrics in post documents
  
  const parameters: any[] = [
    { name: '@cutoffDate', value: cutoffDateStr },
    { name: '@minEngagement', value: params.minEngagement || 5 }
  ];

  const query = `
    SELECT * FROM c 
    WHERE c.createdAt >= @cutoffDate 
      AND (c.likeCount + c.commentCount) >= @minEngagement
    ORDER BY (c.likeCount + c.commentCount - c.dislikeCount) DESC, c.createdAt DESC
    OFFSET ${offset} LIMIT ${params.pageSize}
  `;

  return { query, parameters };
}

async function transformPostWithCreatorInfo(post: any, _authHeader?: string): Promise<any> {
  // In a production implementation, you would:
  // 1. Query user/creator metrics from users container
  // 2. Determine if creator meets "new creator" criteria
  // 3. Add discovery flags and creator information
  
  // For now, we'll simulate this logic
  const creatorMetrics = await getCreatorMetrics(post.authorId);
  const isNewCreator = creatorMetrics ? 
    (creatorMetrics.followerCount <= 1000 && creatorMetrics.accountAge <= 90) : false;

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
    metadata: post.metadata,
    userLiked: false, // TODO: Calculate from user interactions
    userDisliked: false, // TODO: Calculate from user interactions
    isNewCreator,
    creatorInfo: creatorMetrics ? {
      followerCount: creatorMetrics.followerCount,
      accountAge: creatorMetrics.accountAge,
      totalPosts: creatorMetrics.totalPosts
    } : undefined
  };
}

async function getCreatorMetrics(authorId: string): Promise<CreatorMetrics | null> {
  try {
    // Query user metrics from users container
    // This is a simplified version - in production you might cache this data
    const userQuery = {
      query: 'SELECT * FROM c WHERE c.id = @userId',
      parameters: [{ name: '@userId', value: authorId }]
    };

    const { resources: users } = await usersContainer
      .items
      .query(userQuery)
      .fetchAll();

    if (users.length === 0) {
      return null;
    }

    const user = users[0];
    const accountCreated = new Date(user.createdAt || Date.now());
    const accountAge = Math.floor((Date.now() - accountCreated.getTime()) / (1000 * 60 * 60 * 24));

    return {
      authorId,
      followerCount: user.followerCount || 0,
      totalPosts: user.totalPosts || 0,
      accountAge,
      avgEngagement: user.avgEngagement || 0
    };
  } catch (error) {
    logger.warn('Failed to get creator metrics', { authorId, error });
    return null;
  }
}

// Register the function with Azure Functions runtime
app.http('feed-newCreators', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'feed/newCreators',
  handler: httpTrigger
});

export default httpTrigger;
