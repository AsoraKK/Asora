"use strict";
/// ASORA SOCIAL FEED - FOLLOWING ENDPOINT
///
/// 🎯 Purpose: Azure Function for retrieving posts from users you follow
/// 🏗️ Architecture: Azure Functions HTTP trigger with user relationships
/// 🔐 Security: Requires authentication, CORS enabled, input validation
/// 📊 Database: Cosmos DB queries with following relationships and post filtering
/// 👥 Social: Shows content from followed creators in chronological order
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const cosmos_1 = require("@azure/cosmos");
const http_utils_1 = require("../shared/http-utils");
const validation_utils_1 = require("../shared/validation-utils");
const azure_logger_1 = require("../shared/azure-logger");
const logger = (0, azure_logger_1.getAzureLogger)('feed/following');
// Cosmos DB configuration
const cosmosClient = new cosmos_1.CosmosClient(process.env.COSMOS_CONNECTION_STRING || '');
const database = cosmosClient.database(process.env.COSMOS_DATABASE_NAME || 'asora');
const postsContainer = database.container('posts');
const relationshipsContainer = database.container('relationships'); // User following data
const httpTrigger = async function (req, context) {
    const startTime = Date.now();
    try {
        logger.info('Following feed request started', {
            requestId: context.invocationId,
            query: Object.fromEntries(req.query.entries())
        });
        // Extract user ID from authentication header
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return (0, http_utils_1.createErrorResponse)(401, 'Authentication required for following feed');
        }
        const userId = extractUserIdFromToken(authHeader);
        if (!userId) {
            return (0, http_utils_1.createErrorResponse)(401, 'Invalid authentication token');
        }
        // Parse and validate query parameters
        const queryParams = Object.fromEntries(req.query.entries());
        const params = parseFollowingFeedParams(queryParams, userId);
        const paginationResult = (0, validation_utils_1.validatePagination)(params.page, params.pageSize);
        if (!paginationResult.valid) {
            return (0, http_utils_1.createErrorResponse)(400, paginationResult.error || 'Invalid pagination');
        }
        // Get list of users this user is following
        const followingUsers = await getFollowingUsers(userId);
        if (followingUsers.length === 0) {
            // User isn't following anyone - return empty feed or recommended content
            logger.info('User not following anyone', {
                requestId: context.invocationId,
                userId
            });
            if (params.includeRecommended) {
                return await getRecommendedFeed(params, context);
            }
            else {
                return (0, http_utils_1.createSuccessResponse)({
                    posts: [],
                    totalCount: 0,
                    hasMore: false,
                    page: params.page,
                    pageSize: params.pageSize,
                    followingCount: 0
                });
            }
        }
        // Build following feed query
        const { query, parameters } = buildFollowingQuery(params, followingUsers);
        logger.info('Executing following feed query', {
            requestId: context.invocationId,
            userId,
            followingCount: followingUsers.length
        });
        // Execute query
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
        logger.info('Following feed query completed', {
            requestId: context.invocationId,
            activityId,
            requestCharge,
            resultCount: posts.length
        });
        // Get total count for pagination
        const countQuery = buildFollowingCountQuery(followingUsers);
        const { resources: countResult } = await postsContainer
            .items
            .query(countQuery)
            .fetchAll();
        const totalCount = countResult[0]?.count || 0;
        const hasMore = (params.page * params.pageSize) < totalCount;
        // Transform posts for response with user interaction data
        const transformedPosts = posts.map(post => transformPostForResponse(post, userId));
        // Build response
        const response = {
            posts: transformedPosts,
            totalCount,
            hasMore,
            page: params.page,
            pageSize: params.pageSize,
            followingCount: followingUsers.length
        };
        const duration = Date.now() - startTime;
        logger.info('Following feed request completed successfully', {
            requestId: context.invocationId,
            duration,
            postsReturned: transformedPosts.length,
            followingCount: followingUsers.length
        });
        return (0, http_utils_1.createSuccessResponse)(response, {
            'X-Total-Count': totalCount.toString(),
            'X-Following-Count': followingUsers.length.toString()
        });
    }
    catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error('Following feed request failed', {
            requestId: context.invocationId,
            error: errorMessage,
            stack: errorStack,
            duration
        });
        return (0, http_utils_1.createErrorResponse)(500, 'Failed to load following feed', process.env.NODE_ENV === 'development' ? errorMessage : undefined);
    }
};
function parseFollowingFeedParams(query, userId) {
    return {
        page: parseInt(query.page || '1', 10),
        pageSize: Math.min(parseInt(query.pageSize || '20', 10), 50),
        userId,
        includeRecommended: query.includeRecommended === 'true'
    };
}
async function getFollowingUsers(userId) {
    try {
        const query = {
            query: 'SELECT c.followingId FROM c WHERE c.followerId = @userId',
            parameters: [{ name: '@userId', value: userId }]
        };
        const { resources: relationships } = await relationshipsContainer
            .items
            .query(query)
            .fetchAll();
        return relationships.map((rel) => rel.followingId);
    }
    catch (error) {
        logger.warn('Failed to get following users', { userId, error });
        return [];
    }
}
function buildFollowingQuery(params, followingUsers) {
    const offset = (params.page - 1) * params.pageSize;
    // Create parameter placeholders for the IN clause
    const placeholders = followingUsers.map((_, index) => `@author${index}`).join(', ');
    const parameters = followingUsers.map((authorId, index) => ({
        name: `@author${index}`,
        value: authorId
    }));
    const query = `
    SELECT * FROM c 
    WHERE c.authorId IN (${placeholders})
    ORDER BY c.createdAt DESC
    OFFSET ${offset} LIMIT ${params.pageSize}
  `;
    return { query, parameters };
}
function buildFollowingCountQuery(followingUsers) {
    const placeholders = followingUsers.map((_, index) => `@author${index}`).join(', ');
    const parameters = followingUsers.map((authorId, index) => ({
        name: `@author${index}`,
        value: authorId
    }));
    const query = `
    SELECT VALUE COUNT(1) as count FROM c 
    WHERE c.authorId IN (${placeholders})
  `;
    return { query, parameters };
}
async function getRecommendedFeed(params, context) {
    // Fallback to trending content when user isn't following anyone
    logger.info('Returning recommended content for following feed', {
        requestId: context.invocationId,
        userId: params.userId
    });
    const offset = (params.page - 1) * params.pageSize;
    const query = `
    SELECT * FROM c 
    ORDER BY (c.likeCount - c.dislikeCount + c.commentCount) DESC, c.createdAt DESC
    OFFSET ${offset} LIMIT ${params.pageSize}
  `;
    const { resources: posts } = await postsContainer
        .items
        .query({ query, parameters: [] })
        .fetchAll();
    const transformedPosts = posts.map(post => ({
        ...transformPostForResponse(post, params.userId),
        isRecommended: true
    }));
    return (0, http_utils_1.createSuccessResponse)({
        posts: transformedPosts,
        totalCount: posts.length,
        hasMore: posts.length === params.pageSize,
        page: params.page,
        pageSize: params.pageSize,
        followingCount: 0,
        isRecommended: true
    });
}
function extractUserIdFromToken(authHeader) {
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
    }
    catch (error) {
        logger.warn('Failed to extract user ID from token', { error });
        return null;
    }
}
function transformPostForResponse(post, _userId) {
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
        userDisliked: false // TODO: Calculate from user interactions
    };
}
// Register the function with Azure Functions runtime
functions_1.app.http('feed-following', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous', // We handle auth manually in the function
    route: 'feed/following',
    handler: httpTrigger
});
exports.default = httpTrigger;
//# sourceMappingURL=following.js.map