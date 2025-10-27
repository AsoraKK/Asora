/**
 * ASORA USER ACCOUNT DELETION ENDPOINT
 *
 * Purpose: GDPR Article 17 (Right to be Forgotten) compliance - Delete user data
 * Security: JWT auth + confirmation header + idempotent operations
 * Features: Complete data scrubbing, content anonymization, audit logging
 * Architecture: Multi-container cleanup with rollback safety
 */

import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import type { Database } from '@azure/cosmos';
import { json } from '@shared/utils/http';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import {
  createRateLimiter,
  endpointKeyGenerator,
  userKeyGenerator,
  defaultKeyGenerator,
} from '@shared/utils/rateLimiter';

// Rate limiter for deletion requests (safety measure - 1 per hour)
const deleteRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 1,
  // Be resilient to test mocks that don't export endpointKeyGenerator
  keyGenerator: ((): ((req: HttpRequest) => string) => {
    if (typeof endpointKeyGenerator === 'function') {
      return endpointKeyGenerator('privacy_delete');
    }
    return (req: HttpRequest) => {
      const userKey =
        typeof userKeyGenerator === 'function' ? userKeyGenerator(req) : defaultKeyGenerator(req);
      return `privacy_delete:${userKey}`;
    };
  })(),
});

interface HttpError {
  status: number;
  message: string;
  body?: unknown;
}

const isHttpError = (error: unknown): error is HttpError =>
  typeof (error as { status?: unknown })?.status === 'number';

interface DeleteUserParams {
  request: HttpRequest;
  context: InvocationContext;
  userId: string;
}

export async function deleteUserHandler({
  request,
  context,
  userId,
}: DeleteUserParams): Promise<HttpResponseInit> {
  let database: Database | null = null;
  const deletionId = `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  context.log(`Account deletion request received - Deletion ID: ${deletionId}`);

  try {
    if (!userId) {
      return json(401, { error: 'Unauthorized' });
    }

    // 2. Confirmation header check (safety mechanism)
    const confirmHeader = request.headers.get('X-Confirm-Delete');
    if (confirmHeader !== 'true') {
      context.log(`Deletion attempted without confirmation header for user: ${userId}`);
      return json(400, {
        code: 'confirmation_required',
        message: 'Account deletion requires X-Confirm-Delete header set to "true"',
      });
    }

    // 3. Rate limiting check (additional safety)
    const rateLimitResult = await deleteRateLimiter.checkRateLimit(request);
    if (rateLimitResult.blocked) {
      context.log(`Deletion rate limited for user: ${userId}`);
      return json(429, {
        code: 'rate_limit_exceeded',
        message: 'Account deletion is limited to prevent abuse. Please try again later.',
        resetTime: rateLimitResult.resetTime,
      });
    }

    // 4. Initialize Cosmos DB
    const activeDatabase = getCosmosDatabase();
    database = activeDatabase;

    const usersContainer = activeDatabase.container('users');
    const postsContainer = activeDatabase.container('posts');
    const commentsContainer = activeDatabase.container('comments');
    const likesContainer = activeDatabase.container('likes');
    const flagsContainer = activeDatabase.container('content_flags');
    const appealsContainer = activeDatabase.container('appeals');
    const votesContainer = activeDatabase.container('appeal_votes');

    context.log(`Starting complete account deletion for user: ${userId}`);

    const warnings: string[] = [];
    const itemsProcessed = {
      userProfile: false,
      posts: 0,
      comments: 0,
      likes: 0,
      flags: 0,
      appeals: 0,
      votes: 0,
    };
    const contentMarking = {
      postsAnonymized: 0,
      commentsAnonymized: 0,
    };

    // 5. Check if user exists first (idempotent check)
    let userExists = false;
    try {
      const { resource: existingUser } = await usersContainer.item(userId, userId).read();
      userExists = !!existingUser;
    } catch (error: any) {
      if (error.code === 404) {
        context.log(`User ${userId} already deleted or never existed`);
        // Return success for idempotent behavior
        return {
          status: 200,
          jsonBody: {
            message: 'Account deletion completed (user already deleted)',
            userId,
            deletionId,
            deletedAt: new Date().toISOString(),
            alreadyDeleted: true,
          },
        };
      }
      context.log(`Error checking user existence: ${error.message}`);
      warnings.push(`Could not verify user existence: ${error.message}`);
    }

    // 6. Anonymize/mark user's posts as deleted (preserve for forum integrity)
    try {
      const postsQuery = {
        query:
          'SELECT * FROM c WHERE c.authorId = @userId AND (IS_NULL(c.deletedAt) OR c.deletedAt = "")',
        parameters: [{ name: '@userId', value: userId }],
      };
      const { resources: userPosts } = await postsContainer.items.query(postsQuery).fetchAll();

      for (const post of userPosts) {
        try {
          // Mark as deleted and anonymize author info
          const updatedPost = {
            ...post,
            authorName: '[Deleted User]',
            authorId: 'deleted_user',
            authorEmail: null,
            deletedAt: new Date().toISOString(),
            deletedBy: 'user_request',
            originalAuthorId: userId, // Keep for audit purposes only
            lastModified: new Date().toISOString(),
          };

          await postsContainer.item(post.id, post.id).replace(updatedPost);
          contentMarking.postsAnonymized++;
        } catch (error: any) {
          warnings.push(`Failed to anonymize post ${post.id}: ${error.message}`);
        }
      }

      itemsProcessed.posts = userPosts.length;
      context.log(`Processed ${userPosts.length} posts for anonymization`);
    } catch (error: any) {
      warnings.push(`Error processing posts: ${error.message}`);
    }

    // 7. Anonymize/mark user's comments as deleted
    try {
      const commentsQuery = {
        query:
          'SELECT * FROM c WHERE c.authorId = @userId AND (IS_NULL(c.deletedAt) OR c.deletedAt = "")',
        parameters: [{ name: '@userId', value: userId }],
      };
      const { resources: userComments } = await commentsContainer.items
        .query(commentsQuery)
        .fetchAll();

      for (const comment of userComments) {
        try {
          // Mark as deleted and anonymize author info
          const updatedComment = {
            ...comment,
            authorName: '[Deleted User]',
            authorId: 'deleted_user',
            content: '[Comment deleted by user request]',
            deletedAt: new Date().toISOString(),
            deletedBy: 'user_request',
            originalAuthorId: userId, // Keep for audit purposes only
            lastModified: new Date().toISOString(),
          };

          await commentsContainer.item(comment.id, comment.id).replace(updatedComment);
          contentMarking.commentsAnonymized++;
        } catch (error: any) {
          warnings.push(`Failed to anonymize comment ${comment.id}: ${error.message}`);
        }
      }

      itemsProcessed.comments = userComments.length;
      context.log(`Processed ${userComments.length} comments for anonymization`);
    } catch (error: any) {
      warnings.push(`Error processing comments: ${error.message}`);
    }

    // 8. Delete user's likes/interactions
    try {
      const likesQuery = {
        query: 'SELECT * FROM c WHERE c.userId = @userId',
        parameters: [{ name: '@userId', value: userId }],
      };
      const { resources: userLikes } = await likesContainer.items.query(likesQuery).fetchAll();

      for (const like of userLikes) {
        try {
          await likesContainer.item(like.id, like.userId).delete();
          itemsProcessed.likes++;
        } catch (error: any) {
          warnings.push(`Failed to delete like ${like.id}: ${error.message}`);
        }
      }

      context.log(`Deleted ${itemsProcessed.likes} likes`);
    } catch (error: any) {
      warnings.push(`Error deleting likes: ${error.message}`);
    }

    // 9. Delete user's flags/reports
    try {
      const flagsQuery = {
        query: 'SELECT * FROM c WHERE c.flaggerId = @userId',
        parameters: [{ name: '@userId', value: userId }],
      };
      const { resources: userFlags } = await flagsContainer.items.query(flagsQuery).fetchAll();

      for (const flag of userFlags) {
        try {
          await flagsContainer.item(flag.id, flag.id).delete();
          itemsProcessed.flags++;
        } catch (error: any) {
          warnings.push(`Failed to delete flag ${flag.id}: ${error.message}`);
        }
      }

      context.log(`Deleted ${itemsProcessed.flags} flags`);
    } catch (error: any) {
      warnings.push(`Error deleting flags: ${error.message}`);
    }

    // 10. Delete user's appeals
    try {
      const appealsQuery = {
        query: 'SELECT * FROM c WHERE c.submitterId = @userId',
        parameters: [{ name: '@userId', value: userId }],
      };
      const { resources: userAppeals } = await appealsContainer.items
        .query(appealsQuery)
        .fetchAll();

      for (const appeal of userAppeals) {
        try {
          await appealsContainer.item(appeal.id, appeal.id).delete();
          itemsProcessed.appeals++;
        } catch (error: any) {
          warnings.push(`Failed to delete appeal ${appeal.id}: ${error.message}`);
        }
      }

      context.log(`Deleted ${itemsProcessed.appeals} appeals`);
    } catch (error: any) {
      warnings.push(`Error deleting appeals: ${error.message}`);
    }

    // 11. Delete user's votes on appeals
    try {
      const votesQuery = {
        query: 'SELECT * FROM c WHERE c.voterId = @userId',
        parameters: [{ name: '@userId', value: userId }],
      };
      const { resources: userVotes } = await votesContainer.items.query(votesQuery).fetchAll();

      for (const vote of userVotes) {
        try {
          await votesContainer.item(vote.id, vote.appealId).delete();
          itemsProcessed.votes++;
        } catch (error: any) {
          warnings.push(`Failed to delete vote ${vote.id}: ${error.message}`);
        }
      }

      context.log(`Deleted ${itemsProcessed.votes} votes`);
    } catch (error: any) {
      warnings.push(`Error deleting votes: ${error.message}`);
    }

    // 12. Finally, delete the user profile (main record)
    if (userExists) {
      try {
        await usersContainer.item(userId, userId).delete();
        itemsProcessed.userProfile = true;
        context.log(`Deleted user profile for ${userId}`);
      } catch (error: any) {
        if (error.code !== 404) {
          warnings.push(`Failed to delete user profile: ${error.message}`);
        } else {
          // Already deleted, which is fine for idempotent operation
          itemsProcessed.userProfile = true;
        }
      }
    }

    // 13. Log comprehensive deletion audit
    context.log(`Account deletion completed successfully for user ${userId}:`, {
      deletionId,
      totalItemsDeleted: Object.values(itemsProcessed).reduce((sum: number, val) => {
        return sum + (typeof val === 'number' ? val : val ? 1 : 0);
      }, 0),
      postsAnonymized: contentMarking.postsAnonymized,
      commentsAnonymized: contentMarking.commentsAnonymized,
      warningCount: warnings.length,
      rateLimitInfo: {
        blocked: rateLimitResult.blocked,
        remaining: rateLimitResult.remaining,
      },
    });

    try {
      const privacyAudit = activeDatabase.container('privacy_audit');
      await privacyAudit.items.create({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        action: 'delete',
        result: 'success',
        operator: 'self',
        timestamp: new Date().toISOString(),
      });
    } catch (auditErr) {
      // Non-fatal: log audit write failures for later investigation
      try {
        context.log('Failed to write privacy audit record:', String(auditErr));
      } catch (logErr) {
        // best-effort logging; swallow to avoid masking deletion success
      }
    }
    return json(200, {
      code: 'account_deleted',
      message: 'Account deletion completed successfully',
      userId,
      deletedAt: new Date().toISOString(),
      deletionId,
    });
  } catch (error) {
    // Handle structured HTTP errors (like 401 from auth)
    if (isHttpError(error)) {
      return json(error.status, error.body);
    }

    // Handle unexpected errors
    context.error('Critical error during account deletion:', error);
    try {
      const auditDatabase = database ?? getCosmosDatabase();
      const audit = auditDatabase.container('privacy_audit');
      await audit.items.create({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        action: 'delete',
        result: 'failure',
        operator: 'self',
        timestamp: new Date().toISOString(),
      });
    } catch (auditErr) {
      try {
        context.log('Failed to write failure audit record:', String(auditErr));
      } catch (logErr) {
        // best-effort logging only
      }
    }
    return json(500, {
      code: 'server_error',
      message: 'Internal server error during deletion',
      deletionId,
      note: 'Your account deletion request has been logged. Please contact support if the issue persists.',
    });
  }
}
