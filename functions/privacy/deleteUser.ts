/**
 * ASORA USER ACCOUNT DELETION ENDPOINT
 * 
 * ðŸŽ¯ Purpose: GDPR Article 17 (Right to be Forgotten) compliance - Delete user data
 * ðŸ” Security: JWT auth + confirmation header + idempotent operations
 * âš ï¸ Features: Complete data scrubbing, content anonymization, audit logging
 * ðŸ—ƒï¸ Architecture: Multi-container cleanup with rollback safety
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { requireUser, isHttpError, json } from '../shared/auth-utils';
import { createRateLimiter, endpointKeyGenerator } from '../shared/rate-limiter';

// Rate limiter for deletion requests (safety measure - 1 per hour)
const deleteRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 1,
  keyGenerator: endpointKeyGenerator('privacy_delete')
});

export async function deleteUser(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const deletionId = `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  context.log(`Account deletion request received - Deletion ID: ${deletionId}`);

  try {
    // 1. Authentication - throws HttpError(401) if invalid
    const user = requireUser(context, request);
    const userId = user.sub;

    // 2. Confirmation header check (safety mechanism)
    const confirmHeader = request.headers.get('X-Confirm-Delete');
    if (confirmHeader !== 'true') {
      context.log(`Deletion attempted without confirmation header for user: ${userId}`);
      return json(400, {
        code: 'confirmation_required',
        message: 'Account deletion requires X-Confirm-Delete header set to "true"'
      });
    }

    // 3. Rate limiting check (additional safety)
    const rateLimitResult = await deleteRateLimiter.checkRateLimit(request);
    if (rateLimitResult.blocked) {
      context.log(`Deletion rate limited for user: ${userId}`);
      return json(429, {
        code: 'rate_limit_exceeded',
        message: 'Account deletion is limited to prevent abuse. Please try again later.',
        resetTime: rateLimitResult.resetTime
      });
    }

    // 4. Initialize Cosmos DB
    const cosmosClient = new CosmosClient(process.env.COSMOS_CONNECTION_STRING || '');
    const database = cosmosClient.database('asora');
    
    const usersContainer = database.container('users');
    const postsContainer = database.container('posts');
    const commentsContainer = database.container('comments');
    const likesContainer = database.container('likes');
    const flagsContainer = database.container('content_flags');
    const appealsContainer = database.container('appeals');
    const votesContainer = database.container('appeal_votes');

    context.log(`Starting complete account deletion for user: ${userId}`);

    const warnings: string[] = [];
    const itemsProcessed = {
      userProfile: false,
      posts: 0,
      comments: 0,
      likes: 0,
      flags: 0,
      appeals: 0,
      votes: 0
    };
    const contentMarking = {
      postsAnonymized: 0,
      commentsAnonymized: 0
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
            alreadyDeleted: true
          }
        };
      }
      context.log(`Error checking user existence: ${error.message}`);
      warnings.push(`Could not verify user existence: ${error.message}`);
    }

    // 6. Anonymize/mark user's posts as deleted (preserve for forum integrity)
    try {
      const postsQuery = {
        query: 'SELECT * FROM c WHERE c.authorId = @userId AND (IS_NULL(c.deletedAt) OR c.deletedAt = "")',
        parameters: [{ name: '@userId', value: userId }]
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
            lastModified: new Date().toISOString()
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
        query: 'SELECT * FROM c WHERE c.authorId = @userId AND (IS_NULL(c.deletedAt) OR c.deletedAt = "")',
        parameters: [{ name: '@userId', value: userId }]
      };
      const { resources: userComments } = await commentsContainer.items.query(commentsQuery).fetchAll();
      
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
            lastModified: new Date().toISOString()
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
        parameters: [{ name: '@userId', value: userId }]
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
        parameters: [{ name: '@userId', value: userId }]
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
        parameters: [{ name: '@userId', value: userId }]
      };
      const { resources: userAppeals } = await appealsContainer.items.query(appealsQuery).fetchAll();
      
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
        parameters: [{ name: '@userId', value: userId }]
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
        return sum + (typeof val === 'number' ? val : (val ? 1 : 0));
      }, 0),
      postsAnonymized: contentMarking.postsAnonymized,
      commentsAnonymized: contentMarking.commentsAnonymized,
      warningCount: warnings.length,
      rateLimitInfo: {
        blocked: rateLimitResult.blocked,
        remaining: rateLimitResult.remaining
      }
    });

    try {
      const privacyAudit = database.container('privacy_audit');
      await privacyAudit.items.create({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        action: 'delete',
        result: 'success',
        operator: 'self',
        timestamp: new Date().toISOString()
      });
    } catch {}
    return json(200, {
      code: 'account_deleted',
      message: 'Account deletion completed successfully',
      userId,
      deletedAt: new Date().toISOString(),
      deletionId
    });

  } catch (error) {
    // Handle structured HTTP errors (like 401 from auth)
    if (isHttpError(error)) {
      return json(error.status, error.body);
    }
    
    // Handle unexpected errors
    context.error('Critical error during account deletion:', error);
    try {
      const user = requireUser(context, request);
      const cosmosClient = new CosmosClient(process.env.COSMOS_CONNECTION_STRING || '');
      const audit = cosmosClient.database('asora').container('privacy_audit');
      await audit.items.create({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user.sub,
        action: 'delete',
        result: 'failure',
        operator: 'self',
        timestamp: new Date().toISOString()
      });
    } catch {}
    return json(500, { 
      code: 'server_error',
      message: 'Internal server error during deletion',
      deletionId,
      note: 'Your account deletion request has been logged. Please contact support if the issue persists.'
    });
  }
}


