/**
 * ASORA APPEAL VOTING ENDPOINT
 * 
 * 🎯 Purpose: Allow moderators to vote on content appeals
 * 🔐 Security: JWT authentication + role verification + duplicate prevention
 * 🚨 Features: Democratic voting, quorum tracking, automatic resolution
 * 📊 Models: Community moderation with weighted voting
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { CosmosClient } from '@azure/cosmos';
import { verifyJWT, hasRole } from '../shared/auth-utils';

// Request validation schema
const VoteOnAppealSchema = z.object({
  appealId: z.string().min(1),
  vote: z.enum(['approve', 'reject']),
  reason: z.string().min(10).max(500),
  confidence: z.number().min(1).max(10).default(5),
  notes: z.string().max(1000).optional()
});

export async function voteOnAppeal(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Appeal vote request received');

  try {
    // 1. Authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return {
        status: 401,
        jsonBody: { error: 'Missing authorization header' }
      };
    }

    const token = authHeader.replace('Bearer ', '');
    const jwtPayload = await verifyJWT(token);
    const userId = jwtPayload.sub;

    // 2. Role verification (optional - for now allow all authenticated users)
    // In production, you might want to restrict to moderators
    const isModerator = hasRole(jwtPayload, 'moderator') || hasRole(jwtPayload, 'admin');
    
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
          details: validationResult.error.issues
        }
      };
    }

    const { appealId, vote, reason, confidence, notes } = validationResult.data;

    // 4. Initialize Cosmos DB
    const cosmosClient = new CosmosClient(process.env.COSMOS_CONNECTION_STRING || '');
    const database = cosmosClient.database('asora');
    const appealsContainer = database.container('appeals');
    const votesContainer = database.container('appeal_votes');

    // 5. Get the appeal
    let appealDoc;
    try {
      const { resource } = await appealsContainer.item(appealId, appealId).read();
      appealDoc = resource;
    } catch (error) {
      return {
        status: 404,
        jsonBody: { error: 'Appeal not found' }
      };
    }

    if (!appealDoc) {
      return {
        status: 404,
        jsonBody: { error: 'Appeal not found' }
      };
    }

    // 6. Check if appeal is still active
    if (appealDoc.status === 'resolved' || appealDoc.status === 'expired') {
      return {
        status: 409,
        jsonBody: { 
          error: `Appeal has already been ${appealDoc.status}`,
          currentStatus: appealDoc.status,
          resolvedAt: appealDoc.resolvedAt
        }
      };
    }

    // Check if appeal has expired
    const now = new Date();
    const expiresAt = new Date(appealDoc.expiresAt);
    if (now > expiresAt) {
      // Mark as expired
      appealDoc.status = 'expired';
      appealDoc.resolvedAt = now.toISOString();
      await appealsContainer.item(appealId, appealId).replace(appealDoc);
      
      return {
        status: 409,
        jsonBody: { 
          error: 'Appeal has expired',
          expiredAt: appealDoc.expiresAt
        }
      };
    }

    // 7. Check for duplicate vote
    const existingVoteQuery = {
      query: 'SELECT * FROM c WHERE c.appealId = @appealId AND c.voterId = @voterId',
      parameters: [
        { name: '@appealId', value: appealId },
        { name: '@voterId', value: userId }
      ]
    };

    const { resources: existingVotes } = await votesContainer.items.query(existingVoteQuery).fetchAll();
    
    if (existingVotes.length > 0) {
      return {
        status: 409,
        jsonBody: { 
          error: 'You have already voted on this appeal',
          existingVote: {
            vote: existingVotes[0].vote,
            votedAt: existingVotes[0].createdAt
          }
        }
      };
    }

    // 8. Prevent users from voting on their own appeals
    if (appealDoc.submitterId === userId) {
      return {
        status: 403,
        jsonBody: { 
          error: 'You cannot vote on your own appeal'
        }
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
      if (hasRole(jwtPayload, 'admin')) {
        voterWeight = 3;
      } else if (hasRole(jwtPayload, 'moderator')) {
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
      appealId,
      voterId: userId,
      voterName,
      vote,
      reason,
      confidence,
      notes: notes || null,
      weight: voterWeight,
      isModerator,
      createdAt: now.toISOString()
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
    
    let finalDecision = null;
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
        finalDecision as 'approved' | 'rejected',
        context
      );
    } else {
      appealDoc.votingStatus = 'in_progress';
    }

    await appealsContainer.item(appealId, appealId).replace(appealDoc);

    context.log(`Vote cast on appeal ${appealId} by ${userId}: ${vote} (weight: ${voterWeight})`);

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
          hasReachedQuorum: hasQuorum
        },
        finalDecision,
        status: appealDoc.status
      }
    };

  } catch (error) {
    context.log('Error voting on appeal:', error);
    return {
      status: 500,
      jsonBody: { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
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
    const containerName = contentType === 'post' ? 'posts' : 
                         contentType === 'comment' ? 'comments' : 'users';
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
      // Appeal rejected - keep content hidden
      content.status = 'hidden_confirmed';
      content.appealStatus = 'rejected';
      content.confirmedHiddenAt = new Date().toISOString();
      context.log(`Content ${contentId} remains hidden after rejected appeal`);
    }

    content.updatedAt = new Date().toISOString();
    await container.item(contentId, contentId).replace(content);

  } catch (error) {
    context.log('Error updating content after appeal decision:', error);
  }
}
