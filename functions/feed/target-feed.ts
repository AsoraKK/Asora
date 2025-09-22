// Target Feed Implementation
// Single-partition userFeed queries with recipientId

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { createCosmosClient, getTargetDatabase } from '../shared/cosmos-client';
import { verifyJWT } from '../shared/auth-utils';

interface FeedItem {
  id: string;
  recipientId: string;
  postId: string;
  authorId: string;
  type: 'post' | 'repost' | 'reply';
  createdAt: string;
  relevanceScore: number;
}

interface FeedResponse {
  items: FeedItem[];
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Get user's home feed using single-partition queries
 * Target architecture: userFeed container with pk=/recipientId
 */
export async function getUserFeed(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // 1. Authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return {
        status: 401,
        jsonBody: { error: 'Missing authorization header' }
      };
    }

    const token = authHeader.replace('Bearer ', '');
    const jwtPayload = await verifyJWT(token);
    const userUuid = jwtPayload.sub; // Will be user_uuid after auth migration

    if (!userUuid) {
      return {
        status: 401,
        jsonBody: { error: 'Invalid token: missing user ID' }
      };
    }

    // 2. Parse query parameters
    const limit = Math.min(parseInt(request.query.get('limit') || '50'), 50);
    const cursor = request.query.get('cursor');

    // 3. Single-partition query on userFeed (pk=/recipientId)
    const cosmosClient = createCosmosClient();
    const containers = getTargetDatabase(cosmosClient);

    let query = `
      SELECT * FROM c 
      WHERE c.recipientId = @recipientId
      ORDER BY c.createdAt DESC
      OFFSET 0 LIMIT @limit
    `;
    
    const parameters = [
      { name: '@recipientId', value: userUuid },
      { name: '@limit', value: limit }
    ];

    // Add cursor support for pagination
    if (cursor) {
      query = `
        SELECT * FROM c 
        WHERE c.recipientId = @recipientId 
        AND c.createdAt < @cursor
        ORDER BY c.createdAt DESC
        OFFSET 0 LIMIT @limit
      `;
      parameters.push({ name: '@cursor', value: cursor });
    }

    const feedResponse = await containers.userFeed.items
      .query<FeedItem>({
        query,
        parameters
      })
      .fetchAll();

    const feedItems = feedResponse.resources || [];

    // 4. Determine if there are more items
    const hasMore = feedItems.length === limit;
    const nextCursor = hasMore && feedItems.length > 0 
      ? feedItems[feedItems.length - 1].createdAt 
      : undefined;

    const response: FeedResponse = {
      items: feedItems,
      hasMore,
      nextCursor
    };

    context.log(`Returned ${feedItems.length} feed items for user ${userUuid}`);

    return {
      status: 200,
      jsonBody: response,
      headers: {
        'Cache-Control': 'private, max-age=30' // 30-second cache
      }
    };

  } catch (error) {
    context.log('Error getting user feed:', error);
    return {
      status: 500,
      jsonBody: { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

/**
 * Get trending feed (cross-partition, optimized with composite indexes)
 */
export async function getTrendingFeed(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const limit = Math.min(parseInt(request.query.get('limit') || '20'), 50);
    const timeWindow = request.query.get('timeWindow') || '24h';

    const cosmosClient = createCosmosClient();
    const containers = getTargetDatabase(cosmosClient);

    // Calculate time threshold
    const hoursBack = timeWindow === '1h' ? 1 : timeWindow === '6h' ? 6 : 24;
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

    // Cross-partition query with composite index optimization
    const trendingResponse = await containers.postsV2.items
      .query({
        query: `
          SELECT c.postId, c.authorId, c.text, c.createdAt, c.counts
          FROM c 
          WHERE c.status = 'published'
          AND c.createdAt >= @cutoff
          ORDER BY c.counts.likes + c.counts.reposts DESC, c.createdAt DESC
          OFFSET 0 LIMIT @limit
        `,
        parameters: [
          { name: '@cutoff', value: cutoffTime },
          { name: '@limit', value: limit }
        ]
      })
      .fetchAll();

    const trendingPosts = trendingResponse.resources || [];

    context.log(`Returned ${trendingPosts.length} trending posts`);

    return {
      status: 200,
      jsonBody: {
        posts: trendingPosts,
        timeWindow,
        generatedAt: new Date().toISOString()
      },
      headers: {
        'Cache-Control': 'public, max-age=300' // 5-minute cache for trending
      }
    };

  } catch (error) {
    context.log('Error getting trending feed:', error);
    return {
      status: 500,
      jsonBody: { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}