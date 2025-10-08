/// ASORA SOCIAL FEED - FOLLOWING ENDPOINT
///
/// 🎯 Purpose: Azure Function for retrieving posts from users you follow
/// 🏗️ Architecture: Azure Functions HTTP trigger with user relationships
/// 🔐 Security: Requires authentication, CORS enabled, input validation
/// 📊 Database: Cosmos DB queries with following relationships and post filtering
/// 👥 Social: Shows content from followed creators in chronological order

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { createSuccessResponse, createErrorResponse } from '../shared/http-utils';
import { validatePagination } from '../shared/validation-utils';
import { getAzureLogger } from '../shared/azure-logger';
import { decodeCt, encodeCt, kWayMergeByCreatedAt } from '../shared/paging';

const logger = getAzureLogger('feed/following');

// Cosmos DB configuration
const cosmosClient = new CosmosClient(process.env.COSMOS_CONNECTION_STRING || '');
const database = cosmosClient.database(process.env.COSMOS_DATABASE_NAME || 'asora');
const postsContainer = database.container('posts');
const relationshipsContainer = database.container('relationships'); // User following data

interface FollowingFeedParams {
  page: number;
  pageSize: number;
  userId: string; // Extracted from auth token
  includeRecommended?: boolean; // Include some recommended posts if feed is sparse
}

interface Following {
  followerId: string;
  followingId: string;
  createdAt: string;
}

const httpTrigger = async function (
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startTime = Date.now();

  try {
    logger.info('Following feed request started', {
      requestId: context.invocationId,
      query: Object.fromEntries(req.query.entries()),
    });

    // Extract user ID from authentication header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return createErrorResponse(401, 'Authentication required for following feed');
    }

    const userId = extractUserIdFromToken(authHeader);
    if (!userId) {
      return createErrorResponse(401, 'Invalid authentication token');
    }

    // Parse and validate query parameters
    const queryParams = Object.fromEntries(req.query.entries());
    const params = parseFollowingFeedParams(queryParams, userId);

    const paginationResult = validatePagination(params.page, params.pageSize);
    if (!paginationResult.valid) {
      return createErrorResponse(400, paginationResult.error || 'Invalid pagination');
    }

    // Get list of users this user is following
    const followingUsers = await getFollowingUsers(userId);

    if (followingUsers.length === 0) {
      // User isn't following anyone - return empty feed or recommended content
      logger.info('User not following anyone', {
        requestId: context.invocationId,
        userId,
      });

      if (params.includeRecommended) {
        return await getRecommendedFeed(params, context);
      } else {
        return createSuccessResponse({
          posts: [],
          totalCount: 0,
          hasMore: false,
          page: params.page,
          pageSize: params.pageSize,
          followingCount: 0,
        });
      }
    }

    // Fan-out & merge to avoid cross-partition scans
    const MAX_PARTITIONS = 25;
    const ctParam = req.query.get('ct') || undefined;
    const state = ctParam ? (decodeCt(ctParam) as any) : undefined;
    const authorOffset: number = state?.authorOffset ?? 0;
    const authorsSlice = followingUsers.slice(authorOffset, authorOffset + MAX_PARTITIONS);
    const perAuthorPage = Math.max(
      1,
      Math.ceil(params.pageSize / Math.max(1, authorsSlice.length))
    );

    let totalRU = 0;
    const shards: Array<{ items: any[]; authorId: string; nextToken?: string }> = [];
    const qStart = Date.now();

    if (authorsSlice.length === 1) {
      const aid = authorsSlice[0];
      const prevToken: string | undefined = state?.cursors?.[aid]?.token;
      const iterator = postsContainer.items.query(
        {
          query: `SELECT TOP ${perAuthorPage} * FROM c WHERE c.authorId = @aid ORDER BY c.createdAt DESC`,
          parameters: [{ name: '@aid', value: aid }],
        },
        { partitionKey: aid as any, maxItemCount: perAuthorPage, continuationToken: prevToken }
      );
      const { resources, requestCharge, continuationToken } = await iterator.fetchNext();
      totalRU += (requestCharge as number) || 0;
      shards.push({ items: resources || [], authorId: aid, nextToken: continuationToken });
    } else {
      for (const aid of authorsSlice) {
        const prevToken: string | undefined = state?.cursors?.[aid]?.token;
        const iterator = postsContainer.items.query(
          {
            query: `SELECT TOP ${perAuthorPage} * FROM c WHERE c.authorId = @aid ORDER BY c.createdAt DESC`,
            parameters: [{ name: '@aid', value: aid }],
          },
          { partitionKey: aid as any, maxItemCount: perAuthorPage, continuationToken: prevToken }
        );
        const { resources, requestCharge, continuationToken } = await iterator.fetchNext();
        totalRU += (requestCharge as number) || 0;
        shards.push({ items: resources || [], authorId: aid, nextToken: continuationToken });
      }
    }

    const merged = kWayMergeByCreatedAt(
      shards.map(s => s.items),
      params.pageSize
    );
    const transformedPosts = merged.map(post => transformPostForResponse(post, userId));

    // Build next continuation token
    const cursors: Record<string, { token: string }> = {};
    let anyShardHasMore = false;
    for (const s of shards) {
      if (s.nextToken) {
        cursors[s.authorId] = { token: s.nextToken };
        anyShardHasMore = true;
      }
    }
    const moreAuthorsRemain = authorOffset + MAX_PARTITIONS < followingUsers.length;
    const nextState =
      anyShardHasMore || moreAuthorsRemain
        ? { authorOffset: anyShardHasMore ? authorOffset : authorOffset + MAX_PARTITIONS, cursors }
        : undefined;
    const nextCt = nextState ? encodeCt(nextState) : undefined;

    const response = {
      posts: transformedPosts,
      nextCt,
      pageSize: params.pageSize,
      followingCount: followingUsers.length,
    };

    const duration = Date.now() - startTime;

    const queryDurationMs = Date.now() - qStart;
    logger.info('Following feed request completed successfully', {
      requestId: context.invocationId,
      duration,
      postsReturned: transformedPosts.length,
      followingCount: followingUsers.length,
      ru: totalRU,
      queryDurationMs,
      next: !!nextCt,
    });

    return createSuccessResponse(response, {
      'X-Following-Count': followingUsers.length.toString(),
      'X-Cosmos-RU': totalRU.toFixed(2),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error('Following feed request failed', {
      requestId: context.invocationId,
      error: errorMessage,
      stack: errorStack,
      duration,
    });

    return createErrorResponse(
      500,
      'Failed to load following feed',
      process.env.NODE_ENV === 'development' ? errorMessage : undefined
    );
  }
};

function parseFollowingFeedParams(query: any, userId: string): FollowingFeedParams {
  return {
    page: parseInt(query.page || '1', 10),
    pageSize: Math.min(parseInt(query.pageSize || '20', 10), 50),
    userId,
    includeRecommended: query.includeRecommended === 'true',
  };
}

async function getFollowingUsers(userId: string): Promise<string[]> {
  try {
    const query = {
      query: 'SELECT c.followingId FROM c WHERE c.followerId = @userId',
      parameters: [{ name: '@userId', value: userId }],
    };

    const { resources: relationships } = await relationshipsContainer.items.query(query).fetchAll();

    return relationships.map((rel: Following) => rel.followingId);
  } catch (error) {
    logger.warn('Failed to get following users', { userId, error });
    return [];
  }
}

async function getRecommendedFeed(
  params: FollowingFeedParams,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // Fallback to trending content when user isn't following anyone
  logger.info('Returning recommended content for following feed', {
    requestId: context.invocationId,
    userId: params.userId,
  });

  const offset = (params.page - 1) * params.pageSize;

  const query = `
    SELECT * FROM c 
    ORDER BY (c.likeCount - c.dislikeCount + c.commentCount) DESC, c.createdAt DESC
    OFFSET ${offset} LIMIT ${params.pageSize}
  `;

  const { resources: posts } = await postsContainer.items
    .query({ query, parameters: [] })
    .fetchAll();

  const transformedPosts = posts.map(post => ({
    ...transformPostForResponse(post, params.userId),
    isRecommended: true,
  }));

  return createSuccessResponse({
    posts: transformedPosts,
    totalCount: posts.length,
    hasMore: posts.length === params.pageSize,
    page: params.page,
    pageSize: params.pageSize,
    followingCount: 0,
    isRecommended: true,
  });
}

function extractUserIdFromToken(authHeader: string): string | null {
  try {
    // In a real implementation, you would:
    // 1. Extract the JWT token from "Bearer <token>"
    // 2. Verify the token signature
    // 3. Decode the payload to get user ID
    // 4. Check token expiration and validity

    // For now, we'll simulate this
    if (!authHeader.startsWith('Bearer ')) {
      return null;
    }

    // TODO: Implement actual JWT validation
    // const token = authHeader.substring(7);
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // return decoded.sub || decoded.userId;

    // Temporary placeholder - in real implementation this would be validated
    return 'user-123'; // Placeholder user ID
  } catch (error) {
    logger.warn('Failed to extract user ID from token', { error });
    return null;
  }
}

function transformPostForResponse(post: any, _userId: string): any {
  // TODO: Query user's interaction history for this post
  // For now, return default values
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
  };
}

// Register the function with Azure Functions runtime
app.http('feed-following', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous', // We handle auth manually in the function
  route: 'feed/following',
  handler: httpTrigger,
});

export default httpTrigger;
