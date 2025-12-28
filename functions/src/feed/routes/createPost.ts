import { app, HttpRequest, InvocationContext } from '@azure/functions';

import { requireAuth } from '@shared/middleware/auth';
import type { Principal } from '@shared/middleware/auth';
import { badRequest, created, serverError } from '@shared/utils/http';
import { HttpError } from '@shared/utils/errors';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { trackAppEvent, trackAppMetric } from '@shared/appInsights';
import { awardPostCreated } from '@shared/services/reputationService';
import { ModerationAction } from '@shared/clients/hive';
import { withChaos } from '@shared/middleware/chaos';
import { withDailyPostLimit } from '@shared/middleware/dailyPostLimit';
import { moderatePostContent, buildModerationMeta } from '@posts/service/moderationUtil';

import type { CreatePostBody, PostRecord, CreatePostResult, ModerationMeta, ModerationStatus } from '@feed/types';

type AuthenticatedRequest = HttpRequest & { principal: Principal };

const POST_TEXT_MIN_LENGTH = 1;
const POST_TEXT_MAX_LENGTH = 5000;
const STATUS_PUBLISHED = 'published';
const VISIBILITY_PUBLIC = 'public';

interface PostDocument {
  id: string;
  postId: string;
  text: string;
  mediaUrl: string | null;
  authorId: string;
  visibility: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  stats: {
    likes: number;
    comments: number;
    replies: number;
  };
  moderation?: ModerationMeta;
}

/**
 * Content blocked error response
 */
interface ContentBlockedResponse {
  code: string;
  message: string;
  error?: string;
  categories?: string[];
  details?: Record<string, unknown>;
}

// Note: moderatePostContent and buildModerationMeta are now imported from @posts/service/moderationUtil
// to ensure dynamic config loading, decision logging, and consistent threshold handling across all entrypoints.

function validatePostPayload(
  payload: CreatePostBody,
  context: InvocationContext
): { valid: true; text: string; mediaUrl: string | null } | { valid: false; error: string } {
  const text = payload.text?.trim();

  if (!text || text.length < POST_TEXT_MIN_LENGTH) {
    context.log('posts.create.validation_failed', { reason: 'text_too_short' });
    return { valid: false, error: 'Post text is required' };
  }

  if (text.length > POST_TEXT_MAX_LENGTH) {
    context.log('posts.create.validation_failed', { reason: 'text_too_long', length: text.length });
    return { valid: false, error: `Post text exceeds maximum length of ${POST_TEXT_MAX_LENGTH} characters` };
  }

  const mediaUrl = payload.mediaUrl?.trim() || null;
  if (mediaUrl && !isValidMediaUrl(mediaUrl)) {
    context.log('posts.create.validation_failed', { reason: 'invalid_media_url' });
    return { valid: false, error: 'Invalid media URL format' };
  }

  return { valid: true, text, mediaUrl };
}

function isValidMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow HTTPS URLs from allowed domains
    if (parsed.protocol !== 'https:') {
      return false;
    }
    // Add allowed media domains here (Azure Blob Storage, etc.)
    const allowedHosts = [
      'asora.blob.core.windows.net',
      'asoradev.blob.core.windows.net',
      'localhost',
    ];
    return allowedHosts.some(host => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

async function handleCreatePost(req: AuthenticatedRequest, context: InvocationContext): Promise<import('@azure/functions').HttpResponseInit> {
  const principal = req.principal;
  const start = performance.now();

  const payload = (await req.json().catch(() => null)) as CreatePostBody | null;
  if (!payload || typeof payload !== 'object') {
    context.log('posts.create.invalid_json');
    return badRequest('Invalid JSON payload');
  }

  const validation = validatePostPayload(payload, context);
  if (!validation.valid) {
    return badRequest(validation.error);
  }

  try {
    const now = Date.now();
    const postId = crypto.randomUUID();

    // ─────────────────────────────────────────────────────────────
    // Content Moderation - Check before creating post (uses shared util)
    // ─────────────────────────────────────────────────────────────
    // Generate a correlation ID for this request
    const correlationId = req.headers.get('x-correlation-id') ?? crypto.randomUUID();
    
    const { result: moderationResult, error: moderationError } = await moderatePostContent(
      validation.text,
      principal.sub,
      postId,
      context,
      correlationId
    );

    // Build moderation metadata
    const moderationMeta = buildModerationMeta(moderationResult, moderationError);

    // If content is blocked, reject the post immediately
    if (moderationMeta.status === 'blocked') {
      context.log('posts.create.blocked', {
        postId,
        authorId: principal.sub,
        categories: moderationMeta.categories,
        confidence: moderationMeta.confidence,
      });

      trackAppEvent({
        name: 'post_blocked',
        properties: {
          postId,
          authorId: principal.sub,
          categories: moderationMeta.categories?.join(',') ?? '',
          confidence: moderationMeta.confidence ?? 0,
        },
      });

      const blockedResponse: ContentBlockedResponse = {
        code: 'content_blocked',
        message: 'Content cannot be posted as it violates our community guidelines',
        error: 'Content cannot be posted as it violates our community guidelines',
        categories: moderationMeta.categories,
        details: {
          confidence: moderationMeta.confidence ?? undefined,
          reasons: moderationMeta.reasons ?? undefined,
        },
      };

      return {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(blockedResponse),
      };
    }

    // ─────────────────────────────────────────────────────────────
    // Create Post Document
    // ─────────────────────────────────────────────────────────────
    const postDocument: PostDocument = {
      id: postId,
      postId,
      text: validation.text,
      mediaUrl: validation.mediaUrl,
      authorId: principal.sub,
      visibility: VISIBILITY_PUBLIC,
      status: STATUS_PUBLISHED,
      createdAt: now,
      updatedAt: now,
      stats: {
        likes: 0,
        comments: 0,
        replies: 0,
      },
      moderation: moderationMeta,
    };

    const container = getTargetDatabase().posts;
    const { resource, requestCharge } = await container.items.create<PostDocument>(postDocument);

    const duration = performance.now() - start;

    trackAppMetric({
      name: 'cosmos_ru_post_create',
      value: requestCharge ?? 0,
      properties: {
        authorId: principal.sub,
        hasMedia: Boolean(validation.mediaUrl),
      },
    });

    trackAppEvent({
      name: 'post_created',
      properties: {
        postId,
        authorId: principal.sub,
        textLength: validation.text.length,
        hasMedia: Boolean(validation.mediaUrl),
        moderationStatus: moderationMeta.status,
        durationMs: duration,
      },
    });

    context.log('posts.create.success', {
      postId,
      authorId: principal.sub,
      moderationStatus: moderationMeta.status,
      durationMs: duration.toFixed(2),
      ru: requestCharge?.toFixed(2) ?? '0',
    });

    // ─────────────────────────────────────────────────────────────
    // Award Reputation - Fire and forget (don't block response)
    // ─────────────────────────────────────────────────────────────
    awardPostCreated(principal.sub, postId).catch(err => {
      context.log('posts.create.reputation_error', {
        postId,
        authorId: principal.sub,
        error: err.message,
      });
    });

    const postRecord: PostRecord = {
      postId: resource?.postId ?? postId,
      text: resource?.text ?? validation.text,
      mediaUrl: resource?.mediaUrl ?? validation.mediaUrl,
      authorId: resource?.authorId ?? principal.sub,
      createdAt: new Date(resource?.createdAt ?? now).toISOString(),
      updatedAt: new Date(resource?.updatedAt ?? now).toISOString(),
      stats: resource?.stats ?? { likes: 0, comments: 0, replies: 0 },
      moderation: moderationMeta,
    };

    const result: CreatePostResult = {
      body: {
        status: 'success',
        post: postRecord,
      },
      headers: {
        'X-Post-Id': postId,
        'X-Cosmos-RU': (requestCharge ?? 0).toFixed(2),
        'X-Request-Duration': duration.toFixed(2),
      },
    };

    return created(result.body);
  } catch (error) {
    if (error instanceof HttpError) {
      return {
        status: error.status,
        headers: {
          'Content-Type': 'application/json',
          ...(error.headers ?? {}),
        },
        body: JSON.stringify({ error: error.message }),
      };
    }

    context.log('posts.create.error', { message: (error as Error).message });
    return serverError();
  }
}

export const createPost = requireAuth(withChaos(withDailyPostLimit(handleCreatePost)));

/* istanbul ignore next */
const rateLimitedCreatePost = withRateLimit(createPost, (req, context) => getPolicyForFunction('createPost'));

app.http('createPost', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'post',
  handler: rateLimitedCreatePost,
});
