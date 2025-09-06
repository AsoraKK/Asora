/// ASORA SOCIAL FEED - LOCAL ENDPOINT
///
/// 🎯 Purpose: Azure Function for retrieving location-based feed posts
/// 🏗️ Architecture: Azure Functions HTTP trigger with geographic filtering
/// 🔐 Security: Optional authentication, CORS enabled, input validation
/// 📊 Database: Cosmos DB queries with location metadata filtering
/// 📍 Location: Filters posts by user's current location or specified area

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from "@azure/cosmos";
import { createSuccessResponse, createErrorResponse } from "../shared/http-utils";
import { encodeCt, decodeCt } from "../shared/paging";
import { validatePagination, validateLocation } from "../shared/validation-utils";
import { getAzureLogger } from "../shared/azure-logger";

const logger = getAzureLogger('feed/local');

// Cosmos DB configuration
const cosmosClient = new CosmosClient(process.env.COSMOS_CONNECTION_STRING || '');
const database = cosmosClient.database(process.env.COSMOS_DATABASE_NAME || 'asora');
const postsContainer = database.container('posts');

interface LocalFeedParams {
  page: number;
  pageSize: number;
  location: string;
  radius?: number; // Optional radius in kilometers
  category?: string;
}

const httpTrigger = async function (
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const startTime = Date.now();
  
  try {
    logger.info('Local feed request started', {
      requestId: context.invocationId,
      query: Object.fromEntries(req.query.entries())
    });

    // Parse and validate query parameters
    const queryParams = Object.fromEntries(req.query.entries());
    const params = parseLocalFeedParams(queryParams);
    
    // Validate pagination
    const paginationResult = validatePagination(params.page, params.pageSize);
    if (!paginationResult.valid) {
      return createErrorResponse(400, paginationResult.error || 'Invalid pagination');
    }

    // Validate location parameter
    const locationResult = validateLocation(params.location);
    if (!locationResult.valid) {
      return createErrorResponse(400, locationResult.error || 'Invalid location');
    }

    // Build location-based query
    const { query, parameters } = buildLocalQuery(params);

    const ctParam = req.query.get('ct') || undefined;
    const state = ctParam ? (decodeCt(ctParam) as any) : undefined;
    const prevToken: string | undefined = state?.c;

    logger.info('Executing local feed query', {
      requestId: context.invocationId,
      location: params.location,
      radius: params.radius,
      query
    });

    // Execute with continuation tokens
    const querySpec = { query, parameters };
    const qStart = Date.now();
    const iterator = postsContainer.items.query(querySpec, { maxItemCount: params.pageSize, continuationToken: prevToken });
    const { resources: posts, requestCharge, activityId, continuationToken } = await iterator.fetchNext();
    const queryDurationMs = Date.now() - qStart;

    logger.info('Local feed query completed', {
      requestId: context.invocationId,
      activityId,
      requestCharge,
      resultCount: posts.length,
      queryDurationMs,
      isCrossPartition: true
    });

    const hasMore = !!continuationToken;

    // Transform posts for response
    const authHeader = req.headers.get('authorization');
    const transformedPosts = posts.map(post => transformPostForResponse(post, authHeader || undefined));

    // Build response with location metadata
    const response = {
      posts: transformedPosts,
      hasMore,
      pageSize: params.pageSize,
      location: params.location,
      radius: params.radius,
      nextCt: continuationToken ? encodeCt({ v: 1, q: 'local', c: continuationToken }) : undefined
    };

    const duration = Date.now() - startTime;
    
    logger.info('Local feed request completed successfully', {
      requestId: context.invocationId,
      duration,
      postsReturned: transformedPosts.length,
      location: params.location
    });

    return createSuccessResponse(response, {
      'X-Location': params.location,
      'X-Radius': params.radius?.toString() || '0',
      'X-Cosmos-RU': requestCharge?.toString() || '0',
      'X-Query-Duration-ms': queryDurationMs.toString(),
      'X-Next-Page': (!!continuationToken).toString()
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Local feed request failed', {
      requestId: context.invocationId,
      error: errorMessage,
      stack: errorStack,
      duration
    });

    return createErrorResponse(
      500, 
      'Failed to load local feed',
      process.env.NODE_ENV === 'development' ? errorMessage : undefined
    );
  }
};

function parseLocalFeedParams(query: any): LocalFeedParams {
  return {
    page: parseInt(query.page || '1', 10),
    pageSize: Math.min(parseInt(query.pageSize || '20', 10), 50),
    location: query.location || '',
    radius: query.radius ? parseInt(query.radius, 10) : undefined,
    category: query.category
  };
}

function buildLocalQuery(params: LocalFeedParams): { query: string; parameters: any[] } {
  const offset = (params.page - 1) * params.pageSize;
  let whereClause = 'c.metadata.location = @location';
  const parameters: any[] = [
    { name: '@location', value: params.location }
  ];

  // Add category filter if specified
  if (params.category) {
    whereClause += ' AND c.metadata.category = @category';
    parameters.push({ name: '@category', value: params.category });
  }

  // Note: For true geographic radius filtering, you would need to use 
  // more sophisticated geospatial queries or store lat/lng coordinates
  // This implementation assumes location is a string identifier (city, area, etc.)

  const query = `
    SELECT * FROM c 
    WHERE ${whereClause}
    ORDER BY c.createdAt DESC
    OFFSET ${offset} LIMIT ${params.pageSize}
  `;

  return { query, parameters };
}

function buildLocalCountQuery(params: LocalFeedParams): { query: string; parameters: any[] } {
  let whereClause = 'c.metadata.location = @location';
  const parameters: any[] = [
    { name: '@location', value: params.location }
  ];

  if (params.category) {
    whereClause += ' AND c.metadata.category = @category';
    parameters.push({ name: '@category', value: params.category });
  }

  const query = `
    SELECT VALUE COUNT(1) as count FROM c 
    WHERE ${whereClause}
  `;

  return { query, parameters };
}

function transformPostForResponse(post: any, _authHeader?: string): any {
  // Transform post similar to main feed, adding user interaction status
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
    userDisliked: false // TODO: Calculate from user interactions
  };
}

// Register the function with Azure Functions runtime
app.http('feed-local', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'feed/local',
  handler: httpTrigger
});

export default httpTrigger;
