/**
 * ASORA GDP  try {
    // Authenticate user
    const user = requireAuth(request);
    const userId = user.sub;

    context.info(`Account deletion requested by user: ${userId}`);A ACCOUNT DELETION ENDPOINT
 * 
 * 🎯 Purpose: Soft-delete user account with PII scrubbing and content marking
 * 🔐 Security: JWT auth, confirmation header required, idempotent operation
 * 📊 Telemetry: privacy_delete_requested/completed/failed events
 * 📱 Platform: Azure Functions with TypeScript + Cosmos DB
 */

import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { requireAuth } from '../shared/auth';
import { scrubUserPII, markUserContentAsDeleted } from '../shared/privacy';
import { getContainer } from '../shared/cosmosClient';

export async function deleteUser(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const startTime = Date.now();
  
  try {
    // Authenticate user
    const user = requireAuth(request);
    const userId = user.sub;

    context.info(`Privacy deletion requested by user: ${userId}`);

    // Require confirmation header to prevent accidental deletions
    const confirmHeader = request.headers.get('X-Asora-Confirm-Delete');
    if (confirmHeader !== 'true') {
      context.warn(`Missing confirmation header for user deletion: ${userId}`);
      
      return {
        status: 400,
        jsonBody: { 
          error: 'Confirmation header required',
          code: 'PRIVACY_CONFIRMATION_REQUIRED',
          message: 'Set X-Asora-Confirm-Delete: true header to confirm deletion'
        }
      };
    }

    // Check if user is already deleted (idempotent operation)
    const usersContainer = getContainer('users');
    const { resource: existingUser } = await usersContainer.item(userId, userId).read();
    
    if (existingUser?.accountDeleted) {
      context.info(`User already deleted: ${userId}`);
      _logTelemetryEvent(context, 'privacy_delete_already_deleted', userId, 0, Date.now() - startTime);
      
      return {
        status: 204
      };
    }

    // TODO: Check for unresolved financial obligations
    // if (await hasUnresolvedFinancialObligations(userId)) {
    //   return {
    //     status: 400,
    //     jsonBody: { 
    //       error: 'Cannot delete account with unresolved financial obligations',
    //       code: 'PRIVACY_FINANCIAL_OBLIGATIONS'
    //     }
    //   };
    // }

    let affectedItemsCount = 0;

    // Step 1: Soft-delete user account and scrub PII
    const scrubbedUser = scrubUserPII(existingUser);
    scrubbedUser.accountDeleted = true;
    scrubbedUser.deletedAt = new Date().toISOString();
    
    await usersContainer.item(userId, userId).replace(scrubbedUser);
    affectedItemsCount++;
    
    context.info(`User account soft-deleted and PII scrubbed: ${userId}`);

    // Step 2: Mark authored content as deleted (preserve threads)
    const contentChanges = await markUserContentAsDeleted(userId, context);
    affectedItemsCount += contentChanges.postsUpdated + contentChanges.commentsUpdated;
    
    context.info(`Content marked as deleted - Posts: ${contentChanges.postsUpdated}, Comments: ${contentChanges.commentsUpdated}`);

    // Step 3: Remove ancillary user documents (likes, votes, flags)
    const ancillaryChanges = await _removeAncillaryDocuments(userId, context);
    affectedItemsCount += ancillaryChanges;
    
    context.info(`Ancillary documents removed: ${ancillaryChanges}`);

    // Step 4: Invalidate sessions (if token store exists)
    // For JWT-based auth with short TTL, we rely on token expiration
    // TODO: If implementing token blacklist, add here:
    // await invalidateUserSessions(userId);

    // Log successful deletion
    _logTelemetryEvent(context, 'privacy_delete_completed', userId, affectedItemsCount, Date.now() - startTime);
    
    return {
      status: 204
    };

  } catch (error: any) {
    context.error('Privacy deletion failed:', error);
    
    // Extract userId for telemetry if available
    let userId = 'unknown';
    try {
      const user = requireAuth(request);
      userId = user.sub;
    } catch {
      // Auth failed, keep unknown
    }
    
    _logTelemetryEvent(context, 'privacy_delete_failed', userId, 0, Date.now() - startTime);
    
    if (error.status) {
      return {
        status: error.status,
        jsonBody: { 
          error: error.message,
          code: error.code || 'PRIVACY_DELETE_ERROR'
        }
      };
    }

    return {
      status: 500,
      jsonBody: { 
        error: 'Internal server error',
        code: 'PRIVACY_DELETE_FAILED'
      }
    };
  }
}

/**
 * Remove ancillary user documents (likes, votes, flags authored by user)
 */
async function _removeAncillaryDocuments(userId: string, context: InvocationContext): Promise<number> {
  let removedCount = 0;
  const containerNames = ['likes', 'votes', 'flags'];

  for (const containerName of containerNames) {
    try {
      const container = getContainer(containerName);
      
      // Query documents authored by the user
      const querySpec = {
        query: `SELECT c.id FROM c WHERE c.userId = @userId`,
        parameters: [{ name: '@userId', value: userId }]
      };
      
      const { resources: documents } = await container.items.query(querySpec).fetchAll();
      
      // Delete each document
      for (const doc of documents) {
        await container.item(doc.id, userId).delete();
        removedCount++;
      }
      
      if (documents.length > 0) {
        context.info(`Removed ${documents.length} documents from ${containerName} for user: ${userId}`);
      }
      
    } catch (error) {
      context.warn(`Failed to remove ancillary documents from ${containerName}:`, error);
      // Continue with other containers
    }
  }

  return removedCount;
}

/**
 * Log telemetry event for privacy operations
 */
function _logTelemetryEvent(
  context: InvocationContext, 
  event: string, 
  userId: string, 
  itemCount: number, 
  durationMs: number
): void {
  const telemetryData = {
    event,
    userId: userId.substring(0, 8) + '...', // Truncated for privacy
    itemCount,
    durationMs,
    timestamp: new Date().toISOString()
  };
  
  context.info(`TELEMETRY: ${JSON.stringify(telemetryData)}`);
  
  // TODO: Send to Application Insights with proper structured logging
  // ApplicationInsights.defaultClient?.trackEvent({
  //   name: event,
  //   properties: telemetryData
  // });
}

app.http('deleteUser', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'user/delete',
  handler: deleteUser
});
