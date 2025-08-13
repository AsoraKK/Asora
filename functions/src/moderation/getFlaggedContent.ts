/**
 * ASORA - GET FLAGGED CONTENT (PHASE 3 - ADMIN DASHBOARD)
 *
 * 🧑‍⚖️ Admin Moderation Dashboard Endpoint
 *
 * ✅ Requirements:
 * - ADMIN JWT Authentication required (role: 'admin' or 'moderator')
 * - Query Cosmos DB for content with moderationStatus === "pending_review"
 * - Support pagination with cursor-based navigation
 * - Filter by content type (post/comment/user), priority, time range
 * - Include flag metadata, AI analysis, and user context
 * - Return aggregated flag counts and escalation details
 * - Performance optimized with indexed queries
 *
 * 🔍 Query Parameters:
 * - limit: Number of items to return (default: 50, max: 100)
 * - cursor: Continuation token for pagination
 * - type: Filter by content type ("post" | "comment" | "user")
 * - priority: Filter by urgency ("high" | "medium" | "low")
 * - timeRange: Filter by time ("1h" | "6h" | "24h" | "7d")
 * - sortBy: Sort order ("newest" | "oldest" | "mostFlags" | "highestScore")
 *
 * 🎯 Response Format:
 * {
 *   success: true,
 *   data: {
 *     items: FlaggedContentItem[],
 *     pagination: { cursor, hasMore, total },
 *     summary: { totalPending, highPriority, avgResponseTime }
 *   }
 * }
 *
 * 🛡️ Security:
 * - Requires admin/moderator role validation
 * - Input sanitization and validation
 * - Rate limiting for dashboard requests
 * - Audit logging for admin actions
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserContext } from '../shared/auth';
import { getContainer } from '../shared/cosmosClient';
import Joi from 'joi';

// Type definitions for flagged content items
interface FlaggedContentItem {
  contentId: string;
  contentType: 'post' | 'comment' | 'user';
  content: {
    id: string;
    text?: string;
    authorId: string;
    authorEmail: string;
    createdAt: string;
    visibility: string;
    moderationStatus: string;
  };
  flags: {
    count: number;
    reasons: string[];
    latestFlag: string;
    firstFlag: string;
  };
  aiAnalysis: {
    score: number;
    decision: string;
    categories: Record<string, number>;
    triggeredRules: string[];
  };
  escalation: {
    priority: 'high' | 'medium' | 'low';
    escalatedAt: string;
    daysSinceEscalation: number;
    actionsTaken: string[];
  };
}

export async function getFlaggedContent(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // 1. Validate admin authentication
    const userContext = getUserContext(request);
    if (!userContext) {
      return {
        status: 401,
        jsonBody: { error: 'Unauthorized - Invalid or missing JWT token' },
      };
    }

    // 2. Check if user has admin/moderator role
    if (userContext.role !== 'admin' && userContext.role !== 'moderator') {
      context.warn(
        `Unauthorized dashboard access attempt by user ${userContext.userId} with role ${userContext.role}`
      );
      return {
        status: 403,
        jsonBody: {
          error: 'Forbidden - Admin or moderator role required',
          userRole: userContext.role,
          requiredRoles: ['admin', 'moderator'],
        },
      };
    }

    // 3. Validate and parse query parameters
    const url = new URL(request.url);
    const queryParams = {
      limit: Math.min(parseInt(url.searchParams.get('limit') || '50'), 100),
      cursor: url.searchParams.get('cursor') || undefined,
      type: url.searchParams.get('type') || undefined,
      priority: url.searchParams.get('priority') || undefined,
      timeRange: url.searchParams.get('timeRange') || undefined,
      sortBy: url.searchParams.get('sortBy') || 'newest',
    };

    const schema = Joi.object({
      limit: Joi.number().min(1).max(100).default(50),
      cursor: Joi.string().optional(),
      type: Joi.string().valid('post', 'comment', 'user').optional(),
      priority: Joi.string().valid('high', 'medium', 'low').optional(),
      timeRange: Joi.string().valid('1h', '6h', '24h', '7d').optional(),
      sortBy: Joi.string().valid('newest', 'oldest', 'mostFlags', 'highestScore').default('newest'),
    });

    const { error: validationError, value: params } = schema.validate(queryParams);
    if (validationError) {
      return {
        status: 400,
        jsonBody: { error: `Invalid query parameters: ${validationError.message}` },
      };
    }

    // 4. Build time filter for queries
    let timeFilter = '';
    let timeParams: any[] = [];
    if (params.timeRange) {
      const timeMap = {
        '1h': 1,
        '6h': 6,
        '24h': 24,
        '7d': 168,
      };
      const hoursAgo = timeMap[params.timeRange as keyof typeof timeMap];
      const timeThreshold = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
      timeFilter = 'AND c.updatedAt > @timeThreshold';
      timeParams.push({ name: '@timeThreshold', value: timeThreshold });
    }

    // 5. Query flagged content from multiple collections
    const flaggedItems: FlaggedContentItem[] = [];
    const collections = ['posts', 'comments', 'users'];

    for (const collectionName of collections) {
      // Skip collection if type filter doesn't match
      const contentType = collectionName.slice(0, -1) as 'post' | 'comment' | 'user'; // Remove 's'
      if (params.type && params.type !== contentType) {
        continue;
      }

      const container = getContainer(collectionName);

      // Build query for pending review content
      const contentQuery = {
        query: `
                    SELECT * FROM c 
                    WHERE c.moderationStatus = "pending_review" 
                    ${timeFilter}
                    ORDER BY c.updatedAt DESC
                    OFFSET 0 LIMIT @limit
                `,
        parameters: [{ name: '@limit', value: params.limit }, ...timeParams],
      };

      const { resources: pendingContent } = await container.items.query(contentQuery).fetchAll();

      // 6. For each flagged content, get flag details and AI analysis
      for (const content of pendingContent) {
        try {
          // Get all flags for this content
          const flagsContainer = getContainer('flags');
          const flagsQuery = {
            query: `
                            SELECT * FROM c 
                            WHERE c.targetType = @targetType AND c.targetId = @targetId
                            ORDER BY c.createdAt DESC
                        `,
            parameters: [
              { name: '@targetType', value: contentType },
              { name: '@targetId', value: content.id },
            ],
          };

          const { resources: contentFlags } = await flagsContainer.items
            .query(flagsQuery)
            .fetchAll();

          if (contentFlags.length === 0) continue; // Skip if no flags found

          // Aggregate flag information
          const latestFlag = contentFlags[0];
          const firstFlag = contentFlags[contentFlags.length - 1];
          const reasons = [...new Set(contentFlags.map(f => f.reason).filter(Boolean))];

          // Determine priority based on flag count, AI score, and timing
          const flagCount = contentFlags.length;
          const aiScore = latestFlag.aiAnalysis?.score || 0;
          const daysSinceEscalation = Math.floor(
            (Date.now() - new Date(content.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
          );

          let priority: 'high' | 'medium' | 'low' = 'low';
          if (flagCount >= 5 || aiScore >= 0.8 || daysSinceEscalation >= 3) {
            priority = 'high';
          } else if (flagCount >= 3 || aiScore >= 0.5 || daysSinceEscalation >= 1) {
            priority = 'medium';
          }

          // Filter by priority if specified
          if (params.priority && params.priority !== priority) {
            continue;
          }

          // Build flagged content item
          const flaggedItem: FlaggedContentItem = {
            contentId: content.id,
            contentType,
            content: {
              id: content.id,
              text: content.text || content.profile?.displayName || content.email,
              authorId: content.userId || content.id,
              authorEmail: content.email || 'unknown',
              createdAt: content.createdAt,
              visibility: content.visibility || 'public',
              moderationStatus: content.moderationStatus,
            },
            flags: {
              count: flagCount,
              reasons,
              latestFlag: latestFlag.createdAt,
              firstFlag: firstFlag.createdAt,
            },
            aiAnalysis: {
              score: latestFlag.aiAnalysis?.score || 0,
              decision: latestFlag.aiAnalysis?.decision || 'unknown',
              categories: latestFlag.aiAnalysis?.categories || {},
              triggeredRules: latestFlag.aiAnalysis?.triggeredRules || [],
            },
            escalation: {
              priority,
              escalatedAt: content.updatedAt,
              daysSinceEscalation,
              actionsTaken: contentFlags.filter(f => f.actionTaken).map(f => f.actionTaken.type),
            },
          };

          flaggedItems.push(flaggedItem);
        } catch (flagError: any) {
          context.warn(
            `Error processing flags for ${contentType} ${content.id}: ${flagError.message}`
          );
          continue;
        }
      }
    }

    // 7. Sort results based on sortBy parameter
    flaggedItems.sort((a, b) => {
      switch (params.sortBy) {
        case 'oldest':
          return (
            new Date(a.escalation.escalatedAt).getTime() -
            new Date(b.escalation.escalatedAt).getTime()
          );
        case 'mostFlags':
          return b.flags.count - a.flags.count;
        case 'highestScore':
          return b.aiAnalysis.score - a.aiAnalysis.score;
        case 'newest':
        default:
          return (
            new Date(b.escalation.escalatedAt).getTime() -
            new Date(a.escalation.escalatedAt).getTime()
          );
      }
    });

    // 8. Apply pagination
    const startIndex = params.cursor ? parseInt(params.cursor) : 0;
    const endIndex = Math.min(startIndex + params.limit, flaggedItems.length);
    const paginatedItems = flaggedItems.slice(startIndex, endIndex);
    const hasMore = endIndex < flaggedItems.length;
    const nextCursor = hasMore ? endIndex.toString() : null;

    // 9. Generate summary statistics
    const summary = {
      totalPending: flaggedItems.length,
      highPriority: flaggedItems.filter(item => item.escalation.priority === 'high').length,
      avgResponseTime:
        flaggedItems.length > 0
          ? Math.round(
              (flaggedItems.reduce((sum, item) => sum + item.escalation.daysSinceEscalation, 0) /
                flaggedItems.length) *
                10
            ) / 10
          : 0,
      oldestPending:
        flaggedItems.length > 0
          ? Math.max(...flaggedItems.map(item => item.escalation.daysSinceEscalation))
          : 0,
    };

    // 10. Log admin dashboard access for audit trail
    const auditLogContainer = getContainer('moderationLogs');
    const auditRecord = {
      id: `dashboard-${Date.now()}`,
      type: 'admin_dashboard_access',
      adminUserId: userContext.userId,
      adminEmail: userContext.email,
      queryParams: params,
      resultCount: paginatedItems.length,
      totalPending: summary.totalPending,
      timestamp: new Date().toISOString(),
    };

    try {
      await auditLogContainer.items.create(auditRecord);
    } catch (auditError: any) {
      context.warn(`Failed to log dashboard access: ${auditError.message}`);
    }

    context.log(
      `✅ Admin dashboard accessed by ${userContext.email}: ${paginatedItems.length} items returned`
    );

    // 11. Return paginated flagged content with summary
    return {
      status: 200,
      jsonBody: {
        success: true,
        data: {
          items: paginatedItems,
          pagination: {
            cursor: nextCursor,
            hasMore,
            total: flaggedItems.length,
            currentPage: Math.floor(startIndex / params.limit) + 1,
            totalPages: Math.ceil(flaggedItems.length / params.limit),
          },
          summary,
          filters: {
            applied: {
              type: params.type,
              priority: params.priority,
              timeRange: params.timeRange,
              sortBy: params.sortBy,
            },
            available: {
              types: ['post', 'comment', 'user'],
              priorities: ['high', 'medium', 'low'],
              timeRanges: ['1h', '6h', '24h', '7d'],
              sortOptions: ['newest', 'oldest', 'mostFlags', 'highestScore'],
            },
          },
        },
      },
    };
  } catch (error: any) {
    context.error('Admin dashboard error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message:
          process.env['NODE_ENV'] === 'development'
            ? error.message
            : 'Unable to load flagged content',
      },
    };
  }
}

app.http('getFlaggedContent', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'moderation/flagged',
  handler: getFlaggedContent,
});
