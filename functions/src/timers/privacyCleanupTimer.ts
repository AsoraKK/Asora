/**
 * ASORA PRIVACY CLEANUP TIMER
 * 
 * 🎯 Purpose: Automated privacy compliance cleanup operations
 * ⏰ Schedule: Daily execution for GDPR/POPIA data retention compliance
 * 🧹 Cleanup: Remove old deleted content and anonymize expired data
 * 📱 Platform: Azure Functions Timer Trigger with Cosmos DB integration
 */

import { app, InvocationContext, Timer } from '@azure/functions';
import { getContainer } from '../shared/cosmosClient';
import { redactUserForLogs } from '../shared/privacy';

/**
 * Privacy cleanup configuration
 */
const CLEANUP_CONFIG = {
  // Content older than this will be permanently removed (GDPR allows reasonable retention)
  DELETED_CONTENT_RETENTION_DAYS: 90,
  
  // Anonymous user data retention for analytics (GDPR compliant)
  ANONYMOUS_DATA_RETENTION_DAYS: 365,
  
  // Batch size for cleanup operations to avoid timeout
  CLEANUP_BATCH_SIZE: 100,
  
  // Maximum execution time per cleanup type (milliseconds)
  MAX_EXECUTION_TIME_MS: 4 * 60 * 1000, // 4 minutes
};

/**
 * Main privacy cleanup timer function
 * Runs daily at 2 AM UTC (low traffic time)
 */
export async function privacyCleanupTimer(myTimer: Timer, context: InvocationContext): Promise<void> {
  const startTime = Date.now();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_CONFIG.DELETED_CONTENT_RETENTION_DAYS);
  
  context.info(`🧹 Privacy cleanup starting at ${new Date().toISOString()}`);
  context.info(`📅 Cleanup cutoff date: ${cutoffDate.toISOString()}`);
  
  const stats = {
    postsRemoved: 0,
    commentsRemoved: 0,
    anonymizedRecords: 0,
    errors: 0,
    executionTimeMs: 0,
  };

  try {
    // Execute cleanup operations in parallel with time limits
    const cleanupPromises = [
      _cleanupDeletedPosts(cutoffDate, context),
      _cleanupDeletedComments(cutoffDate, context),
      _anonymizeOldUserData(context),
      _cleanupExpiredExportRequests(context),
    ];

    const results = await Promise.allSettled(cleanupPromises);
    
    // Process results and collect statistics
    results.forEach((result, index) => {
      const operation = ['posts', 'comments', 'users', 'exports'][index];
      
      if (result.status === 'fulfilled') {
        context.info(`✅ ${operation} cleanup completed: ${JSON.stringify(result.value)}`);
        
        // Type-safe property access
        const value = result.value as any;
        stats.postsRemoved += value.postsRemoved || 0;
        stats.commentsRemoved += value.commentsRemoved || 0;
        stats.anonymizedRecords += value.anonymizedRecords || 0;
      } else {
        context.error(`❌ ${operation} cleanup failed:`, result.reason);
        stats.errors++;
      }
    });

    stats.executionTimeMs = Date.now() - startTime;
    
    // Log final statistics
    context.info(`🏁 Privacy cleanup completed in ${stats.executionTimeMs}ms`);
    context.info(`📊 Cleanup stats: ${JSON.stringify(stats)}`);
    
    // Send telemetry for monitoring
    _logCleanupTelemetry(context, 'privacy_cleanup_completed', stats);

  } catch (error) {
    stats.executionTimeMs = Date.now() - startTime;
    stats.errors++;
    
    context.error('💥 Privacy cleanup failed:', error);
    _logCleanupTelemetry(context, 'privacy_cleanup_failed', { ...stats, error: error?.toString() });
    
    throw error; // Re-throw to mark function execution as failed
  }
}

/**
 * Clean up posts marked as deleted beyond retention period
 */
async function _cleanupDeletedPosts(cutoffDate: Date, context: InvocationContext): Promise<{ postsRemoved: number }> {
  const container = getContainer('posts');
  let postsRemoved = 0;
  
  context.info(`🗑️ Cleaning up deleted posts older than ${cutoffDate.toISOString()}`);
  
  try {
    // Query for old deleted posts
    const { resources: deletedPosts } = await container.items.query({
      query: `
        SELECT c.id, c.authorId, c.deletedAt 
        FROM c 
        WHERE NOT IS_NULL(c.deletedAt) 
        AND c.deletedAt < @cutoffDate
        ORDER BY c.deletedAt ASC
        OFFSET 0 LIMIT @batchSize
      `,
      parameters: [
        { name: '@cutoffDate', value: cutoffDate.toISOString() },
        { name: '@batchSize', value: CLEANUP_CONFIG.CLEANUP_BATCH_SIZE }
      ]
    }).fetchAll();
    
    // Remove posts in batches
    for (const post of deletedPosts) {
      try {
        await container.item(post.id, post.id).delete();
        postsRemoved++;
        
        context.debug(`🗑️ Removed deleted post: ${post.id}`);
      } catch (error) {
        context.error(`Failed to remove post ${post.id}:`, error);
      }
    }
    
    context.info(`✅ Posts cleanup: ${postsRemoved} posts permanently removed`);
    return { postsRemoved };
    
  } catch (error) {
    context.error('Failed to cleanup deleted posts:', error);
    throw error;
  }
}

/**
 * Clean up comments marked as deleted beyond retention period
 */
async function _cleanupDeletedComments(cutoffDate: Date, context: InvocationContext): Promise<{ commentsRemoved: number }> {
  const container = getContainer('comments');
  let commentsRemoved = 0;
  
  context.info(`💬 Cleaning up deleted comments older than ${cutoffDate.toISOString()}`);
  
  try {
    // Query across partitions for old deleted comments
    const { resources: deletedComments } = await container.items.query({
      query: `
        SELECT c.id, c.postId, c.authorId, c.deletedAt 
        FROM c 
        WHERE NOT IS_NULL(c.deletedAt) 
        AND c.deletedAt < @cutoffDate
        ORDER BY c.deletedAt ASC
        OFFSET 0 LIMIT @batchSize
      `,
      parameters: [
        { name: '@cutoffDate', value: cutoffDate.toISOString() },
        { name: '@batchSize', value: CLEANUP_CONFIG.CLEANUP_BATCH_SIZE }
      ]
    }).fetchAll();
    
    // Remove comments in batches
    for (const comment of deletedComments) {
      try {
        await container.item(comment.id, comment.postId).delete();
        commentsRemoved++;
        
        context.debug(`💬 Removed deleted comment: ${comment.id} on post ${comment.postId}`);
      } catch (error) {
        context.error(`Failed to remove comment ${comment.id}:`, error);
      }
    }
    
    context.info(`✅ Comments cleanup: ${commentsRemoved} comments permanently removed`);
    return { commentsRemoved };
    
  } catch (error) {
    context.error('Failed to cleanup deleted comments:', error);
    throw error;
  }
}

/**
 * Anonymize old user data for analytics while preserving GDPR compliance
 */
async function _anonymizeOldUserData(context: InvocationContext): Promise<{ anonymizedRecords: number }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_CONFIG.ANONYMOUS_DATA_RETENTION_DAYS);
  
  context.info(`👤 Anonymizing user data older than ${cutoffDate.toISOString()}`);
  
  // For now, return early as anonymization requires careful consideration
  // This would involve removing PII while keeping statistical data
  context.info(`⏭️ User data anonymization not yet implemented - requires business logic review`);
  
  return { anonymizedRecords: 0 };
}

/**
 * Clean up expired data export request tracking
 */
async function _cleanupExpiredExportRequests(context: InvocationContext): Promise<{ exportsCleared: number }> {
  context.info(`📊 Cleaning up expired export request tracking`);
  
  // This would clean up Redis keys for export rate limiting
  // For now, Redis TTL handles this automatically
  context.info(`⏭️ Export request cleanup handled by Redis TTL`);
  
  return { exportsCleared: 0 };
}

/**
 * Log cleanup telemetry for monitoring and alerting
 */
function _logCleanupTelemetry(context: InvocationContext, eventName: string, data: any): void {
  const telemetryData = {
    timestamp: new Date().toISOString(),
    event: eventName,
    version: '1.0.0',
    ...data,
  };
  
  // Log structured telemetry (can be picked up by Application Insights)
  context.info(`📊 TELEMETRY: ${JSON.stringify(telemetryData)}`);
}

// Register the timer function
app.timer('privacyCleanupTimer', {
  // Run daily at 2:00 AM UTC (CRON: minute hour day month dayofweek)
  schedule: '0 2 * * *',
  handler: privacyCleanupTimer,
});
