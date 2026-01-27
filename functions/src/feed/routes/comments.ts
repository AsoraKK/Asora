import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { requireActiveUser } from '@shared/middleware/activeUser';
import { withDeviceIntegrity } from '@shared/middleware/deviceIntegrity';
import type { Principal } from '@shared/middleware/auth';
import { ok, badRequest, notFound, created, serverError } from '@shared/utils/http';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';
import { withDailyCommentLimit } from '@shared/middleware/dailyPostLimit';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { trackAppEvent, trackAppMetric } from '@shared/appInsights';

type AuthenticatedRequest = HttpRequest & { principal: Principal };

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const COMMENT_MIN_LENGTH = 1;
const COMMENT_MAX_LENGTH = 2000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const STATUS_PUBLISHED = 'published';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface CommentDocument {
  id: string;
  commentId: string;
  postId: string;
  authorId: string;
  text: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  _partitionKey: string;
  type: 'comment';
}

interface CreateCommentBody {
  text?: string;
}

interface CommentCursor {
  ts: number;
  id: string;
}

// ─────────────────────────────────────────────────────────────
// Cursor helpers
// ─────────────────────────────────────────────────────────────

const DEFAULT_CURSOR: CommentCursor = {
  ts: Number.MAX_SAFE_INTEGER,
  id: 'ffffffff-ffff-7fff-bfff-ffffffffffff',
};

function parseCursor(cursor?: string | null): CommentCursor {
  if (!cursor) {
    return DEFAULT_CURSOR;
  }
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf-8');
    const parsed = JSON.parse(decoded);
    const ts = Number(parsed?.ts);
    const id = typeof parsed?.id === 'string' ? parsed.id : '';
    if (!Number.isFinite(ts) || !id) {
      throw new Error('malformed cursor');
    }
    return { ts, id };
  } catch {
    return DEFAULT_CURSOR; // Invalid cursor falls back to beginning
  }
}

function encodeCursor(value: CommentCursor): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function resolveLimit(value?: string | null): number {
  if (!value) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
}

// ─────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────

function validateCommentText(
  text: string | undefined,
  context: InvocationContext
): { valid: true; text: string } | { valid: false; error: string } {
  const trimmed = text?.trim();

  if (!trimmed || trimmed.length < COMMENT_MIN_LENGTH) {
    context.log('comments.create.validation_failed', { reason: 'text_empty' });
    return { valid: false, error: 'Comment text is required' };
  }

  if (trimmed.length > COMMENT_MAX_LENGTH) {
    context.log('comments.create.validation_failed', { reason: 'text_too_long', length: trimmed.length });
    return { valid: false, error: `Comment text exceeds maximum length of ${COMMENT_MAX_LENGTH} characters` };
  }

  return { valid: true, text: trimmed };
}

// ─────────────────────────────────────────────────────────────
// POST /posts/{postId}/comments - Create a comment
// ─────────────────────────────────────────────────────────────

export const createComment = requireActiveUser(
  withDeviceIntegrity(async (req: AuthenticatedRequest, context: InvocationContext) => {
    const principal = req.principal;
    const postId = req.params?.postId;
    const start = performance.now();

  if (!postId) {
    context.log('comments.create.missing_post_id');
    return badRequest('Post ID is required');
  }

  // Parse body
  const payload = (await req.json().catch(() => null)) as CreateCommentBody | null;
  if (!payload || typeof payload !== 'object') {
    context.log('comments.create.invalid_json');
    return badRequest('Invalid JSON payload');
  }

  // Validate text
  const validation = validateCommentText(payload.text, context);
  if (!validation.valid) {
    return badRequest(validation.error);
  }

  try {
    const db = getTargetDatabase();

    // Verify post exists (binary content states: only check blocked/deleted)
    const { resource: post } = await db.posts.item(postId, postId).read();
    if (!post || post.status === 'blocked' || post.status === 'deleted') {
      context.log('comments.create.post_not_found', { postId });
      return notFound();
    }

    const now = Date.now();
    const commentId = crypto.randomUUID();

    // Create comment document in posts container with type='comment'
    const commentDocument: CommentDocument = {
      id: commentId,
      commentId,
      postId,
      authorId: principal.sub,
      text: validation.text,
      status: STATUS_PUBLISHED,
      createdAt: now,
      updatedAt: now,
      _partitionKey: postId,
      type: 'comment',
    };

    const { resource: createdComment, requestCharge: createRU } = await db.posts.items.create<CommentDocument>(
      commentDocument
    );

    // Increment comment count on post (atomic)
    const { requestCharge: patchRU } = await db.posts.item(postId, postId).patch([
      { op: 'incr', path: '/stats/comments', value: 1 },
    ]);

    const duration = performance.now() - start;
    const totalRU = (createRU ?? 0) + (patchRU ?? 0);

    trackAppMetric({
      name: 'cosmos_ru_comment_create',
      value: totalRU,
      properties: { postId, authorId: principal.sub },
    });

    trackAppEvent({
      name: 'comment_created',
      properties: {
        commentId,
        postId,
        authorId: principal.sub,
        textLength: validation.text.length,
        durationMs: duration,
      },
    });

    context.log('comments.create.success', {
      commentId,
      postId,
      authorId: principal.sub,
      durationMs: duration.toFixed(2),
      ru: totalRU.toFixed(2),
    });

    return created({
      status: 'success',
      comment: {
        commentId: createdComment?.commentId ?? commentId,
        postId: createdComment?.postId ?? postId,
        authorId: createdComment?.authorId ?? principal.sub,
        text: createdComment?.text ?? validation.text,
        createdAt: new Date(createdComment?.createdAt ?? now).toISOString(),
        updatedAt: new Date(createdComment?.updatedAt ?? now).toISOString(),
      },
    });
  } catch (error) {
    context.log('comments.create.error', { postId, message: (error as Error).message });
    return serverError();
  }
  })
);

// ─────────────────────────────────────────────────────────────
// GET /posts/{postId}/comments - List comments with pagination
// ─────────────────────────────────────────────────────────────

export async function listComments(req: HttpRequest, context: InvocationContext) {
  const postId = req.params?.postId;
  const start = performance.now();

  if (!postId) {
    context.log('comments.list.missing_post_id');
    return badRequest('Post ID is required');
  }

  const cursorParam = req.query?.get?.('cursor') ?? null;
  const limitParam = req.query?.get?.('limit') ?? null;

  const cursorValue = parseCursor(cursorParam);
  const limit = resolveLimit(limitParam);

  try {
    const db = getTargetDatabase();

    // Verify post exists
    const { resource: post } = await db.posts.item(postId, postId).read();
    if (!post) {
      context.log('comments.list.post_not_found', { postId });
      return notFound();
    }

    // Query comments for this post, ordered by createdAt DESC
    const query = `
      SELECT c.commentId, c.postId, c.authorId, c.text, c.createdAt, c.updatedAt
      FROM c
      WHERE c._partitionKey = @postId
        AND c.type = "comment"
        AND (NOT IS_DEFINED(c.status) OR c.status = @status)
        AND (c.createdAt < @ts OR (c.createdAt = @ts AND c.id < @id))
      ORDER BY c.createdAt DESC, c.id DESC
      OFFSET 0 LIMIT @limit
    `;

    const { resources: comments, requestCharge } = await db.posts.items
      .query<{
        commentId: string;
        postId: string;
        authorId: string;
        text: string;
        createdAt: number;
        updatedAt: number;
      }>(
        {
          query,
          parameters: [
            { name: '@postId', value: postId },
            { name: '@ts', value: cursorValue.ts },
            { name: '@id', value: cursorValue.id },
            { name: '@status', value: STATUS_PUBLISHED },
            { name: '@limit', value: limit + 1 }, // Fetch one extra to check hasMore
          ],
        },
        { partitionKey: postId }
      )
      .fetchAll();

    const hasMore = comments.length > limit;
    const items = hasMore ? comments.slice(0, limit) : comments;
    const lastItem = items[items.length - 1];

    const nextCursor = hasMore && lastItem
      ? encodeCursor({ ts: lastItem.createdAt, id: lastItem.commentId })
      : null;

    const duration = performance.now() - start;

    trackAppMetric({
      name: 'cosmos_ru_comment_list',
      value: requestCharge ?? 0,
      properties: { postId, count: items.length },
    });

    context.log('comments.list.success', {
      postId,
      count: items.length,
      hasMore,
      durationMs: duration.toFixed(2),
      ru: requestCharge?.toFixed(2) ?? '0',
    });

    // Format response with ISO timestamps
    const formattedComments = items.map((c) => ({
      commentId: c.commentId,
      postId: c.postId,
      authorId: c.authorId,
      text: c.text,
      createdAt: new Date(c.createdAt).toISOString(),
      updatedAt: new Date(c.updatedAt).toISOString(),
    }));

    return ok({
      items: formattedComments,
      meta: {
        count: formattedComments.length,
        nextCursor,
        hasMore,
      },
    });
  } catch (error) {
    context.log('comments.list.error', { postId, message: (error as Error).message });
    return serverError();
  }
}

// ─────────────────────────────────────────────────────────────
// Route registration
// ─────────────────────────────────────────────────────────────

/* istanbul ignore next */
const commentWithTierLimit = withDailyCommentLimit(createComment);
const rateLimitedCreateComment = withRateLimit(
  commentWithTierLimit as (req: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>,
  () => getPolicyForFunction('createComment')
);

/* istanbul ignore next */
const rateLimitedListComments = withRateLimit(listComments, () => getPolicyForFunction('listComments'));

app.http('createComment', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'posts/{postId}/comments',
  handler: rateLimitedCreateComment,
});

app.http('listComments', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'posts/{postId}/comments',
  handler: rateLimitedListComments,
});
