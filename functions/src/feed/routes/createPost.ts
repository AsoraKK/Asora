import { app, HttpRequest, InvocationContext } from '@azure/functions';

import { requireAuth } from '@shared/middleware/auth';
import type { Principal } from '@shared/middleware/auth';
import { badRequest, created, serverError } from '@shared/utils/http';
import { HttpError } from '@shared/utils/errors';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { trackAppEvent, trackAppMetric } from '@shared/appInsights';
import {
  createHiveClient,
  ModerationAction,
  HiveAPIError,
  type ModerationResult,
} from '@shared/clients/hive';

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
  error: string;
  code: string;
  categories?: string[];
}

/**
 * Moderate content using Hive AI
 * Returns moderation result or null if moderation should be skipped
 */
async function moderateContent(
  text: string,
  userId: string,
  contentId: string,
  context: InvocationContext
): Promise<{ result: ModerationResult | null; error?: string }> {
  // Skip moderation if HIVE_API_KEY is not configured (dev/test environments)
  if (!process.env.HIVE_API_KEY) {
    context.log('posts.create.moderation_skipped', { reason: 'no_api_key', contentId });
    return { result: null };
  }

  try {
    const hiveClient = createHiveClient();
    const start = performance.now();

    const result = await hiveClient.moderateTextContent({
      text,
      userId,
      contentId,
    });

    const duration = performance.now() - start;

    trackAppMetric({
      name: 'hive_moderation_duration_ms',
      value: duration,
      properties: {
        action: result.action,
        contentId,
      },
    });

    context.log('posts.create.moderation_complete', {
      contentId,
      action: result.action,
      confidence: result.confidence.toFixed(3),
      categories: result.categories,
      durationMs: duration.toFixed(2),
    });

    return { result };
  } catch (error) {
    const isHiveError = error instanceof HiveAPIError;
    const errorMessage = (error as Error).message;
    const errorCode = isHiveError ? (error as HiveAPIError).code : 'UNKNOWN_ERROR';

    context.log('posts.create.moderation_error', {
      contentId,
      errorCode,
      message: errorMessage,
      retryable: isHiveError ? (error as HiveAPIError).retryable : false,
    });

    trackAppEvent({
      name: 'moderation_error',
      properties: {
        contentId,
        errorCode,
        message: errorMessage,
      },
    });

    return { result: null, error: errorMessage };
  }
}

/**
 * Map moderation result to status and metadata
 */
function buildModerationMeta(
  result: ModerationResult | null,
  error?: string
): ModerationMeta {
  const now = Date.now();

  if (error) {
    // Moderation failed - route to pending review
    return {
      status: 'pending_review',
      checkedAt: now,
      error,
    };
  }

  if (!result) {
    // Moderation skipped - treat as clean
    return {
      status: 'clean',
      checkedAt: now,
    };
  }

  let status: ModerationStatus;
  switch (result.action) {
    case ModerationAction.BLOCK:
      status = 'blocked';
      break;
    case ModerationAction.WARN:
      status = 'warned';
      break;
    case ModerationAction.ALLOW:
    default:
      status = 'clean';
      break;
  }

  return {
    status,
    checkedAt: now,
    confidence: result.confidence,
    categories: result.categories,
    reasons: result.reasons,
  };
}

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

export const createPost = requireAuth(async (req: AuthenticatedRequest, context: InvocationContext) => {
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
    // Content Moderation - Check before creating post
    // ─────────────────────────────────────────────────────────────
    const { result: moderationResult, error: moderationError } = await moderateContent(
      validation.text,
      principal.sub,
      postId,
      context
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
        error: 'Content cannot be posted as it violates our community guidelines',
        code: 'content_blocked',
        categories: moderationMeta.categories,
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
});

/* istanbul ignore next */
const rateLimitedCreatePost = withRateLimit(createPost, (req, context) => getPolicyForFunction('createPost'));

app.http('createPost', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'post',
  handler: rateLimitedCreatePost,
});
