/**
 * ASORA USER DATA EXPORT ENDPOINT
 * 
 * 🎯 Purpose: GDPR Article 20 (Data Portability) compliance - Export user data
 * 🔐 Security: JWT authentication + user ownership verification + rate limiting
 * 📊 Features: Complete data aggregation, rate limiting, privacy-safe export
 * 🏗️ Architecture: Multi-source data collection with structured JSON output
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { requireUser, isHttpError, json } from '../shared/auth-utils';
import { createRateLimiter } from '../shared/rate-limiter';

interface UserDataExport {
  metadata: {
    exportedAt: string;
    exportedBy: string;
    dataVersion: string;
    exportId: string;
    retentionPeriod: string;
  };
  userProfile: {
    id: string;
    displayName: string;
    email?: string;
    createdAt: string;
    lastLoginAt?: string;
    tier: string;
    preferences?: Record<string, any>;
    statistics: {
      totalPosts: number;
      totalComments: number;
      totalLikes: number;
      totalFlags: number;
      accountAgeInDays: number;
    };
  };
  content: {
    posts: Array<{
      id: string;
      content: string;
      createdAt: string;
      updatedAt?: string;
      status: string;
      likes: number;
      comments: number;
      tags?: string[];
      imageUrls?: string[];
      moderationInfo?: {
        flagged: boolean;
        flagReason?: string;
        flaggedAt?: string;
      };
    }>;
    comments: Array<{
      id: string;
      content: string;
      createdAt: string;
      postId: string;
      parentCommentId?: string;
      likes: number;
      status: string;
    }>;
  };
  interactions: {
    likes: Array<{
      contentId: string;
      contentType: 'post' | 'comment';
      likedAt: string;
    }>;
    flags: Array<{
      id: string;
      contentId: string;
      contentType: 'post' | 'comment' | 'user';
      reason: string;
      description?: string;
      flaggedAt: string;
      status: string;
    }>;
  };
  moderation: {
    appeals: Array<{
      id: string;
      contentId: string;
      reason: string;
      status: string;
      submittedAt: string;
      resolvedAt?: string;
      finalDecision?: string;
    }>;
    votes: Array<{
      appealId: string;
      vote: 'approve' | 'reject';
      reason: string;
      votedAt: string;
    }>;
  };
  privacy: {
    previousExports: Array<{
      exportId: string;
      exportedAt: string;
    }>;
    dataRequests: Array<{
      type: 'export' | 'deletion';
      requestedAt: string;
      status: string;
    }>;
  };
}

// Rate limiter for export requests (1 per 24 hours per user)
const exportRateLimiter = createRateLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: 1,
  keyGenerator: (req: HttpRequest) => {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      return `privacy_export:${decoded.sub}`;
    } catch {
      return 'privacy_export:unknown';
    }
  }
});

export async function exportUser(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const exportId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  context.log(`Data export request received - Export ID: ${exportId}`);

  try {
    // 1. Authentication - throws HttpError(401) if invalid
    const user = requireUser(context, request);
    const userId = user.sub;

    // 2. Rate limiting check
    const rateLimitResult = await exportRateLimiter.checkRateLimit(request);
    if (rateLimitResult.blocked) {
      context.log(`Export rate limited for user: ${userId}`);
      return json(429, {
        code: 'rate_limit_exceeded',
        message: 'You can only export your data once every 24 hours',
        resetTime: rateLimitResult.resetTime,
        limit: rateLimitResult.limit
      });
    }

    // 3. Initialize Cosmos DB
    const cosmosConnectionString = process.env.COSMOS_CONNECTION_STRING;
    if (!cosmosConnectionString) {
      context.error('COSMOS_CONNECTION_STRING environment variable is missing or empty.');
      return json(500, {
        code: 'configuration_error',
        message: 'Server misconfiguration: database connection string is missing.',
        exportId
      });
    }
    const cosmosClient = new CosmosClient(cosmosConnectionString);
    const database = cosmosClient.database('asora');
    const usersContainer = database.container('users');
    const postsContainer = database.container('posts');
    const commentsContainer = database.container('comments');
    const flagsContainer = database.container('content_flags');
    const appealsContainer = database.container('appeals');
    const votesContainer = database.container('appeal_votes');
    const likesContainer = database.container('likes');

    context.log(`Starting comprehensive data export for user: ${userId}`);

    // 4. Get user profile data
    let userProfile: any = {};
    let accountCreationDate = new Date();
    
    try {
      const { resource: user } = await usersContainer.item(userId, userId).read();
      if (user) {
        accountCreationDate = new Date(user.createdAt || '2020-01-01');
        userProfile = {
          id: user.id,
          displayName: user.displayName || user.name || 'Anonymous',
          email: user.email,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt || user.lastLogin,
          tier: user.tier || 'freemium',
          preferences: user.preferences || {},
          statistics: {
            totalPosts: 0, // Will be calculated below
            totalComments: 0, // Will be calculated below
            totalLikes: 0, // Will be calculated below
            totalFlags: 0, // Will be calculated below
            accountAgeInDays: Math.round((Date.now() - accountCreationDate.getTime()) / (1000 * 60 * 60 * 24))
          }
        };
      } else {
        context.log(`Warning: User profile not found for ${userId}, using minimal data`);
        userProfile = {
          id: userId,
          displayName: 'User',
          createdAt: new Date().toISOString(),
          tier: 'freemium',
          statistics: {
            totalPosts: 0,
            totalComments: 0,
            totalLikes: 0,
            totalFlags: 0,
            accountAgeInDays: 0
          }
        };
      }
    } catch (error) {
      context.log(`Error fetching user profile for ${userId}:`, error);
      userProfile = {
        id: userId,
        displayName: 'User',
        createdAt: new Date().toISOString(),
        tier: 'freemium',
        statistics: { totalPosts: 0, totalComments: 0, totalLikes: 0, totalFlags: 0, accountAgeInDays: 0 }
      };
    }

    // 5. Get all user posts
    const userPosts: any[] = [];
    try {
      const postsQuery = {
        query: 'SELECT * FROM c WHERE c.authorId = @userId ORDER BY c.createdAt DESC',
        parameters: [{ name: '@userId', value: userId }]
      };
      const { resources: posts } = await postsContainer.items.query(postsQuery).fetchAll();
      
      posts.forEach(post => {
        userPosts.push({
          id: post.id,
          content: post.content || post.text || '',
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          status: post.status || 'published',
          likes: post.likes || 0,
          comments: post.commentCount || post.comments || 0,
          tags: post.tags || [],
          imageUrls: post.imageUrls || post.images || [],
          moderationInfo: {
            flagged: post.isFlagged || false,
            flagReason: post.flagReason,
            flaggedAt: post.flaggedAt
          }
        });
      });

      userProfile.statistics.totalPosts = userPosts.length;
      context.log(`Found ${userPosts.length} posts for user ${userId}`);
    } catch (error) {
      context.log(`Error fetching posts for ${userId}:`, error);
    }

    // 6. Get all user comments
    const userComments: any[] = [];
    try {
      const commentsQuery = {
        query: 'SELECT * FROM c WHERE c.authorId = @userId ORDER BY c.createdAt DESC',
        parameters: [{ name: '@userId', value: userId }]
      };
      const { resources: comments } = await commentsContainer.items.query(commentsQuery).fetchAll();
      
      comments.forEach(comment => {
        userComments.push({
          id: comment.id,
          content: comment.content || comment.text || '',
          createdAt: comment.createdAt,
          postId: comment.postId,
          parentCommentId: comment.parentCommentId,
          likes: comment.likes || 0,
          status: comment.status || 'published'
        });
      });

      userProfile.statistics.totalComments = userComments.length;
      context.log(`Found ${userComments.length} comments for user ${userId}`);
    } catch (error) {
      context.log(`Error fetching comments for ${userId}:`, error);
    }

    // 7. Get all user likes/interactions
    const userLikes: any[] = [];
    try {
      const likesQuery = {
        query: 'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.createdAt DESC',
        parameters: [{ name: '@userId', value: userId }]
      };
      const { resources: likes } = await likesContainer.items.query(likesQuery).fetchAll();
      
      likes.forEach(like => {
        userLikes.push({
          contentId: like.contentId || like.postId,
          contentType: like.contentType || 'post',
          likedAt: like.createdAt || like.likedAt
        });
      });

      userProfile.statistics.totalLikes = userLikes.length;
      context.log(`Found ${userLikes.length} likes for user ${userId}`);
    } catch (error) {
      context.log(`Error fetching likes for ${userId}:`, error);
    }

    // 8. Get all user flags/reports
    const userFlags: any[] = [];
    try {
      const flagsQuery = {
        query: 'SELECT * FROM c WHERE c.flaggerId = @userId ORDER BY c.createdAt DESC',
        parameters: [{ name: '@userId', value: userId }]
      };
      const { resources: flags } = await flagsContainer.items.query(flagsQuery).fetchAll();
      
      flags.forEach(flag => {
        userFlags.push({
          id: flag.id,
          contentId: flag.contentId,
          contentType: flag.contentType,
          reason: flag.reason,
          description: flag.description,
          flaggedAt: flag.createdAt,
          status: flag.status
        });
      });

      userProfile.statistics.totalFlags = userFlags.length;
      context.log(`Found ${userFlags.length} flags for user ${userId}`);
    } catch (error) {
      context.log(`Error fetching flags for ${userId}:`, error);
    }

    // 9. Get all user appeals
    const userAppeals: any[] = [];
    try {
      const appealsQuery = {
        query: 'SELECT * FROM c WHERE c.submitterId = @userId ORDER BY c.createdAt DESC',
        parameters: [{ name: '@userId', value: userId }]
      };
      const { resources: appeals } = await appealsContainer.items.query(appealsQuery).fetchAll();
      
      appeals.forEach(appeal => {
        userAppeals.push({
          id: appeal.id,
          contentId: appeal.contentId,
          reason: appeal.reason,
          status: appeal.status,
          submittedAt: appeal.createdAt,
          resolvedAt: appeal.resolvedAt,
          finalDecision: appeal.finalDecision
        });
      });

      context.log(`Found ${userAppeals.length} appeals for user ${userId}`);
    } catch (error) {
      context.log(`Error fetching appeals for ${userId}:`, error);
    }

    // 10. Get all user votes on appeals
    const userVotes: any[] = [];
    try {
      const votesQuery = {
        query: 'SELECT * FROM c WHERE c.voterId = @userId ORDER BY c.createdAt DESC',
        parameters: [{ name: '@userId', value: userId }]
      };
      const { resources: votes } = await votesContainer.items.query(votesQuery).fetchAll();
      
      votes.forEach(vote => {
        userVotes.push({
          appealId: vote.appealId,
          vote: vote.vote,
          reason: vote.reason,
          votedAt: vote.createdAt
        });
      });

      context.log(`Found ${userVotes.length} votes for user ${userId}`);
    } catch (error) {
      context.log(`Error fetching votes for ${userId}:`, error);
    }

    // 11. Get previous export history (if any)
    const previousExports: any[] = [];
    const dataRequests: any[] = [];
    // Note: In a full implementation, you might track these in a separate container
    // For now, we'll return empty arrays but the structure is ready

    // 12. Assemble complete data export
    const exportData: UserDataExport = {
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: userId,
        dataVersion: '1.0',
        exportId,
        retentionPeriod: 'This export contains your personal data as of the export date. Data may be deleted from our systems according to our retention policy.'
      },
      userProfile,
      content: {
        posts: userPosts,
        comments: userComments
      },
      interactions: {
        likes: userLikes,
        flags: userFlags
      },
      moderation: {
        appeals: userAppeals,
        votes: userVotes
      },
      privacy: {
        previousExports,
        dataRequests
      }
    };

    // 13. Log export completion for audit
    context.log(`Data export completed successfully for user ${userId}:`, {
      exportId,
      totalPosts: userPosts.length,
      totalComments: userComments.length,
      totalLikes: userLikes.length,
      totalFlags: userFlags.length,
      totalAppeals: userAppeals.length,
      totalVotes: userVotes.length
    });

    // 14. Rate limiting is automatically handled by the checkRateLimit call above
    context.log(`Data export request processed with rate limit status:`, {
      rateLimited: rateLimitResult.blocked,
      remaining: rateLimitResult.remaining,
      resetTime: rateLimitResult.resetTime
    });

    return {
      status: 200,
      body: JSON.stringify(exportData),
      headers: {
        'Content-Type': 'application/json',
        'X-Export-ID': exportId,
        'X-Data-Version': '1.0'
      }
    };

  } catch (error) {
    // Handle structured HTTP errors (like 401 from auth)
    if (isHttpError(error)) {
      return json(error.status, error.body);
    }
    
    // Handle unexpected errors
    context.error('Error during user data export:', error);
    return json(500, { 
      code: 'server_error',
      message: 'Internal server error',
      exportId
    });
  }
}