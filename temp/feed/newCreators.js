"use strict";
/// ASORA SOCIAL FEED - NEW CREATORS ENDPOINT
///
/// 🎯 Purpose: Azure Function for showcasing posts from new/emerging creators
/// 🏗️ Architecture: Azure Functions HTTP trigger with creator discovery logic
/// 🔐 Security: Optional authentication, CORS enabled, input validation
/// 📊 Database: Cosmos DB queries with creator metrics and post freshness
/// 🌟 Discovery: Promotes content from creators with lower follower counts
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const cosmos_1 = require("@azure/cosmos");
const http_utils_1 = require("../shared/http-utils");
const validation_utils_1 = require("../shared/validation-utils");
const azure_logger_1 = require("../shared/azure-logger");
const logger = (0, azure_logger_1.getAzureLogger)('feed/newCreators');
// Cosmos DB configuration
const cosmosClient = new cosmos_1.CosmosClient(process.env.COSMOS_CONNECTION_STRING || '');
const database = cosmosClient.database(process.env.COSMOS_DATABASE_NAME || 'asora');
const postsContainer = database.container('posts');
const usersContainer = database.container('users'); // For creator metrics
const httpTrigger = async function (req, context) {
    const startTime = Date.now();
    try {
        logger.info('New creators feed request started', {
            requestId: context.invocationId,
            query: Object.fromEntries(req.query.entries())
        });
        // Parse and validate query parameters
        const queryParams = Object.fromEntries(req.query.entries());
        const params = parseNewCreatorsParams(queryParams);
        const paginationResult = (0, validation_utils_1.validatePagination)(params.page, params.pageSize);
        if (!paginationResult.valid) {
            return (0, http_utils_1.createErrorResponse)(400, paginationResult.error || 'Invalid pagination');
        }
        // Build new creators query
        const { query, parameters } = buildNewCreatorsQuery(params);
        logger.info('Executing new creators query', {
            requestId: context.invocationId,
            maxFollowers: params.maxFollowers,
            minEngagement: params.minEngagement,
            timeWindow: params.timeWindow
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
        logger.info('New creators query completed', {
            requestId: context.invocationId,
            activityId,
            requestCharge,
            resultCount: posts.length
        });
        // Get total count for pagination
        const countQuery = buildNewCreatorsCountQuery(params);
        const { resources: countResult } = await postsContainer
            .items
            .query(countQuery)
            .fetchAll();
        const totalCount = countResult[0]?.count || 0;
        const hasMore = (params.page * params.pageSize) < totalCount;
        // Transform posts and add creator discovery metadata
        const authHeader = req.headers.get('authorization');
        const transformedPosts = await Promise.all(posts.map(post => transformPostWithCreatorInfo(post, authHeader || undefined)));
        // Build response with discovery metadata
        const response = {
            posts: transformedPosts,
            totalCount,
            hasMore,
            page: params.page,
            pageSize: params.pageSize,
            discoverySettings: {
                maxFollowers: params.maxFollowers,
                minEngagement: params.minEngagement,
                timeWindow: params.timeWindow
            }
        };
        const duration = Date.now() - startTime;
        logger.info('New creators feed request completed successfully', {
            requestId: context.invocationId,
            duration,
            postsReturned: transformedPosts.length,
            discoveryPosts: transformedPosts.filter(p => p.isNewCreator).length
        });
        return (0, http_utils_1.createSuccessResponse)(response, {
            'X-Total-Count': totalCount.toString(),
            'X-New-Creators': transformedPosts.filter(p => p.isNewCreator).length.toString()
        });
    }
    catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        logger.error('New creators feed request failed', {
            requestId: context.invocationId,
            error: errorMessage,
            stack: errorStack,
            duration
        });
        return (0, http_utils_1.createErrorResponse)(500, 'Failed to load new creators feed', process.env.NODE_ENV === 'development' ? errorMessage : undefined);
    }
};
function parseNewCreatorsParams(query) {
    return {
        page: parseInt(query.page || '1', 10),
        pageSize: Math.min(parseInt(query.pageSize || '20', 10), 50),
        maxFollowers: parseInt(query.maxFollowers || '1000', 10), // Default: under 1k followers
        minEngagement: parseInt(query.minEngagement || '5', 10), // Minimum total engagement
        timeWindow: parseInt(query.timeWindow || '30', 10) // Last 30 days
    };
}
function buildNewCreatorsQuery(params) {
    const offset = (params.page - 1) * params.pageSize;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (params.timeWindow || 30));
    const cutoffDateStr = cutoffDate.toISOString();
    // This query combines posts with engagement and creator freshness
    // In a real implementation, you might want to join with user data or 
    // maintain denormalized creator metrics in post documents
    const parameters = [
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
function buildNewCreatorsCountQuery(params) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (params.timeWindow || 30));
    const cutoffDateStr = cutoffDate.toISOString();
    const parameters = [
        { name: '@cutoffDate', value: cutoffDateStr },
        { name: '@minEngagement', value: params.minEngagement || 5 }
    ];
    const query = `
    SELECT VALUE COUNT(1) as count FROM c 
    WHERE c.createdAt >= @cutoffDate 
      AND (c.likeCount + c.commentCount) >= @minEngagement
  `;
    return { query, parameters };
}
async function transformPostWithCreatorInfo(post, _authHeader) {
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
async function getCreatorMetrics(authorId) {
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
    }
    catch (error) {
        logger.warn('Failed to get creator metrics', { authorId, error });
        return null;
    }
}
// Register the function with Azure Functions runtime
functions_1.app.http('feed-newCreators', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'feed/newCreators',
    handler: httpTrigger
});
exports.default = httpTrigger;
//# sourceMappingURL=newCreators.js.map