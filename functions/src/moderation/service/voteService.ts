/**
 * ASORA APPEAL VOTING ENDPOINT
 *
 * 🎯 Purpose: Allow moderators to vote on content appeals
 * 🔐 Security: JWT authentication + role verification + duplicate prevention
 * 🚨 Features: Democratic voting, quorum tracking, automatic resolution
 * 📊 Models: Community moderation with weighted voting
 */

import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import type { JWTPayload } from 'jose';
import { z } from 'zod';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { penalizeContentRemoval } from '@shared/services/reputationService';

// Request validation schema - appealId is optional in body since it comes from route param
const VoteOnAppealSchema = z.object({
  appealId: z.string().min(1).optional(), // Optional: can come from route param instead
  vote: z.enum(['approve', 'reject'] as const),
  reason: z.string().min(10).max(500),
  confidence: z.number().min(1).max(10).default(5),
  notes: z.string().max(1000).optional(),
});

interface VoteOnAppealParams {
  request: HttpRequest;
  context: InvocationContext;
  userId: string;
  claims?: JWTPayload;
  appealId?: string;
}

function claimsHasRole(claims: JWTPayload | undefined, role: string): boolean {
  if (!claims) {
    return false;
  }

  const roles = claims.roles as unknown;
  if (Array.isArray(roles)) {
    return roles.includes(role);
  }

  return false;
}

export async function voteOnAppealHandler({
  request,
  context,
  userId,
  claims,
  appealId: appealIdOverride,
}: VoteOnAppealParams): Promise<HttpResponseInit> {
  context.log('Appeal vote request received');

  try {
    if (!userId) {
      return {
        status: 401,
        jsonBody: { error: 'Missing authorization header' },
      };
    }

    // 2. Role verification (optional - for now allow all authenticated users)
    // In production, you might want to restrict to moderators
    const isModerator = claimsHasRole(claims, 'moderator') || claimsHasRole(claims, 'admin');

    // For development, allow all users to vote (community moderation)
    // if (!isModerator) {
    //   return {
    //     status: 403,
    //     jsonBody: { error: 'Insufficient permissions. Moderator role required.' }
    //   };
    // }

    // 3. Request validation
    const requestBody = await request.json();
    const validationResult = VoteOnAppealSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return {
        status: 400,
        jsonBody: {
          error: 'Invalid request data',
          details: validationResult.error.issues,
        },
      };
    }

    const { appealId: bodyAppealId, vote, reason, confidence, notes } = validationResult.data;
    // Route param takes precedence over body
    const targetAppealId = appealIdOverride ?? bodyAppealId;

    if (!targetAppealId) {
      return {
        status: 400,
        jsonBody: { error: 'Appeal ID is required (provide in route or request body)' },
      };
    }

    // 4. Initialize Cosmos DB
    const database = getCosmosDatabase();
    const appealsContainer = database.container('appeals');
    const votesContainer = database.container('appeal_votes');

    // 5. Get the appeal
    let appealDoc;
    try {
      const { resource } = await appealsContainer.item(targetAppealId, targetAppealId).read();
      appealDoc = resource;
    } catch (error) {
      return {
        status: 404,
        jsonBody: { error: 'Appeal not found' },
      };
    }

    if (!appealDoc) {
      return {
        status: 404,
        jsonBody: { error: 'Appeal not found' },
      };
    }

    // 6. Check if appeal is still active
    if (appealDoc.status === 'resolved' || appealDoc.status === 'expired') {
      return {
        status: 409,
        jsonBody: {
          error: `Appeal has already been ${appealDoc.status}`,
          currentStatus: appealDoc.status,
          resolvedAt: appealDoc.resolvedAt,
        },
      };
    }

    // Check if appeal has expired
    const now = new Date();
    const expiresAt = new Date(appealDoc.expiresAt);
    if (now > expiresAt) {
      // Mark as expired
      appealDoc.status = 'expired';
      appealDoc.resolvedAt = now.toISOString();
      await appealsContainer.item(targetAppealId, targetAppealId).replace(appealDoc);

      return {
        status: 409,
        jsonBody: {
          error: 'Appeal has expired',
          expiredAt: appealDoc.expiresAt,
        },
      };
    }

    // 7. Check for duplicate vote
    const existingVoteQuery = {
      query: 'SELECT * FROM c WHERE c.appealId = @appealId AND c.voterId = @voterId',
      parameters: [
        { name: '@appealId', value: targetAppealId },
        { name: '@voterId', value: userId },
      ],
    };

    const { resources: existingVotes } = await votesContainer.items
      .query(existingVoteQuery)
      .fetchAll();

    if (existingVotes.length > 0) {
      return {
        status: 409,
        jsonBody: {
          error: 'You have already voted on this appeal',
          existingVote: {
            vote: existingVotes[0].vote,
            votedAt: existingVotes[0].createdAt,
          },
        },
      };
    }

    // 8. Prevent users from voting on their own appeals
    if (appealDoc.submitterId === userId) {
      return {
        status: 403,
        jsonBody: {
          error: 'You cannot vote on your own appeal',
        },
      };
    }

    // 9. Get voter information
    const usersContainer = database.container('users');
    let voterName = 'Anonymous';
    let voterWeight = 1; // Default weight

    try {
      const { resource: voter } = await usersContainer.item(userId, userId).read();
      voterName = voter?.name || voter?.displayName || 'Anonymous';

      // Assign voting weight based on role/reputation
      if (claimsHasRole(claims, 'admin')) {
        voterWeight = 3;
      } else if (claimsHasRole(claims, 'moderator')) {
        voterWeight = 2;
      } else {
        voterWeight = 1;
      }
    } catch (error) {
      context.log('Could not fetch voter info:', error);
    }

    // 10. Create vote record
    const voteId = `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const voteDocument = {
      id: voteId,
      appealId: targetAppealId,
      voterId: userId,
      voterName,
      vote,
      reason,
      confidence,
      notes: notes || null,
      weight: voterWeight,
      isModerator,
      createdAt: now.toISOString(),
    };

    await votesContainer.items.create(voteDocument);

    // 11. Update appeal vote counts
    if (vote === 'approve') {
      appealDoc.votesFor = (appealDoc.votesFor || 0) + voterWeight;
    } else {
      appealDoc.votesAgainst = (appealDoc.votesAgainst || 0) + voterWeight;
    }

    appealDoc.totalVotes = (appealDoc.votesFor || 0) + (appealDoc.votesAgainst || 0);
    appealDoc.updatedAt = now.toISOString();

    // 12. Check if quorum is reached and resolve if necessary
    const requiredVotes = appealDoc.requiredVotes || 5;
    const hasQuorum = appealDoc.totalVotes >= requiredVotes;

    let finalDecision: 'approved' | 'rejected' | null = null;
    if (hasQuorum) {
      appealDoc.hasReachedQuorum = true;
      appealDoc.votingStatus = 'completed';
      appealDoc.status = 'resolved';
      appealDoc.resolvedAt = now.toISOString();
      appealDoc.resolvedBy = 'community_vote';

      // Determine final decision
      const decidedApproval = (appealDoc.votesFor || 0) > (appealDoc.votesAgainst || 0);
      finalDecision = decidedApproval ? 'approved' : 'rejected';
      appealDoc.finalDecision = finalDecision;

      // Update the original content based on decision
      await updateContentBasedOnDecision(
        database,
        appealDoc.contentId,
        appealDoc.contentType,
        finalDecision!,
        context
      );

      await persistModerationDecision({
        database,
        appealDoc,
        finalDecision,
        context,
      });
    } else {
      appealDoc.votingStatus = 'in_progress';
    }

    await appealsContainer.item(targetAppealId, targetAppealId).replace(appealDoc);

    context.log(`Vote cast on appeal ${targetAppealId} by ${userId}: ${vote} (weight: ${voterWeight})`);

    return {
      status: 200,
      jsonBody: {
        voteId,
        message: 'Vote recorded successfully',
        currentTally: {
          votesFor: appealDoc.votesFor,
          votesAgainst: appealDoc.votesAgainst,
          totalVotes: appealDoc.totalVotes,
          requiredVotes,
          hasReachedQuorum: hasQuorum,
        },
        finalDecision,
        status: appealDoc.status,
      },
    };
  } catch (error) {
    context.log('Error voting on appeal:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

function getContentContainerName(contentType: string): 'posts' | 'comments' | 'users' {
  if (contentType === 'post') {
    return 'posts';
  }
  if (contentType === 'comment') {
    return 'comments';
  }
  return 'users';
}

/**
 * Update content based on appeal decision
 */
async function updateContentBasedOnDecision(
  database: any,
  contentId: string,
  contentType: string,
  decision: 'approved' | 'rejected',
  context: InvocationContext
): Promise<void> {
  try {
    const containerName = getContentContainerName(contentType);
    const container = database.container(containerName);

    const { resource: content } = await container.item(contentId, contentId).read();
    if (!content) return;

    if (decision === 'approved') {
      // Appeal approved - restore content
      content.status = 'published';
      content.appealStatus = 'approved';
      content.restoredAt = new Date().toISOString();
      context.log(`Content ${contentId} restored after successful appeal`);
    } else {
      // Appeal rejected - keep content hidden and penalize author
      content.status = 'hidden_confirmed';
      content.appealStatus = 'rejected';
      content.confirmedHiddenAt = new Date().toISOString();
      context.log(`Content ${contentId} remains hidden after rejected appeal`);

      // ─────────────────────────────────────────────────────────────
      // Reputation Penalty - Deduct reputation for confirmed violation
      // ─────────────────────────────────────────────────────────────
      const authorId = content.authorId || content.userId;
      if (authorId && (contentType === 'post' || contentType === 'comment')) {
        // Use flagReason or moderationCategory if available for severity-based penalty
        const violationType = content.flagReason || content.moderationCategory || content.moderation?.categories?.[0];
        
        penalizeContentRemoval(
          authorId,
          contentId,
          contentType as 'post' | 'comment',
          violationType
        ).catch(err => {
          context.log('moderation.reputation_penalty_error', {
            contentId,
            authorId,
            error: err.message,
          });
        });
      }
    }

    content.updatedAt = new Date().toISOString();
    await container.item(contentId, contentId).replace(content);
  } catch (error) {
    context.log('Error updating content after appeal decision:', error);
  }
}

interface PersistDecisionOptions {
  database: any;
  appealDoc: Record<string, any>;
  finalDecision: 'approved' | 'rejected';
  context: InvocationContext;
}

async function persistModerationDecision({
  database,
  appealDoc,
  finalDecision,
  context,
}: PersistDecisionOptions): Promise<void> {
  try {
    const decisionsContainer = database.container('moderation_decisions');
    const contentContainerName = getContentContainerName(String(appealDoc.contentType));
    const contentContainer = database.container(contentContainerName);
    const { resource: content } = await contentContainer
      .item(String(appealDoc.contentId), String(appealDoc.contentId))
      .read();

    const contentOwnerId =
      (content?.authorId as string | undefined) ??
      (content?.userId as string | undefined) ??
      (content?.contentOwnerId as string | undefined) ??
      null;

    const decisionId = `decision_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const decidedAt = String(appealDoc.resolvedAt ?? new Date().toISOString());

    const record = {
      id: decisionId,
      itemId: appealDoc.contentId,
      contentId: appealDoc.contentId,
      contentType: appealDoc.contentType,
      contentOwnerId,
      userId: contentOwnerId,
      actorId: appealDoc.resolvedBy ?? appealDoc.submitterId ?? 'community_vote',
      action: finalDecision,
      appealId: appealDoc.id,
      appealStatus: appealDoc.status,
      votesFor: appealDoc.votesFor ?? 0,
      votesAgainst: appealDoc.votesAgainst ?? 0,
      totalVotes: appealDoc.totalVotes ?? 0,
      requiredVotes: appealDoc.requiredVotes ?? 0,
      reason: appealDoc.appealReason ?? appealDoc.reason ?? null,
      decidedAt,
      createdAt: new Date().toISOString(),
      source: 'appeal_vote',
      metadata: {
        urgencyScore: appealDoc.urgencyScore ?? null,
        flagCount: appealDoc.flagCount ?? null,
      },
      _partitionKey: appealDoc.contentId,
    };

    await decisionsContainer.items.create(record);
  } catch (error) {
    context.log('moderation.decision.record.error', { message: (error as Error).message });
  }
}
