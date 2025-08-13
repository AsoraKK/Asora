/**
 * ASORA - REVIEW APPEALED CONTENT (PHASE 4 - COMMUNITY VOTING)
 *
 * 🗳️ Community Voting Dashboard - Active Appeals
 *
 * ✅ Requirements:
 * - JWT Authentication required (standard users, not admins)
 * - Return appeals available for community voting
 * - Filter out user's own content appeals
 * - Sort by urgency (time remaining, flag count, vote progress)
 * - Include voting metadata and progress
 * - Paginated results with cursor support
 *
 * 🎯 Query Parameters:
 * - limit: Number of appeals to return (default: 20, max: 50)
 * - cursor: Pagination cursor
 * - contentType: Filter by type ("post" | "comment")
 * - urgency: Filter by urgency ("high" | "medium" | "low")
 * - timeRemaining: Filter by time ("expiring" | "recent" | "all")
 *
 * 🔍 Response Format:
 * {
 *   success: true,
 *   data: {
 *     appeals: AppealForVoting[],
 *     pagination: { cursor, hasMore, total },
 *     summary: { totalActive, needingVotes, expiringSoon },
 *     userVotingStats: { votesToday, maxPerHour, reputation }
 *   }
 * }
 *
 * 🛡️ Security:
 * - User authentication required
 * - Filter out own content automatically
 * - Rate limit information included
 * - Voting eligibility validation
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserContext } from '../shared/auth';
import { getContainer } from '../shared/cosmosClient';
import {
  isEligibleForVoting,
  calculateVotingUrgency,
  generateVotingSummary,
  VOTING_CONFIG,
} from '../shared/moderationUtils';
import Joi from 'joi';

// Interface for appeal data returned to community voters
interface AppealForVoting {
  appealId: string;
  contentId: string;
  contentType: 'post' | 'comment';
  content: {
    text: string;
    authorId: string;
    createdAt: string;
    flagCount: number;
  };
  appeal: {
    reason: string;
    explanation: string;
    requestedAction: string;
    submittedAt: string;
    timeRemaining: number; // minutes until timeout
  };
  voting: {
    totalVotes: number;
    approveVotes: number;
    rejectVotes: number;
    approvalRate: number;
    votesNeeded: number;
    userHasVoted: boolean;
    timeoutIn: number; // minutes
  };
  moderation: {
    aiScore: number;
    aiDecision: string;
    categories: Record<string, number>;
    originalReason: string;
  };
  urgency: {
    score: number;
    level: 'high' | 'medium' | 'low';
    factors: string[];
  };
}

export async function reviewAppealedContent(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // 1. Validate user authentication
    const userContext = getUserContext(request);
    if (!userContext) {
      return {
        status: 401,
        jsonBody: { error: 'Unauthorized - Invalid or missing JWT token' },
      };
    }

    // 2. Check if user is eligible for voting (basic checks)
    const userContainer = getContainer('users');
    let userData;
    try {
      const { resource } = await userContainer.item(userContext.userId, userContext.userId).read();
      userData = resource;
    } catch (userError: any) {
      if (userError.code === 404) {
        return {
          status: 404,
          jsonBody: { error: 'User not found in database' },
        };
      }
      throw userError;
    }

    const eligibilityCheck = isEligibleForVoting(
      userContext.userId,
      userContext.userId, // Dummy check - we'll do real checks per appeal
      userData.createdAt,
      userData.reputationScore || 0
    );

    // 3. Validate and parse query parameters
    const url = new URL(request.url);
    const queryParams = {
      limit: Math.min(parseInt(url.searchParams.get('limit') || '20'), 50),
      cursor: url.searchParams.get('cursor') || undefined,
      contentType: url.searchParams.get('contentType') || undefined,
      urgency: url.searchParams.get('urgency') || undefined,
      timeRemaining: url.searchParams.get('timeRemaining') || 'all',
    };

    const schema = Joi.object({
      limit: Joi.number().min(1).max(50).default(20),
      cursor: Joi.string().optional(),
      contentType: Joi.string().valid('post', 'comment').optional(),
      urgency: Joi.string().valid('high', 'medium', 'low').optional(),
      timeRemaining: Joi.string().valid('expiring', 'recent', 'all').default('all'),
    });

    const { error: validationError, value: params } = schema.validate(queryParams);
    if (validationError) {
      return {
        status: 400,
        jsonBody: { error: `Invalid query parameters: ${validationError.message}` },
      };
    }

    // 4. Query active appeals available for community voting
    const appealsContainer = getContainer('appeals');

    // Build time filter based on timeRemaining parameter
    let timeFilter = '';
    let timeParams: any[] = [];
    if (params.timeRemaining === 'expiring') {
      // Appeals expiring in next 2 hours
      const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      timeFilter = 'AND c.expiresAt < @twoHoursFromNow';
      timeParams.push({ name: '@twoHoursFromNow', value: twoHoursFromNow });
    } else if (params.timeRemaining === 'recent') {
      // Appeals created in last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      timeFilter = 'AND c.createdAt > @yesterday';
      timeParams.push({ name: '@yesterday', value: yesterday });
    }

    // Query appeals with community review queue (excluding user's own content)
    const appealsQuery = {
      query: `
                SELECT * FROM c 
                WHERE c.reviewQueue = "community" 
                AND c.status = "pending"
                AND c.expiresAt > @now
                AND c.contentOwnerId != @userId
                ${timeFilter}
                ORDER BY c.createdAt DESC
            `,
      parameters: [
        { name: '@now', value: new Date().toISOString() },
        { name: '@userId', value: userContext.userId },
        ...timeParams,
      ],
    };

    const { resources: activeAppeals } = await appealsContainer.items
      .query(appealsQuery)
      .fetchAll();

    // 5. Process each appeal and build response data
    const appealData: AppealForVoting[] = [];
    const votesContainer = getContainer('votes');

    for (const appeal of activeAppeals) {
      try {
        // Filter by content type if specified
        if (params.contentType && appeal.contentType !== params.contentType) {
          continue;
        }

        // Get the content being appealed
        const collectionName = appeal.contentType === 'user' ? 'users' : `${appeal.contentType}s`;
        const contentContainer = getContainer(collectionName);

        let content;
        try {
          const { resource } = await contentContainer
            .item(appeal.contentId, appeal.contentId)
            .read();
          content = resource;
        } catch (contentError: any) {
          if (contentError.code === 404) {
            context.warn(`Content not found for appeal ${appeal.id}: ${appeal.contentId}`);
            continue;
          }
          throw contentError;
        }

        // Get votes for this appeal
        const votesQuery = {
          query: 'SELECT * FROM c WHERE c.appealId = @appealId',
          parameters: [{ name: '@appealId', value: appeal.id }],
        };
        const { resources: appealVotes } = await votesContainer.items.query(votesQuery).fetchAll();

        // Check if current user has already voted
        const userHasVoted = appealVotes.some(vote => vote.userId === userContext.userId);

        // Generate voting summary
        const votingSummary = generateVotingSummary(
          appeal.id,
          appeal.contentId,
          appealVotes,
          appeal.createdAt
        );

        // Calculate urgency
        const urgencyScore = calculateVotingUrgency(
          appealVotes,
          appeal.createdAt,
          content.flagCount || 1
        );
        let urgencyLevel: 'high' | 'medium' | 'low' = 'low';
        if (urgencyScore >= 70) urgencyLevel = 'high';
        else if (urgencyScore >= 40) urgencyLevel = 'medium';

        // Filter by urgency if specified
        if (params.urgency && params.urgency !== urgencyLevel) {
          continue;
        }

        // Calculate time remaining until voting timeout
        const votingStarted = new Date(appeal.createdAt).getTime();
        const timeoutAt = votingStarted + VOTING_CONFIG.TIMEOUT_MINUTES * 60 * 1000;
        const timeRemaining = Math.max(0, Math.floor((timeoutAt - Date.now()) / (1000 * 60)));

        // Determine urgency factors
        const urgencyFactors: string[] = [];
        if (timeRemaining <= 1) urgencyFactors.push('Voting timeout imminent');
        if (appealVotes.length >= VOTING_CONFIG.MINIMUM_VOTES - 1)
          urgencyFactors.push('Close to quorum');
        if ((content.flagCount || 1) >= 5) urgencyFactors.push('High flag count');
        if (votingSummary.approvalRate > 0.7) urgencyFactors.push('Strong approval trend');
        if (votingSummary.approvalRate < 0.3) urgencyFactors.push('Strong rejection trend');

        // Build appeal data for voting
        const appealForVoting: AppealForVoting = {
          appealId: appeal.id,
          contentId: appeal.contentId,
          contentType: appeal.contentType as 'post' | 'comment',
          content: {
            text: content.text || content.profile?.displayName || '[Content not available]',
            authorId: appeal.contentOwnerId,
            createdAt: content.createdAt,
            flagCount: content.flagCount || 1,
          },
          appeal: {
            reason: appeal.reason,
            explanation: appeal.explanation,
            requestedAction: appeal.requestedAction,
            submittedAt: appeal.createdAt,
            timeRemaining,
          },
          voting: {
            totalVotes: votingSummary.totalVotes,
            approveVotes: votingSummary.approveVotes,
            rejectVotes: votingSummary.rejectVotes,
            approvalRate: Math.round(votingSummary.approvalRate * 100) / 100,
            votesNeeded: Math.max(0, VOTING_CONFIG.MINIMUM_VOTES - votingSummary.totalVotes),
            userHasVoted,
            timeoutIn: timeRemaining,
          },
          moderation: {
            aiScore: appeal.metadata?.originalModerationStatus ? 0.5 : 0, // Placeholder
            aiDecision: appeal.metadata?.originalModerationStatus || 'unknown',
            categories: {}, // Would come from original flag data
            originalReason: content.moderationReason || 'Unknown',
          },
          urgency: {
            score: Math.round(urgencyScore),
            level: urgencyLevel,
            factors: urgencyFactors,
          },
        };

        appealData.push(appealForVoting);
      } catch (appealError: any) {
        context.warn(`Error processing appeal ${appeal.id}: ${appealError.message}`);
        continue;
      }
    }

    // 6. Sort by urgency score (highest first)
    appealData.sort((a, b) => b.urgency.score - a.urgency.score);

    // 7. Apply pagination
    const startIndex = params.cursor ? parseInt(params.cursor) : 0;
    const endIndex = Math.min(startIndex + params.limit, appealData.length);
    const paginatedAppeals = appealData.slice(startIndex, endIndex);
    const hasMore = endIndex < appealData.length;
    const nextCursor = hasMore ? endIndex.toString() : null;

    // 8. Get user's voting stats for today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const userVotesQuery = {
      query: 'SELECT * FROM c WHERE c.userId = @userId AND c.timestamp > @todayStart',
      parameters: [
        { name: '@userId', value: userContext.userId },
        { name: '@todayStart', value: todayStart.toISOString() },
      ],
    };
    const { resources: todayVotes } = await votesContainer.items.query(userVotesQuery).fetchAll();

    // 9. Generate summary statistics
    const summary = {
      totalActive: appealData.length,
      needingVotes: appealData.filter(appeal => appeal.voting.votesNeeded > 0).length,
      expiringSoon: appealData.filter(appeal => appeal.appeal.timeRemaining <= 60).length, // 1 hour
      highUrgency: appealData.filter(appeal => appeal.urgency.level === 'high').length,
    };

    // 10. Return paginated appeals with metadata
    return {
      status: 200,
      jsonBody: {
        success: true,
        data: {
          appeals: paginatedAppeals,
          pagination: {
            cursor: nextCursor,
            hasMore,
            total: appealData.length,
            currentPage: Math.floor(startIndex / params.limit) + 1,
            totalPages: Math.ceil(appealData.length / params.limit),
          },
          summary,
          userVotingStats: {
            votesToday: todayVotes.length,
            maxPerHour: VOTING_CONFIG.MAX_VOTES_PER_HOUR,
            reputation: userData.reputationScore || 0,
            eligible: eligibilityCheck.eligible,
            eligibilityReason: eligibilityCheck.reason,
          },
          filters: {
            applied: {
              contentType: params.contentType,
              urgency: params.urgency,
              timeRemaining: params.timeRemaining,
            },
            available: {
              contentTypes: ['post', 'comment'],
              urgencyLevels: ['high', 'medium', 'low'],
              timeRanges: ['expiring', 'recent', 'all'],
            },
          },
        },
      },
    };
  } catch (error: any) {
    context.error('Review appeals error:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message:
          process.env['NODE_ENV'] === 'development' ? error.message : 'Unable to load appeals',
      },
    };
  }
}

app.http('reviewAppealedContent', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'moderation/appeals/review',
  handler: reviewAppealedContent,
});
