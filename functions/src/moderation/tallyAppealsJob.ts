/**
 * ASORA - TALLY APPEALS JOB (PHASE 4 - COMMUNITY VOTING)
 *
 * ⏰ Automated Vote Tallying - Timer Trigger Function
 *
 * ✅ Requirements:
 * - Runs every 2 minutes via timer trigger
 * - Processes all appeals ready for tallying
 * - Applies majority rule or timeout decisions
 * - Updates content visibility and status
 * - Logs all outcomes for audit trail
 * - Handles bulk processing efficiently
 *
 * 🎯 Tally Rules:
 * - Quorum: 5+ votes OR 5-minute timeout
 * - Majority: >50% approval rate = approved
 * - Timeout fallback: No votes = keep hidden
 * - Appeals expire after 30 days regardless
 *
 * 🔄 Processing Flow:
 * 1. Query appeals ready for tallying
 * 2. Get votes for each appeal
 * 3. Calculate outcome using voting rules
 * 4. Update content visibility and status
 * 5. Update appeal status to resolved
 * 6. Log detailed audit trail
 * 7. Handle notifications (future)
 *
 * 🛡️ Reliability:
 * - Batch processing with error isolation
 * - Comprehensive audit logging
 * - Graceful error handling
 * - Performance monitoring
 */

import { app, Timer, InvocationContext } from '@azure/functions';
import { getContainer } from '../shared/cosmosClient';
import {
  checkQuorum,
  calculateOutcome,
  generateVotingSummary,
  isAppealExpired,
  VoteRecord,
} from '../shared/moderationUtils';
import { v4 as uuidv4 } from 'uuid';

interface TallyResult {
  appealId: string;
  contentId: string;
  contentType: string;
  outcome: 'approved' | 'rejected' | 'timeout' | 'expired';
  votingSummary: {
    totalVotes: number;
    approveVotes: number;
    rejectVotes: number;
    approvalRate: number;
  };
  action: 'restored' | 'kept_hidden' | 'no_change' | 'expired';
  error?: string;
}

export async function tallyAppealsJob(myTimer: Timer, context: InvocationContext): Promise<void> {
  const startTime = Date.now();
  context.log('🗳️ Starting appeal tally job...');

  try {
    // 1. Query appeals that are ready for tallying
    const appealsContainer = getContainer('appeals');

    // Get appeals that are:
    // - In community review queue
    // - Status is pending or tallying
    // - Not yet expired
    const appealsQuery = {
      query: `
                SELECT * FROM c 
                WHERE c.reviewQueue = "community" 
                AND (c.status = "pending" OR c.status = "tallying")
                AND c.expiresAt > @now
                ORDER BY c.createdAt ASC
            `,
      parameters: [{ name: '@now', value: new Date().toISOString() }],
    };

    const { resources: pendingAppeals } = await appealsContainer.items
      .query(appealsQuery)
      .fetchAll();

    if (pendingAppeals.length === 0) {
      context.log('✅ No appeals ready for tallying');
      return;
    }

    context.log(`📊 Processing ${pendingAppeals.length} appeals for tallying`);

    // 2. Process each appeal
    const tallyResults: TallyResult[] = [];
    const votesContainer = getContainer('votes');
    const moderationLogsContainer = getContainer('moderationLogs');

    for (const appeal of pendingAppeals) {
      try {
        context.log(`Processing appeal ${appeal.id} for content ${appeal.contentId}`);

        // Check if appeal has expired
        if (isAppealExpired(appeal.createdAt)) {
          await processExpiredAppeal(appeal, appealsContainer, moderationLogsContainer, context);
          tallyResults.push({
            appealId: appeal.id,
            contentId: appeal.contentId,
            contentType: appeal.contentType,
            outcome: 'expired',
            votingSummary: { totalVotes: 0, approveVotes: 0, rejectVotes: 0, approvalRate: 0 },
            action: 'expired',
          });
          continue;
        }

        // Get all votes for this appeal
        const votesQuery = {
          query: 'SELECT * FROM c WHERE c.appealId = @appealId ORDER BY c.timestamp ASC',
          parameters: [{ name: '@appealId', value: appeal.id }],
        };
        const { resources: appealVotes } = await votesContainer.items.query(votesQuery).fetchAll();

        // Check if appeal is ready for tallying
        const { quorumMet, timeoutReached } = checkQuorum(appealVotes, appeal.createdAt);

        if (!quorumMet && !timeoutReached) {
          // Not ready for tallying yet
          continue;
        }

        // Calculate the outcome
        const outcome = calculateOutcome(appealVotes, appeal.createdAt);
        const votingSummary = generateVotingSummary(
          appeal.id,
          appeal.contentId,
          appealVotes,
          appeal.createdAt
        );

        // Process the tally result
        const tallyResult = await processTallyResult(
          appeal,
          appealVotes,
          outcome,
          votingSummary,
          appealsContainer,
          moderationLogsContainer,
          context
        );

        tallyResults.push(tallyResult);
      } catch (appealError: any) {
        context.error(`Error processing appeal ${appeal.id}: ${appealError.message}`);
        tallyResults.push({
          appealId: appeal.id,
          contentId: appeal.contentId,
          contentType: appeal.contentType,
          outcome: 'timeout',
          votingSummary: { totalVotes: 0, approveVotes: 0, rejectVotes: 0, approvalRate: 0 },
          action: 'no_change',
          error: appealError.message,
        });
        continue;
      }
    }

    // 3. Log job completion summary
    const processingTime = Date.now() - startTime;
    const successful = tallyResults.filter(r => !r.error).length;
    const failed = tallyResults.filter(r => r.error).length;
    const approved = tallyResults.filter(r => r.outcome === 'approved').length;
    const rejected = tallyResults.filter(r => r.outcome === 'rejected').length;
    const expired = tallyResults.filter(r => r.outcome === 'expired').length;

    context.log(`✅ Tally job completed in ${processingTime}ms:`);
    context.log(`   📊 Processed: ${tallyResults.length} appeals`);
    context.log(`   ✅ Successful: ${successful}`);
    context.log(`   ❌ Failed: ${failed}`);
    context.log(`   👍 Approved: ${approved}`);
    context.log(`   👎 Rejected: ${rejected}`);
    context.log(`   ⏰ Expired: ${expired}`);

    // 4. Log job summary to moderation logs
    const jobSummary = {
      id: uuidv4(),
      type: 'tally_job_completed',
      timestamp: new Date().toISOString(),
      processingTime,
      results: {
        total: tallyResults.length,
        successful,
        failed,
        approved,
        rejected,
        expired,
      },
      tallyResults: tallyResults.map(r => ({
        appealId: r.appealId,
        contentId: r.contentId,
        outcome: r.outcome,
        action: r.action,
        error: r.error,
      })),
    };

    await moderationLogsContainer.items.create(jobSummary);
  } catch (error: any) {
    context.error('Tally job error:', error);
    throw error;
  }
}

/**
 * Process an expired appeal
 */
async function processExpiredAppeal(
  appeal: any,
  appealsContainer: any,
  moderationLogsContainer: any,
  context: InvocationContext
): Promise<void> {
  // Update appeal status to expired
  const appealUpdate = [
    {
      op: 'replace' as const,
      path: '/status',
      value: 'expired',
    },
    {
      op: 'replace' as const,
      path: '/resolvedAt',
      value: new Date().toISOString(),
    },
  ];

  await appealsContainer.item(appeal.id, appeal.id).patch(appealUpdate);

  // Log expiration
  const expirationRecord = {
    id: uuidv4(),
    type: 'appeal_expired',
    appealId: appeal.id,
    contentId: appeal.contentId,
    contentType: appeal.contentType,
    reason: 'Appeal exceeded 30-day expiry window',
    timestamp: new Date().toISOString(),
  };

  await moderationLogsContainer.items.create(expirationRecord);
  context.log(`⏰ Appeal ${appeal.id} expired without resolution`);
}

/**
 * Process a tally result and update content accordingly
 */
async function processTallyResult(
  appeal: any,
  votes: VoteRecord[],
  outcome: string,
  votingSummary: any,
  appealsContainer: any,
  moderationLogsContainer: any,
  context: InvocationContext
): Promise<TallyResult> {
  const timestamp = new Date().toISOString();
  let action: TallyResult['action'] = 'no_change';

  try {
    // Update content based on outcome
    if (outcome === 'approved') {
      // Restore content visibility
      await updateContentVisibility(appeal, 'public', 'community_approved', context);
      action = 'restored';
      context.log(`👍 Appeal ${appeal.id} APPROVED - content restored`);
    } else if (outcome === 'rejected') {
      // Keep content hidden
      await updateContentVisibility(appeal, 'hidden', 'community_rejected', context);
      action = 'kept_hidden';
      context.log(`👎 Appeal ${appeal.id} REJECTED - content remains hidden`);
    } else if (outcome === 'timeout') {
      // Timeout with no votes - keep hidden by default
      action = 'kept_hidden';
      context.log(`⏰ Appeal ${appeal.id} TIMEOUT - no votes received`);
    }

    // Update appeal status to resolved
    const appealUpdate = [
      {
        op: 'replace' as const,
        path: '/status',
        value: 'resolved',
      },
      {
        op: 'replace' as const,
        path: '/outcome',
        value: outcome,
      },
      {
        op: 'replace' as const,
        path: '/resolvedAt',
        value: timestamp,
      },
      {
        op: 'replace' as const,
        path: '/finalVotingStats',
        value: votingSummary,
      },
    ];

    await appealsContainer.item(appeal.id, appeal.id).patch(appealUpdate);

    // Log detailed tally result
    const tallyRecord = {
      id: uuidv4(),
      type: 'appeal_tallied',
      appealId: appeal.id,
      contentId: appeal.contentId,
      contentType: appeal.contentType,
      appealType: appeal.appealType,
      outcome,
      action,
      votingSummary,
      votes: votes.map(v => ({
        userId: v.userId,
        vote: v.vote,
        timestamp: v.timestamp,
        userReputation: v.userReputation,
      })),
      timestamp,
    };

    await moderationLogsContainer.items.create(tallyRecord);

    return {
      appealId: appeal.id,
      contentId: appeal.contentId,
      contentType: appeal.contentType,
      outcome: outcome as any,
      votingSummary: {
        totalVotes: votingSummary.totalVotes,
        approveVotes: votingSummary.approveVotes,
        rejectVotes: votingSummary.rejectVotes,
        approvalRate: votingSummary.approvalRate,
      },
      action,
    };
  } catch (updateError: any) {
    context.error(`Failed to process tally for appeal ${appeal.id}: ${updateError.message}`);
    throw updateError;
  }
}

/**
 * Update content visibility based on community decision
 */
async function updateContentVisibility(
  appeal: any,
  visibility: string,
  moderationStatus: string,
  context: InvocationContext
): Promise<void> {
  const collectionName = appeal.contentType === 'user' ? 'users' : `${appeal.contentType}s`;
  const contentContainer = getContainer(collectionName);

  const contentUpdate = [
    {
      op: 'replace' as const,
      path: '/visibility',
      value: visibility,
    },
    {
      op: 'replace' as const,
      path: '/moderationStatus',
      value: moderationStatus,
    },
    {
      op: 'replace' as const,
      path: '/communityReviewedAt',
      value: new Date().toISOString(),
    },
    {
      op: 'replace' as const,
      path: '/appealStatus',
      value: 'resolved',
    },
    {
      op: 'replace' as const,
      path: '/updatedAt',
      value: new Date().toISOString(),
    },
  ];

  await contentContainer.item(appeal.contentId, appeal.contentId).patch(contentUpdate);
}

// Timer trigger: Run every 2 minutes
app.timer('tallyAppealsJob', {
  schedule: '0 */2 * * * *', // Every 2 minutes
  handler: tallyAppealsJob,
});
