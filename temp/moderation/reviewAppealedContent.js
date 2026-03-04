"use strict";
/**
 * ASORA REVIEW APPEALED CONTENT ENDPOINT
 *
 * 🎯 Purpose: Moderator queue for reviewing appeals and votes
 * 🔐 Security: JWT authentication + moderator role verification
 * 📊 Features: Priority queue, batch operations, detailed context
 * 🚀 Performance: Indexed queries with smart filtering
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewAppealedContent = reviewAppealedContent;
const cosmos_1 = require("@azure/cosmos");
const auth_utils_1 = require("../shared/auth-utils");
async function reviewAppealedContent(request, context) {
    context.log('Review appealed content request received');
    try {
        // 1. Authentication & Authorization
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return {
                status: 401,
                jsonBody: { error: 'Missing authorization header' }
            };
        }
        const token = authHeader.replace('Bearer ', '');
        const jwtPayload = await (0, auth_utils_1.verifyJWT)(token);
        // Check moderator role
        const isModerator = (0, auth_utils_1.hasRole)(jwtPayload, 'moderator') || (0, auth_utils_1.hasRole)(jwtPayload, 'admin');
        if (!isModerator) {
            return {
                status: 403,
                jsonBody: { error: 'Insufficient permissions. Moderator role required.' }
            };
        }
        // 2. Parse query parameters
        const url = new URL(request.url);
        const urgency = url.searchParams.get('urgency') || 'all'; // all, critical, high, medium, low
        const sortBy = url.searchParams.get('sortBy') || 'urgency_time'; // urgency_time, time_remaining, votes
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 25); // Max 25 per page
        const includeExpiringSoon = url.searchParams.get('expiringSoon') === 'true'; // Appeals expiring in < 24h
        // Validate parameters
        if (page < 1) {
            return {
                status: 400,
                jsonBody: { error: 'Page must be greater than 0' }
            };
        }
        if (!['all', 'critical', 'high', 'medium', 'low'].includes(urgency)) {
            return {
                status: 400,
                jsonBody: { error: 'Urgency must be one of: all, critical, high, medium, low' }
            };
        }
        // 3. Initialize Cosmos DB
        const cosmosClient = new cosmos_1.CosmosClient(process.env.COSMOS_CONNECTION_STRING || '');
        const database = cosmosClient.database('asora');
        const appealsContainer = database.container('appeals');
        const votesContainer = database.container('appeal_votes');
        const postsContainer = database.container('posts');
        const usersContainer = database.container('users');
        const flagsContainer = database.container('content_flags');
        // 4. Build appeals query with smart prioritization
        let queryText = 'SELECT * FROM c WHERE c.status = @status';
        const parameters = [
            { name: '@status', value: 'pending' }
        ];
        // Filter by urgency if specified
        if (urgency !== 'all') {
            queryText += ' AND c.urgency = @urgency';
            parameters.push({ name: '@urgency', value: urgency });
        }
        // Filter for expiring soon if requested
        if (includeExpiringSoon) {
            const next24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            queryText += ' AND c.expiresAt <= @expiryThreshold';
            parameters.push({ name: '@expiryThreshold', value: next24Hours });
        }
        // Apply intelligent sorting
        switch (sortBy) {
            case 'urgency_time':
                // Custom sort: Critical first, then by time remaining
                queryText += ' ORDER BY (CASE c.urgency WHEN "critical" THEN 1 WHEN "high" THEN 2 WHEN "medium" THEN 3 ELSE 4 END), c.expiresAt ASC';
                break;
            case 'time_remaining':
                queryText += ' ORDER BY c.expiresAt ASC';
                break;
            case 'votes':
                queryText += ' ORDER BY c.totalVotes DESC';
                break;
            default:
                queryText += ' ORDER BY c.createdAt ASC';
        }
        // Apply pagination
        const offset = (page - 1) * limit;
        queryText += ` OFFSET ${offset} LIMIT ${limit}`;
        context.log(`Executing appeals query: ${queryText}`);
        const { resources: appeals } = await appealsContainer.items
            .query({ query: queryText, parameters })
            .fetchAll();
        // 5. Get total count for pagination
        let countQuery = 'SELECT VALUE COUNT(1) FROM c WHERE c.status = @status';
        const countParams = [{ name: '@status', value: 'pending' }];
        if (urgency !== 'all') {
            countQuery += ' AND c.urgency = @urgency';
            countParams.push({ name: '@urgency', value: urgency });
        }
        if (includeExpiringSoon) {
            const next24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            countQuery += ' AND c.expiresAt <= @expiryThreshold';
            countParams.push({ name: '@expiryThreshold', value: next24Hours });
        }
        const { resources: countResult } = await appealsContainer.items
            .query({ query: countQuery, parameters: countParams })
            .fetchAll();
        const totalCount = countResult[0] || 0;
        // 6. Enrich appeals with detailed context
        const enrichedAppeals = [];
        for (const appeal of appeals) {
            try {
                // Calculate time remaining
                const now = new Date();
                const expiresAt = new Date(appeal.expiresAt);
                const timeRemaining = Math.max(0, Math.round((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60))); // Hours
                // Get submitter info
                let submitterName = 'Unknown User';
                const userHistory = {
                    totalPosts: 0,
                    moderatedPosts: 0,
                    appealSuccess: 0,
                    accountAge: 0
                };
                try {
                    const { resource: submitter } = await usersContainer.item(appeal.submitterId, appeal.submitterId).read();
                    if (submitter) {
                        submitterName = submitter.name || submitter.displayName || 'Anonymous';
                        // Calculate user history stats
                        const accountCreated = new Date(submitter.createdAt || '2020-01-01');
                        userHistory.accountAge = Math.round((now.getTime() - accountCreated.getTime()) / (1000 * 60 * 60 * 24)); // Days
                        // Get user's content stats (simplified)
                        userHistory.totalPosts = submitter.postCount || 0;
                        userHistory.moderatedPosts = submitter.moderatedCount || 0;
                        userHistory.appealSuccess = submitter.appealSuccessCount || 0;
                    }
                }
                catch (error) {
                    context.log(`Could not fetch submitter ${appeal.submitterId}:`, error);
                }
                // Get original content
                let originalContent = { text: 'Content not found' };
                try {
                    const contentContainer = appeal.contentType === 'post' ? postsContainer :
                        appeal.contentType === 'comment' ? database.container('comments') :
                            usersContainer;
                    const { resource: content } = await contentContainer.item(appeal.contentId, appeal.contentId).read();
                    if (content) {
                        originalContent = {
                            text: content.content || content.text || content.bio || 'No text content',
                            imageUrls: content.imageUrls || content.images || [],
                            metadata: {
                                createdAt: content.createdAt,
                                likes: content.likes || 0,
                                comments: content.comments || 0
                            }
                        };
                    }
                }
                catch (error) {
                    context.log(`Could not fetch content ${appeal.contentId}:`, error);
                }
                // Get recent votes
                const votesQuery = {
                    query: 'SELECT * FROM c WHERE c.appealId = @appealId ORDER BY c.createdAt DESC',
                    parameters: [{ name: '@appealId', value: appeal.id }]
                };
                const { resources: votes } = await votesContainer.items.query(votesQuery).fetchAll();
                // Get report context
                let reportContext = {
                    reportCount: 0,
                    reportReasons: [],
                    firstReportedAt: ''
                };
                try {
                    const flagsQuery = {
                        query: 'SELECT * FROM c WHERE c.contentId = @contentId ORDER BY c.createdAt ASC',
                        parameters: [{ name: '@contentId', value: appeal.contentId }]
                    };
                    const { resources: flags } = await flagsContainer.items.query(flagsQuery).fetchAll();
                    if (flags.length > 0) {
                        const reasons = flags.map((f) => f.reason).filter(Boolean);
                        reportContext = {
                            reportCount: flags.length,
                            reportReasons: [...new Set(reasons)],
                            firstReportedAt: flags[0].createdAt
                        };
                    }
                }
                catch (error) {
                    context.log(`Could not fetch flags for ${appeal.contentId}:`, error);
                }
                // Build enriched appeal
                const enrichedAppeal = {
                    appealId: appeal.id,
                    contentId: appeal.contentId,
                    contentType: appeal.contentType,
                    submitterId: appeal.submitterId,
                    submitterName,
                    reason: appeal.reason,
                    urgency: appeal.urgency,
                    status: appeal.status,
                    submittedAt: appeal.createdAt,
                    expiresAt: appeal.expiresAt,
                    timeRemaining,
                    originalContent,
                    originalModerationAction: {
                        action: appeal.originalAction || 'flagged',
                        reason: appeal.originalReason || 'Content flagged for review',
                        flaggedAt: appeal.originalFlaggedAt || appeal.createdAt,
                        moderationScore: appeal.moderationScore,
                        aiConfidence: appeal.aiConfidence
                    },
                    votingStatus: {
                        votesFor: appeal.votesFor || 0,
                        votesAgainst: appeal.votesAgainst || 0,
                        totalVotes: appeal.totalVotes || 0,
                        requiredVotes: appeal.requiredVotes || 5,
                        hasReachedQuorum: appeal.hasReachedQuorum || false,
                        recentVotes: votes.slice(0, 5).map(vote => ({
                            voterId: vote.voterId,
                            voterName: vote.voterName || 'Anonymous',
                            vote: vote.vote,
                            reason: vote.reason,
                            confidence: vote.confidence,
                            votedAt: vote.createdAt,
                            isModerator: vote.isModerator || false,
                            weight: vote.weight || 1
                        }))
                    },
                    context: {
                        userHistory,
                        reportContext
                    }
                };
                enrichedAppeals.push(enrichedAppeal);
            }
            catch (error) {
                context.log(`Error enriching appeal ${appeal.id}:`, error);
            }
        }
        // 7. Generate queue statistics
        const queueStats = {
            totalPending: totalCount,
            expiringSoon: enrichedAppeals.filter(a => a.timeRemaining <= 24).length,
            byUrgency: {
                critical: enrichedAppeals.filter(a => a.urgency === 'critical').length,
                high: enrichedAppeals.filter(a => a.urgency === 'high').length,
                medium: enrichedAppeals.filter(a => a.urgency === 'medium').length,
                low: enrichedAppeals.filter(a => a.urgency === 'low').length
            },
            averageTimeRemaining: enrichedAppeals.length > 0 ?
                Math.round(enrichedAppeals.reduce((sum, a) => sum + a.timeRemaining, 0) / enrichedAppeals.length) : 0
        };
        context.log(`Retrieved ${enrichedAppeals.length} appeals for moderation review`);
        return {
            status: 200,
            jsonBody: {
                appeals: enrichedAppeals,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalCount / limit),
                    totalCount,
                    limit,
                    hasNextPage: page * limit < totalCount,
                    hasPreviousPage: page > 1
                },
                queueStatistics: queueStats,
                filters: {
                    urgency,
                    sortBy,
                    includeExpiringSoon
                }
            }
        };
    }
    catch (error) {
        context.log('Error reviewing appealed content:', error);
        return {
            status: 500,
            jsonBody: {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            }
        };
    }
}
//# sourceMappingURL=reviewAppealedContent.js.map