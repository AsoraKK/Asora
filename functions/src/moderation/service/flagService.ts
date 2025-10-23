/**
 * ASORA CONTENT FLAGGING ENDPOINT
 *
 * 🎯 Purpose: Allow users to flag inappropriate content for review
 * 🔐 Security: JWT authentication + rate limiting + spam prevention
 * 🚨 Features: Content flagging, duplicate prevention, Hive AI analysis
 * 📊 Models: User reports with optional AI verification
 */

import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { CosmosClient } from '@azure/cosmos';
import { createHiveClient, HiveAIClient } from '@shared/clients/hive';
import { createRateLimiter, endpointKeyGenerator, defaultKeyGenerator } from '@shared/utils/rateLimiter';

// Request validation schema
const FlagContentSchema = z.object({
  contentId: z.string().min(1),
  contentType: z.enum(['post', 'comment', 'user', 'message']),
  reason: z.enum([
    'spam',
    'harassment',
    'hate_speech',
    'violence',
    'adult_content',
    'misinformation',
    'copyright',
    'privacy',
    'other',
  ]),
  additionalDetails: z.string().max(1000).optional(),
  urgency: z.enum(['low', 'medium', 'high']).default('medium'),
});

// Rate limiter: 5 flags per hour per user to prevent abuse
const flagRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
  keyGenerator: (() => {
    try {
      return endpointKeyGenerator('flag-content');
    } catch {
      return defaultKeyGenerator;
    }
  })(),
});

interface FlagContentParams {
  request: HttpRequest;
  context: InvocationContext;
  userId: string;
}

export async function flagContentHandler({
  request,
  context,
  userId,
}: FlagContentParams): Promise<HttpResponseInit> {
  context.log('Content flag request received');

  try {
    // 1. Authentication already handled upstream; ensure userId is present
    if (!userId) {
      return {
        status: 401,
        jsonBody: { error: 'Missing authorization header' },
      };
    }

    // 2. Rate limiting
    const rateLimitResult = await flagRateLimiter.checkRateLimit(request);
    if (rateLimitResult.blocked) {
      return {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
        },
        jsonBody: {
          error: 'Too many flags. Please wait before flagging more content.',
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime,
        },
      };
    }

    // 3. Request validation
    const requestBody = await request.json();
    const validationResult = FlagContentSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return {
        status: 400,
        jsonBody: {
          error: 'Invalid request data',
          details: validationResult.error.issues,
        },
      };
    }

    const { contentId, contentType, reason, additionalDetails, urgency } = validationResult.data;

    // 4. Initialize Cosmos DB
    const cosmosClient = new CosmosClient(process.env.COSMOS_CONNECTION_STRING || '');
    const database = cosmosClient.database('asora');
    const flagsContainer = database.container('flags');

    // 5. Check for duplicate flags by the same user
    const existingFlagQuery = {
      query:
        'SELECT * FROM c WHERE c.contentId = @contentId AND c.flaggedBy = @userId AND c.status = "active"',
      parameters: [
        { name: '@contentId', value: contentId },
        { name: '@userId', value: userId },
      ],
    };

    const { resources: existingFlags } = await flagsContainer.items
      .query(existingFlagQuery)
      .fetchAll();

    if (existingFlags.length > 0) {
      return {
        status: 409,
        jsonBody: {
          error: 'You have already flagged this content',
          existingFlagId: existingFlags[0].id,
        },
      };
    }

    // 6. Get the content for AI analysis (optional)
    let aiAnalysis = null;
    try {
      if (contentType === 'post' || contentType === 'comment') {
        const contentContainer = database.container(contentType === 'post' ? 'posts' : 'comments');
        const { resource: content } = await contentContainer.item(contentId, contentId).read();

        if (content && content.content) {
          const hiveClient = createHiveClient();
          const hiveResponse = await hiveClient.moderateText(userId, content.content);
          aiAnalysis = HiveAIClient.parseModerationResult(hiveResponse);
        }
      }
    } catch (error) {
      context.log('AI analysis failed for flag:', error);
      // Continue without AI analysis
    }

    // 7. Create flag record
    const flagId = `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // Calculate priority score based on reason and urgency
    const priorityScores: Record<string, number> = {
      violence: 10,
      hate_speech: 9,
      harassment: 8,
      adult_content: 7,
      misinformation: 6,
      spam: 5,
      privacy: 4,
      copyright: 3,
      other: 2,
    };

    const urgencyMultiplier: Record<string, number> = { high: 2, medium: 1.5, low: 1 };
    const priorityScore = (priorityScores[reason] || 2) * (urgencyMultiplier[urgency] || 1);

    const flagDocument = {
      id: flagId,
      contentId,
      contentType,
      flaggedBy: userId,
      reason,
      additionalDetails: additionalDetails || null,
      urgency,
      priorityScore,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      resolvedBy: null,
      aiAnalysis: aiAnalysis || null,
      moderatorNotes: null,
    };

    await flagsContainer.items.create(flagDocument);

    // 8. Update content flag count (for trending/priority)
    try {
      const contentContainer = database.container(
        contentType === 'post' ? 'posts' : contentType === 'comment' ? 'comments' : 'users'
      );
      const { resource: contentDoc } = await contentContainer.item(contentId, contentId).read();

      if (contentDoc) {
        contentDoc.flagCount = (contentDoc.flagCount || 0) + 1;
        contentDoc.lastFlaggedAt = now;

        // Auto-hide content if it reaches threshold
        if (contentDoc.flagCount >= 5) {
          contentDoc.status = 'hidden_pending_review';
        }

        await contentContainer.item(contentId, contentId).replace(contentDoc);
      }
    } catch (error) {
      context.log('Failed to update content flag count:', error);
      // Don't fail the request if this fails
    }

    context.log(`Content ${contentId} flagged by ${userId} for ${reason}`);

    return {
      status: 201,
      jsonBody: {
        flagId,
        message: 'Content flagged successfully',
        priorityScore,
        aiAnalysis: aiAnalysis
          ? {
              confidence: aiAnalysis.confidence,
              action: aiAnalysis.action,
              categories: aiAnalysis.flaggedCategories,
            }
          : null,
      },
    };
  } catch (error) {
    context.log('Error flagging content:', error);
    return {
      status: 500,
      jsonBody: {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}
