/**
 * ASORA APPEAL VOTING ENDPOINT
 *
 * 🎯 Purpose: Allow moderators to vote on content appeals
 * 🔐 Security: JWT authentication + role verification + duplicate prevention
 * 🚨 Features: Democratic voting, time-window resolution
 * 📊 Models: Community moderation with weighted voting
 */

import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import type { JWTPayload } from 'jose';
import { z } from 'zod';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { penalizeContentRemoval } from '@shared/services/reputationService';
import { enqueueUserNotification } from '@shared/services/notificationEvents';
import { NotificationEventType } from '../../notifications/types';

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

function normalizeRequiredVotes(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 3;
  }
  return Math.max(1, Math.floor(parsed));
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
    const { resources: appealMatches } = await appealsContainer.items
      .query(
        {
          query: 'SELECT * FROM c WHERE c.id = @appealId',
          parameters: [{ name: '@appealId', value: targetAppealId }],
        },
        { maxItemCount: 1 }
      )
      .fetchAll();

    const appealDoc = appealMatches[0];
    if (!appealDoc) {
      return {
        status: 404,
        jsonBody: { error: 'Appeal not found' },
      };
    }
    const appealPartitionKey = String(appealDoc.contentId ?? targetAppealId);

    // 6. Check if appeal is still active
    if (appealDoc.status !== 'pending') {
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
      const finalDecision = await resolveAppealFromVotes({
        database,
        appealDoc,
        context,
        resolvedBy: 'community_vote',
        resolvedAt: now.toISOString(),
      });
      await appealsContainer.item(targetAppealId, appealPartitionKey).replace(appealDoc);

      return {
        status: 409,
        jsonBody: {
          error: 'Appeal has expired',
          expiredAt: appealDoc.expiresAt,
          finalDecision,
          status: appealDoc.status,
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
    appealDoc.votingStatus = 'in_progress';

    const requiredVotes = normalizeRequiredVotes(appealDoc.requiredVotes);
    const hasQuorum = Number(appealDoc.totalVotes ?? 0) >= requiredVotes;
    appealDoc.requiredVotes = requiredVotes;
    appealDoc.hasReachedQuorum = hasQuorum;

    let finalDecision: 'approved' | 'rejected' | null = null;
    if (hasQuorum) {
      finalDecision = await resolveAppealFromVotes({
        database,
        appealDoc,
        context,
        resolvedBy: 'community_vote',
        resolvedAt: now.toISOString(),
      });
    }

    await appealsContainer.item(targetAppealId, appealPartitionKey).replace(appealDoc);

    context.log(
      `Vote cast on appeal ${targetAppealId} by ${userId}: ${vote} (weight: ${voterWeight})`
    );

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

interface ResolveAppealOptions {
  database: ReturnType<typeof getCosmosDatabase>;
  appealDoc: Record<string, any>;
  context: InvocationContext;
  resolvedBy?: string;
  resolvedAt?: string;
}

export async function resolveAppealFromVotes({
  database,
  appealDoc,
  context,
  resolvedBy = 'community_vote',
  resolvedAt,
}: ResolveAppealOptions): Promise<'approved' | 'rejected'> {
  const votesFor = Number(appealDoc.votesFor ?? 0);
  const votesAgainst = Number(appealDoc.votesAgainst ?? 0);
  const finalDecision = votesFor > votesAgainst ? 'approved' : 'rejected';
  const resolvedAtValue = resolvedAt ?? new Date().toISOString();
  const requiredVotes = normalizeRequiredVotes(appealDoc.requiredVotes);

  appealDoc.totalVotes = votesFor + votesAgainst;
  appealDoc.requiredVotes = requiredVotes;
  appealDoc.hasReachedQuorum = true;
  appealDoc.votingStatus = 'completed';
  appealDoc.resolvedAt = resolvedAtValue;
  appealDoc.resolvedBy = resolvedBy;
  appealDoc.finalDecision = finalDecision;
  appealDoc.status = finalDecision;
  appealDoc.updatedAt = resolvedAtValue;

  await updateContentBasedOnDecision(
    database,
    appealDoc.contentId,
    appealDoc.contentType,
    finalDecision,
    context
  );

  await persistModerationDecision({
    database,
    appealDoc,
    finalDecision,
    context,
  });

  const submitterId = typeof appealDoc.submitterId === 'string' ? appealDoc.submitterId : undefined;
  if (submitterId) {
    void enqueueUserNotification({
      context,
      userId: submitterId,
      eventType: NotificationEventType.MODERATION_APPEAL_DECIDED,
      payload: {
        targetId: String(appealDoc.id ?? appealDoc.contentId ?? ''),
        targetType: 'appeal',
        snippet:
          finalDecision === 'approved'
            ? 'Your appeal was approved and content was restored.'
            : 'Your appeal was rejected and content remains blocked.',
        decision: finalDecision,
      },
      dedupeKey: `appeal_decision:${String(appealDoc.id ?? appealDoc.contentId ?? '')}:${finalDecision}`,
    });
  }

  return finalDecision;
}

interface ContentLookup {
  container: any;
  document: Record<string, any>;
  partitionKey: string;
}

async function fetchContentForDecision(
  database: any,
  contentType: string,
  contentId: string
): Promise<ContentLookup | null> {
  if (contentType === 'post') {
    const container = database.container('posts');
    const { resource } = await container.item(contentId, contentId).read();
    if (!resource) {
      return null;
    }
    return { container, document: resource, partitionKey: contentId };
  }

  if (contentType === 'comment') {
    const container = database.container('posts');
    const { resources } = await container.items
      .query(
        {
          query: 'SELECT TOP 1 * FROM c WHERE c.id = @id AND c.type = "comment"',
          parameters: [{ name: '@id', value: contentId }],
        },
        { maxItemCount: 1 }
      )
      .fetchAll();
    const document = resources[0] as Record<string, any> | undefined;
    if (!document) {
      return null;
    }
    const partitionKey = String(document._partitionKey ?? document.postId ?? contentId);
    return { container, document, partitionKey };
  }

  const container = database.container('users');
  const { resource } = await container.item(contentId, contentId).read();
  if (!resource) {
    return null;
  }
  return { container, document: resource, partitionKey: contentId };
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
    const contentLookup = await fetchContentForDecision(database, contentType, contentId);
    if (!contentLookup) {
      return;
    }

    const { container, document: content, partitionKey } = contentLookup;
    const nowIso = new Date().toISOString();
    const updatedAtValue = typeof content.updatedAt === 'number' ? Date.now() : nowIso;

    if (decision === 'approved') {
      // Appeal approved - restore content
      content.status = 'published';
      content.appealStatus = 'approved';
      content.restoredAt = nowIso;
      context.log(`Content ${contentId} restored after successful appeal`);
    } else {
      // Appeal rejected - keep content blocked and penalize author
      content.status = 'blocked';
      content.appealStatus = 'rejected';
      content.blockedAt = nowIso;
      context.log(`Content ${contentId} remains blocked after rejected appeal`);

      // ─────────────────────────────────────────────────────────────
      // Reputation Penalty - Deduct reputation for confirmed violation
      // ─────────────────────────────────────────────────────────────
      const authorId = content.authorId || content.userId;
      if (authorId && (contentType === 'post' || contentType === 'comment')) {
        // Use flagReason or moderationCategory if available for severity-based penalty
        const violationType =
          content.flagReason || content.moderationCategory || content.moderation?.categories?.[0];

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

    if (content.moderation) {
      content.moderation.status = decision === 'approved' ? 'clean' : 'blocked';
      content.moderation.checkedAt = Date.now();
    }

    content.updatedAt = updatedAtValue;
    await container.item(contentId, partitionKey).replace(content);
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
    const contentLookup = await fetchContentForDecision(
      database,
      String(appealDoc.contentType),
      String(appealDoc.contentId)
    );
    const content = contentLookup?.document ?? null;

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
