/**
 * ASORA POST CREATION ENDPOINT
 * 
 * 🎯 Purpose: Create new posts with AI-powered content moderation
 * 🔐 Security: JWT authentication + Hive AI content scanning
 * 🚨 Features: Automatic content flagging, rate limiting, spam prevention
 * 📊 Models: Text analysis, image scanning, policy enforcement
 */

import { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { CosmosClient } from '@azure/cosmos';
import { createHiveClient, HiveAIClient } from '../shared/hive-client';
import { verifyJWT, extractUserIdFromJWT } from '../shared/auth-utils';
import { createRateLimiter } from '../shared/rate-limiter';

// Request validation schema
const CreatePostSchema = z.object({
  content: z.string().min(1).max(10000),
  title: z.string().min(1).max(200).optional(),
  contentType: z.enum(['text', 'image', 'video', 'link']),
  mediaUrls: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).max(10).optional(),
  visibility: z.enum(['public', 'followers', 'private']).default('public')
});

interface PostCreationResult {
  postId: string;
  status: 'published' | 'under_review' | 'rejected';
  moderationResult?: {
    action: string;
    confidence: number;
    flaggedCategories: string[];
  };
}

// Rate limiter: 10 posts per hour per user
const rateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  keyGenerator: (req: HttpRequest) => extractUserIdFromJWT(req.headers.get('authorization') || '')
});

export async function createPost(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Post creation request received');

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

    if (!userId) {
      return {
        status: 401,
        jsonBody: { error: 'Invalid token: missing user ID' }
      };
    }

    // 2. Rate limiting
    const rateLimitResult = await rateLimiter.checkRateLimit(request);
    if (rateLimitResult.blocked) {
      return {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
        },
        jsonBody: { 
          error: 'Rate limit exceeded',
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime
        }
      };
    }

    // 3. Request validation
    const requestBody = await request.json();
    const validationResult = CreatePostSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      return {
        status: 400,
        jsonBody: {
          error: 'Invalid request data',
          details: validationResult.error.issues
        }
      };
    }

    const { content, title, contentType, mediaUrls, tags, visibility } = validationResult.data;

    // 4. Content moderation with Hive AI
    const hiveClient = createHiveClient();
    let moderationResult;

    try {
      // Moderate text content
      const hiveResponse = await hiveClient.moderateText(userId, content);
      moderationResult = HiveAIClient.parseModerationResult(hiveResponse);

      // If there are images, moderate them too
      if (mediaUrls && mediaUrls.length > 0) {
        for (const mediaUrl of mediaUrls) {
          if (contentType === 'image') {
            const imageModerationResponse = await hiveClient.moderateImage(userId, mediaUrl);
            const imageModerationResult = HiveAIClient.parseModerationResult(imageModerationResponse);
            
            // Take the strictest action
            if (imageModerationResult.action === 'reject' || 
                (imageModerationResult.action === 'review' && moderationResult.action === 'accept')) {
              moderationResult = imageModerationResult;
            }
          }
        }
      }
    } catch (moderationError) {
      context.log('Hive AI moderation failed:', moderationError);
      // In case of moderation failure, err on the side of caution
      moderationResult = {
        action: 'review' as const,
        confidence: 0.8,
        flaggedCategories: ['moderation_error'],
        details: { error: 'Moderation service unavailable' }
      };
    }

    // 5. Determine post status based on moderation result
    let postStatus: 'published' | 'under_review' | 'rejected';
    
    switch (moderationResult.action) {
      case 'accept':
        postStatus = 'published';
        break;
      case 'review':
        postStatus = 'under_review';
        break;
      case 'reject':
        postStatus = 'rejected';
        break;
      default:
        postStatus = 'under_review';
    }

    // 6. Save to Cosmos DB
    const cosmosClient = new CosmosClient(process.env.COSMOS_CONNECTION_STRING || '');
    const database = cosmosClient.database('asora');
    const postsContainer = database.container('posts');

    const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const postDocument = {
      id: postId,
      userId,
      content,
      title: title || null,
      contentType,
      mediaUrls: mediaUrls || [],
      tags: tags || [],
      visibility,
      status: postStatus,
      createdAt: now,
      updatedAt: now,
      moderation: {
        hiveResponse: moderationResult,
        reviewedAt: null,
        reviewedBy: null,
        finalDecision: null
      },
      metrics: {
        likes: 0,
        shares: 0,
        comments: 0,
        views: 0
      }
    };

    await postsContainer.items.create(postDocument);

    // 7. If content is rejected, create a flag record
    if (postStatus === 'rejected' || postStatus === 'under_review') {
      const flagsContainer = database.container('flags');
      const flagId = `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const flagDocument = {
        id: flagId,
        contentId: postId,
        contentType: 'post',
        flaggedBy: 'system_hive_ai',
        reason: 'automated_content_policy_violation',
        categories: moderationResult.flaggedCategories,
        confidence: moderationResult.confidence,
        details: moderationResult.details,
        status: 'active',
        createdAt: now,
        resolvedAt: null
      };

      await flagsContainer.items.create(flagDocument);
    }

    // 8. Return result
    const result: PostCreationResult = {
      postId,
      status: postStatus,
      moderationResult: {
        action: moderationResult.action,
        confidence: moderationResult.confidence,
        flaggedCategories: moderationResult.flaggedCategories
      }
    };

    context.log(`Post ${postId} created with status: ${postStatus}`);

    return {
      status: postStatus === 'rejected' ? 200 : 201, // Still 201 for under_review
      jsonBody: result
    };

  } catch (error) {
    context.log('Error creating post:', error);
    return {
      status: 500,
      jsonBody: { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}
