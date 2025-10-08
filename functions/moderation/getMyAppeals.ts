/**
 * ASORA GET MY APPEALS ENDPOINT
 *
 * 🎯 Purpose: Retrieve user's appeal history with detailed status
 * 🔐 Security: JWT authentication + user ownership verification
 * 📊 Features: Pagination, filtering by status, detailed vote information
 * 🚀 Performance: Optimized queries with indexed searches
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { verifyJWT } from '../shared/auth-utils';

interface AppealSummary {
  appealId: string;
  contentId: string;
  contentType: 'post' | 'comment' | 'user';
  reason: string;
  status: 'pending' | 'resolved' | 'expired';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  submittedAt: string;
  expiresAt?: string;
  resolvedAt?: string;
  finalDecision?: 'approved' | 'rejected';
  votingProgress?: {
    votesFor: number;
    votesAgainst: number;
    totalVotes: number;
    requiredVotes: number;
    hasReachedQuorum: boolean;
  };
  appealDetails?: {
    originalReason?: string;
    evidenceUrls?: string[];
    context?: string;
  };
}

export async function getMyAppeals(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Get my appeals request received');

  try {
    // 1. Authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return {
        status: 401,
        jsonBody: { error: 'Missing authorization header' },
      };
    }

    const token = authHeader.replace('Bearer ', '');
    const jwtPayload = await verifyJWT(token);
    const userId = jwtPayload.sub;

    // 2. Parse query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'all'; // all, pending, resolved, expired
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50); // Max 50 per page
    const sortBy = url.searchParams.get('sortBy') || 'submittedAt'; // submittedAt, urgency, status
    const sortOrder = url.searchParams.get('sortOrder') || 'desc'; // asc, desc

    // Validate parameters
    if (page < 1) {
      return {
        status: 400,
        jsonBody: { error: 'Page must be greater than 0' },
      };
    }

    if (!['all', 'pending', 'resolved', 'expired'].includes(status)) {
      return {
        status: 400,
        jsonBody: { error: 'Status must be one of: all, pending, resolved, expired' },
      };
    }

    if (!['submittedAt', 'urgency', 'status', 'expiresAt'].includes(sortBy)) {
      return {
        status: 400,
        jsonBody: { error: 'sortBy must be one of: submittedAt, urgency, status, expiresAt' },
      };
    }

    // 3. Initialize Cosmos DB
    const cosmosClient = new CosmosClient(process.env.COSMOS_CONNECTION_STRING || '');
    const database = cosmosClient.database('asora');
    const appealsContainer = database.container('appeals');

    // 4. Build query
    let queryText = 'SELECT * FROM c WHERE c.submitterId = @userId';
    const parameters: Array<{ name: string; value: any }> = [{ name: '@userId', value: userId }];

    // Add status filter
    if (status !== 'all') {
      queryText += ' AND c.status = @status';
      parameters.push({ name: '@status', value: status });
    }

    // Add sorting
    const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    queryText += ` ORDER BY c.${sortBy} ${orderDirection}`;

    // 5. Execute query with pagination
    const offset = (page - 1) * limit;
    queryText += ` OFFSET ${offset} LIMIT ${limit}`;

    context.log(`Executing query: ${queryText} with parameters:`, parameters);

    const { resources: appeals } = await appealsContainer.items
      .query({
        query: queryText,
        parameters,
      })
      .fetchAll();

    // 6. Get total count for pagination
    let countQuery = 'SELECT VALUE COUNT(1) FROM c WHERE c.submitterId = @userId';
    const countParameters = [{ name: '@userId', value: userId }];

    if (status !== 'all') {
      countQuery += ' AND c.status = @status';
      countParameters.push({ name: '@status', value: status });
    }

    const { resources: countResult } = await appealsContainer.items
      .query({
        query: countQuery,
        parameters: countParameters,
      })
      .fetchAll();

    const totalCount = countResult[0] || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // 7. Format appeals with detailed information
    const formattedAppeals: AppealSummary[] = appeals.map(appeal => {
      const appealSummary: AppealSummary = {
        appealId: appeal.id,
        contentId: appeal.contentId,
        contentType: appeal.contentType,
        reason: appeal.reason,
        status: appeal.status,
        urgency: appeal.urgency,
        submittedAt: appeal.createdAt,
      };

      // Add optional fields if they exist
      if (appeal.expiresAt) appealSummary.expiresAt = appeal.expiresAt;
      if (appeal.resolvedAt) appealSummary.resolvedAt = appeal.resolvedAt;
      if (appeal.finalDecision) appealSummary.finalDecision = appeal.finalDecision;

      // Add voting progress for active appeals
      if (appeal.status === 'pending') {
        appealSummary.votingProgress = {
          votesFor: appeal.votesFor || 0,
          votesAgainst: appeal.votesAgainst || 0,
          totalVotes: appeal.totalVotes || 0,
          requiredVotes: appeal.requiredVotes || 5,
          hasReachedQuorum: appeal.hasReachedQuorum || false,
        };
      }

      // Add appeal details
      if (appeal.originalReason || appeal.evidenceUrls || appeal.context) {
        appealSummary.appealDetails = {
          originalReason: appeal.originalReason,
          evidenceUrls: appeal.evidenceUrls,
          context: appeal.context,
        };
      }

      return appealSummary;
    });

    // 8. Get quick statistics
    const statsQuery = `
      SELECT 
        COUNT(1) as total,
        SUM(CASE WHEN c.status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN c.status = 'resolved' AND c.finalDecision = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN c.status = 'resolved' AND c.finalDecision = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN c.status = 'expired' THEN 1 ELSE 0 END) as expired
      FROM c WHERE c.submitterId = @userId
    `;

    const { resources: statsResult } = await appealsContainer.items
      .query({
        query: statsQuery,
        parameters: [{ name: '@userId', value: userId }],
      })
      .fetchAll();

    const stats = statsResult[0] || {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      expired: 0,
    };

    context.log(`Retrieved ${appeals.length} appeals for user ${userId}`);

    return {
      status: 200,
      jsonBody: {
        appeals: formattedAppeals,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        statistics: {
          total: stats.total,
          pending: stats.pending,
          approved: stats.approved,
          rejected: stats.rejected,
          expired: stats.expired,
          successRate:
            stats.total > 0
              ? Math.round((stats.approved / (stats.approved + stats.rejected)) * 100)
              : 0,
        },
        filters: {
          status,
          sortBy,
          sortOrder,
        },
      },
    };
  } catch (error) {
    context.log('Error retrieving appeals:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
