/**
 * ASORA APPEAL SUBMISSION ENDPOINT
 *
 * 🎯 Purpose: Allow users to appeal content moderation decisions
 * 🔐 Security: JWT authentication + one appeal per content limit
 * 🚨 Features: Appeal creation, duplicate prevention, auto-prioritization
 * 📊 Models: Community-driven appeals system
 */

import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { getCosmosDatabase } from '@shared/clients/cosmos';
import { getModerationConfig } from '../config/moderationConfigProvider';

// Request validation schema
const SubmitAppealSchema = z.object({
  contentId: z.string().min(1),
  contentType: z.enum(['post', 'comment', 'user']),
  appealType: z.enum([
    'false_positive',
    'context_missing',
    'policy_disagreement',
    'technical_error',
    'other',
  ]),
  appealReason: z.string().min(10).max(200),
  userStatement: z.string().min(20).max(2000),
  evidenceUrls: z.array(z.string().url()).max(5).optional(),
});

interface SubmitAppealParams {
  request: HttpRequest;
  context: InvocationContext;
  userId: string;
}

export async function submitAppealHandler({
  request,
  context,
  userId,
}: SubmitAppealParams): Promise<HttpResponseInit> {
  context.log('Appeal submission request received');

  try {
    if (!userId) {
      return {
        status: 401,
        jsonBody: { error: 'Missing authorization header' },
      };
    }

    // 2. Request validation
    const requestBody = await request.json();
    const validationResult = SubmitAppealSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return {
        status: 400,
        jsonBody: {
          error: 'Invalid request data',
          details: validationResult.error.issues,
        },
      };
    }

    const { contentId, contentType, appealType, appealReason, userStatement, evidenceUrls } =
      validationResult.data;

    // 3. Initialize Cosmos DB
    const database = getCosmosDatabase();
    const appealsContainer = database.container('appeals');

    // 4. Check for existing appeals by the same user for the same content
    const existingAppealQuery = {
      query:
        'SELECT * FROM c WHERE c.contentId = @contentId AND c.submitterId = @userId AND c.status != "resolved"',
      parameters: [
        { name: '@contentId', value: contentId },
        { name: '@userId', value: userId },
      ],
    };

    const { resources: existingAppeals } = await appealsContainer.items
      .query(existingAppealQuery)
      .fetchAll();

    if (existingAppeals.length > 0) {
      return {
        status: 409,
        jsonBody: {
          error: 'You already have a pending appeal for this content',
          existingAppealId: existingAppeals[0].id,
          status: existingAppeals[0].status,
        },
      };
    }

    // 5. Verify the content exists and is actually flagged/moderated
    const contentContainer = database.container(
      contentType === 'post' ? 'posts' : contentType === 'comment' ? 'comments' : 'users'
    );
    let contentDoc;
    try {
      const { resource } = await contentContainer.item(contentId, contentId).read();
      contentDoc = resource;
    } catch (error) {
      return {
        status: 404,
        jsonBody: { error: 'Content not found' },
      };
    }

    // Check if content is actually moderated/flagged
    if (!contentDoc || !contentDoc.status || contentDoc.status === 'published') {
      return {
        status: 400,
        jsonBody: {
          error: 'Content is not under moderation and does not require an appeal',
        },
      };
    }

    // 6. Get user information for the appeal
    const usersContainer = database.container('users');
    let submitterName = 'Anonymous';
    try {
      const { resource: user } = await usersContainer.item(userId, userId).read();
      submitterName = user?.name || user?.displayName || 'Anonymous';
    } catch (error) {
      context.log('Could not fetch user info:', error);
    }

    // 7. Calculate urgency score and expiry
    const urgencyFactors: Record<string, number> = {
      false_positive: 8, // High urgency - likely incorrect moderation
      technical_error: 7, // High urgency - system issue
      context_missing: 6, // Medium-high urgency
      policy_disagreement: 4, // Medium urgency
      other: 3, // Lower urgency
    };

    const baseUrgency = urgencyFactors[appealType] || 3;
    const flagCount = contentDoc.flagCount || 0;
    const urgencyScore = Math.min(10, baseUrgency + Math.floor(flagCount / 2));

    // Appeal expires in 7 days
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 8. Create appeal record
    const appealId = `appeal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const appealDocument = {
      id: appealId,
      contentId,
      contentType,
      contentTitle: contentDoc.title || null,
      contentPreview: (contentDoc.content || '').substring(0, 200),
      appealType,
      appealReason,
      userStatement,
      evidenceUrls: evidenceUrls || [],

      // Submitter info
      submitterId: userId,
      submitterName,
      submittedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),

      // Original moderation info
      flagReason: contentDoc.flagReason || 'unknown',
      aiScore: contentDoc.moderation?.hiveResponse?.confidence || null,
      aiAnalysis: contentDoc.moderation?.hiveResponse?.details || null,
      flagCategories: contentDoc.moderation?.hiveResponse?.flaggedCategories || [],
      flagCount,

      // Voting status
      status: 'pending',
      votingStatus: 'not_started',
      urgencyScore,
      votesFor: 0,
      votesAgainst: 0,
      totalVotes: 0,
      requiredVotes: (await getModerationConfig()).appealRequiredVotes,
      hasReachedQuorum: false,

      // Timestamps
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      resolvedAt: null,
      resolvedBy: null,
    };

    await appealsContainer.items.create(appealDocument);

    // 9. Update content document to reference the appeal
    try {
      contentDoc.appealId = appealId;
      contentDoc.appealStatus = 'pending';
      contentDoc.updatedAt = now.toISOString();
      await contentContainer.item(contentId, contentId).replace(contentDoc);
    } catch (error) {
      context.log('Failed to update content with appeal reference:', error);
    }

    context.log(`Appeal ${appealId} submitted for content ${contentId} by ${userId}`);

    return {
      status: 201,
      jsonBody: {
        appealId,
        status: 'pending',
        message: 'Appeal submitted successfully',
        urgencyScore,
        expiresAt: expiresAt.toISOString(),
        estimatedReviewTime: urgencyScore >= 7 ? '24-48 hours' : '3-7 days',
      },
    };
  } catch (error) {
    context.log('Error submitting appeal:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
