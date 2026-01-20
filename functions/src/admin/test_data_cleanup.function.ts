/**
 * Test Data Cleanup Function
 * 
 * Timer-triggered function to purge expired test data.
 * Also provides manual purge endpoint for admin use.
 * 
 * GDPR/POPIA Compliance: Test data must not be retained indefinitely.
 * Default TTL: 24 hours
 * Maximum TTL: 48 hours
 */

import { app, type InvocationContext, type Timer } from '@azure/functions';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { trackAppEvent, trackAppMetric } from '@shared/appInsights';
import { TEST_DATA_EXPIRY } from '@shared/testMode/testModeContext';

interface CleanupResult {
  deletedCount: number;
  expiredCount: number;
  errors: string[];
  durationMs: number;
}

/**
 * Find and delete expired test posts
 */
async function purgeExpiredTestData(context: InvocationContext): Promise<CleanupResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let deletedCount = 0;
  let expiredCount = 0;

  try {
    const container = getTargetDatabase().posts;
    const now = Date.now();

    // Query for expired test posts
    const query = `
      SELECT c.id, c.postId, c.testSessionId, c.testExpiresAt, c.createdAt
      FROM c
      WHERE c.isTestPost = true
        AND c.testExpiresAt < @now
    `;

    context.log('[testDataCleanup] Querying for expired test posts', { now });

    const response = await container.items
      .query({ query, parameters: [{ name: '@now', value: now }] })
      .fetchAll();

    const expiredPosts = response.resources;
    expiredCount = expiredPosts.length;

    context.log(`[testDataCleanup] Found ${expiredCount} expired test posts`);

    // Delete each expired post
    for (const post of expiredPosts) {
      try {
        // Hard delete for test data (no soft delete needed)
        await container.item(post.id, post.id).delete();
        deletedCount++;

        context.log('[testDataCleanup] Deleted expired test post', {
          postId: post.id,
          sessionId: post.testSessionId,
          expiredAt: new Date(post.testExpiresAt).toISOString(),
          createdAt: new Date(post.createdAt).toISOString(),
        });
      } catch (deleteError) {
        const errorMsg = `Failed to delete post ${post.id}: ${deleteError}`;
        errors.push(errorMsg);
        context.warn('[testDataCleanup] Delete failed', { postId: post.id, error: deleteError });
      }
    }

    const durationMs = Date.now() - startTime;

    // Track metrics
    trackAppMetric({
      name: 'test_data_cleanup_count',
      value: deletedCount,
      properties: { expiredCount, errorCount: errors.length },
    });

    trackAppEvent({
      name: 'test_data_cleanup_completed',
      properties: {
        deletedCount: String(deletedCount),
        expiredCount: String(expiredCount),
        errorCount: String(errors.length),
        durationMs: String(durationMs),
      },
    });

    return { deletedCount, expiredCount, errors, durationMs };
  } catch (error) {
    context.error('[testDataCleanup] Cleanup failed', { error });
    errors.push(`Cleanup failed: ${error}`);
    return { deletedCount, expiredCount, errors, durationMs: Date.now() - startTime };
  }
}

/**
 * Purge test data for a specific session (manual admin action)
 */
export async function purgeTestSession(
  sessionId: string,
  context: InvocationContext
): Promise<CleanupResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let deletedCount = 0;
  let foundCount = 0;

  try {
    const container = getTargetDatabase().posts;

    // Query for all posts in the session
    const query = `
      SELECT c.id, c.postId, c.createdAt
      FROM c
      WHERE c.isTestPost = true
        AND c.testSessionId = @sessionId
    `;

    context.log('[testDataCleanup] Purging session', { sessionId });

    const response = await container.items
      .query({ query, parameters: [{ name: '@sessionId', value: sessionId }] })
      .fetchAll();

    const sessionPosts = response.resources;
    foundCount = sessionPosts.length;

    context.log(`[testDataCleanup] Found ${foundCount} posts in session ${sessionId}`);

    // Delete each post in the session
    for (const post of sessionPosts) {
      try {
        await container.item(post.id, post.id).delete();
        deletedCount++;
      } catch (deleteError) {
        errors.push(`Failed to delete post ${post.id}: ${deleteError}`);
      }
    }

    const durationMs = Date.now() - startTime;

    trackAppEvent({
      name: 'test_session_purged',
      properties: {
        sessionId,
        deletedCount: String(deletedCount),
        foundCount: String(foundCount),
        durationMs: String(durationMs),
      },
    });

    return { deletedCount, expiredCount: foundCount, errors, durationMs };
  } catch (error) {
    context.error('[testDataCleanup] Session purge failed', { sessionId, error });
    errors.push(`Session purge failed: ${error}`);
    return { deletedCount, expiredCount: foundCount, errors, durationMs: Date.now() - startTime };
  }
}

/**
 * Timer-triggered cleanup function
 * Runs every hour to purge expired test data
 */
async function timerHandler(timer: Timer, context: InvocationContext): Promise<void> {
  context.log('[testDataCleanup] Timer triggered', {
    isPastDue: timer.isPastDue,
    scheduledAt: timer.scheduleStatus?.next,
  });

  const result = await purgeExpiredTestData(context);

  context.log('[testDataCleanup] Cleanup complete', {
    deletedCount: result.deletedCount,
    expiredCount: result.expiredCount,
    errors: result.errors.length,
    durationMs: result.durationMs,
  });
}

// Register timer trigger - runs every hour
app.timer('test_data_cleanup', {
  schedule: '0 0 * * * *', // Every hour at :00
  handler: timerHandler,
  runOnStartup: false, // Don't run on function app startup
});

export { purgeExpiredTestData };
