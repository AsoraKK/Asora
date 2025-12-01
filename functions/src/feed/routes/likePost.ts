import { app, HttpRequest, InvocationContext } from '@azure/functions';

import { requireAuth } from '@shared/middleware/auth';
import type { Principal } from '@shared/middleware/auth';
import { badRequest, ok, notFound, serverError } from '@shared/utils/http';
import { HttpError } from '@shared/utils/errors';
import { withRateLimit } from '@http/withRateLimit';
import { getPolicyForFunction } from '@rate-limit/policies';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { trackAppEvent, trackAppMetric } from '@shared/appInsights';
import { awardPostLiked, revokePostLiked } from '@shared/services/reputationService';
import { isNotFoundError } from '@shared/errorUtils';

type AuthenticatedRequest = HttpRequest & { principal: Principal };

interface LikeDocument {
  id: string; // Composite key: `${postId}:${userId}`
  postId: string;
  userId: string;
  createdAt: number;
  _partitionKey: string; // postId for co-location with post queries
}

interface PostDocument {
  id: string;
  postId: string;
  authorId: string;
  stats: {
    likes: number;
    comments: number;
    replies: number;
  };
}

/**
 * Generate a deterministic like document ID from postId and userId.
 * This ensures uniqueness and enables idempotent like operations.
 */
function getLikeId(postId: string, userId: string): string {
  return `${postId}:${userId}`;
}

/**
 * POST /posts/{postId}/like
 * Like a post. Idempotent - re-liking returns success without duplicating.
 */
export const likePost = requireAuth(async (req: AuthenticatedRequest, context: InvocationContext) => {
  const principal = req.principal;
  const postId = req.params.postId;
  const start = performance.now();

  if (!postId || typeof postId !== 'string' || postId.trim().length === 0) {
    context.log('posts.like.validation_failed', { reason: 'missing_post_id' });
    return badRequest('Post ID is required');
  }

  try {
    const db = getTargetDatabase();
    const postsContainer = db.posts;
    const reactionsContainer = db.reactions;

    // 1. Verify the post exists
    const postResponse = await postsContainer.item(postId, postId).read<PostDocument>();
    if (!postResponse.resource) {
      context.log('posts.like.not_found', { postId });
      return notFound();
    }

    const likeId = getLikeId(postId, principal.sub);

    // 2. Check if like already exists (idempotent)
    try {
      const existingLike = await reactionsContainer.item(likeId, postId).read<LikeDocument>();
      if (existingLike.resource) {
        // Already liked - return current state (idempotent success)
        context.log('posts.like.already_liked', { postId, userId: principal.sub });
        
        const currentPost = postResponse.resource;
        return ok({
          status: 'success',
          liked: true,
          likeCount: currentPost.stats?.likes ?? 0,
          message: 'Already liked',
        });
      }
    } catch (readError: unknown) {
      // 404 is expected if not liked yet
      if (!isNotFoundError(readError)) {
        throw readError;
      }
    }

    // 3. Create the like document
    const likeDocument: LikeDocument = {
      id: likeId,
      postId,
      userId: principal.sub,
      createdAt: Date.now(),
      _partitionKey: postId,
    };

    const { requestCharge: createRU } = await reactionsContainer.items.create(likeDocument);

    // 4. Increment the like count on the post (atomic patch)
    const { resource: updatedPost, requestCharge: patchRU } = await postsContainer
      .item(postId, postId)
      .patch<PostDocument>([
        { op: 'incr', path: '/stats/likes', value: 1 },
      ]);

    const duration = performance.now() - start;
    const totalRU = (createRU ?? 0) + (patchRU ?? 0);

    trackAppMetric({
      name: 'cosmos_ru_post_like',
      value: totalRU,
      properties: {
        postId,
        userId: principal.sub,
        operation: 'like',
      },
    });

    trackAppEvent({
      name: 'post_liked',
      properties: {
        postId,
        userId: principal.sub,
        authorId: postResponse.resource.authorId,
        durationMs: duration,
      },
    });

    context.log('posts.like.success', {
      postId,
      userId: principal.sub,
      likeCount: updatedPost?.stats?.likes ?? 1,
      durationMs: duration.toFixed(2),
      ru: totalRU.toFixed(2),
    });

    // ─────────────────────────────────────────────────────────────
    // Award Reputation - +2 to post author (fire and forget)
    // ─────────────────────────────────────────────────────────────
    const authorId = postResponse.resource.authorId;
    awardPostLiked(authorId, postId, principal.sub).catch(err => {
      context.log('posts.like.reputation_error', {
        postId,
        authorId,
        likerId: principal.sub,
        error: err.message,
      });
    });

    return ok({
      status: 'success',
      liked: true,
      likeCount: updatedPost?.stats?.likes ?? 1,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return {
        status: error.status,
        headers: { 'Content-Type': 'application/json', ...(error.headers ?? {}) },
        body: JSON.stringify({ error: error.message }),
      };
    }

    context.log('posts.like.error', { postId, message: (error as Error).message });
    return serverError();
  }
});

/**
 * DELETE /posts/{postId}/like
 * Unlike a post. Idempotent - unliking when not liked returns success.
 */
export const unlikePost = requireAuth(async (req: AuthenticatedRequest, context: InvocationContext) => {
  const principal = req.principal;
  const postId = req.params.postId;
  const start = performance.now();

  if (!postId || typeof postId !== 'string' || postId.trim().length === 0) {
    context.log('posts.unlike.validation_failed', { reason: 'missing_post_id' });
    return badRequest('Post ID is required');
  }

  try {
    const db = getTargetDatabase();
    const postsContainer = db.posts;
    const reactionsContainer = db.reactions;

    // 1. Verify the post exists
    const postResponse = await postsContainer.item(postId, postId).read<PostDocument>();
    if (!postResponse.resource) {
      context.log('posts.unlike.not_found', { postId });
      return notFound();
    }

    const likeId = getLikeId(postId, principal.sub);

    // 2. Check if like exists
    let existingLike: LikeDocument | undefined;
    try {
      const likeResponse = await reactionsContainer.item(likeId, postId).read<LikeDocument>();
      existingLike = likeResponse.resource;
    } catch (readError: unknown) {
      if (isNotFoundError(readError)) {
        // Not liked - return current state (idempotent success)
        context.log('posts.unlike.not_liked', { postId, userId: principal.sub });
        
        const currentPost = postResponse.resource;
        return ok({
          status: 'success',
          liked: false,
          likeCount: currentPost.stats?.likes ?? 0,
          message: 'Not liked',
        });
      }
      throw readError;
    }

    if (!existingLike) {
      const currentPost = postResponse.resource;
      return ok({
        status: 'success',
        liked: false,
        likeCount: currentPost.stats?.likes ?? 0,
        message: 'Not liked',
      });
    }

    // 3. Delete the like document
    const { requestCharge: deleteRU } = await reactionsContainer.item(likeId, postId).delete();

    // 4. Decrement the like count on the post (atomic patch, floor at 0)
    const currentLikes = postResponse.resource.stats?.likes ?? 0;
    const newLikes = Math.max(0, currentLikes - 1);

    const { resource: updatedPost, requestCharge: patchRU } = await postsContainer
      .item(postId, postId)
      .patch<PostDocument>([
        { op: 'set', path: '/stats/likes', value: newLikes },
      ]);

    const duration = performance.now() - start;
    const totalRU = (deleteRU ?? 0) + (patchRU ?? 0);

    trackAppMetric({
      name: 'cosmos_ru_post_unlike',
      value: totalRU,
      properties: {
        postId,
        userId: principal.sub,
        operation: 'unlike',
      },
    });

    trackAppEvent({
      name: 'post_unliked',
      properties: {
        postId,
        userId: principal.sub,
        authorId: postResponse.resource.authorId,
        durationMs: duration,
      },
    });

    context.log('posts.unlike.success', {
      postId,
      userId: principal.sub,
      likeCount: updatedPost?.stats?.likes ?? newLikes,
      durationMs: duration.toFixed(2),
      ru: totalRU.toFixed(2),
    });

    // ─────────────────────────────────────────────────────────────
    // Revoke Reputation - Remove the +2 from post author (fire and forget)
    // ─────────────────────────────────────────────────────────────
    const authorId = postResponse.resource.authorId;
    revokePostLiked(authorId, postId, principal.sub).catch(err => {
      context.log('posts.unlike.reputation_error', {
        postId,
        authorId,
        unlikerId: principal.sub,
        error: err.message,
      });
    });

    return ok({
      status: 'success',
      liked: false,
      likeCount: updatedPost?.stats?.likes ?? newLikes,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return {
        status: error.status,
        headers: { 'Content-Type': 'application/json', ...(error.headers ?? {}) },
        body: JSON.stringify({ error: error.message }),
      };
    }

    context.log('posts.unlike.error', { postId, message: (error as Error).message });
    return serverError();
  }
});

/**
 * GET /posts/{postId}/like
 * Check if the current user has liked a post.
 */
export const getLikeStatus = requireAuth(async (req: AuthenticatedRequest, context: InvocationContext) => {
  const principal = req.principal;
  const postId = req.params.postId;

  if (!postId || typeof postId !== 'string' || postId.trim().length === 0) {
    return badRequest('Post ID is required');
  }

  try {
    const db = getTargetDatabase();
    const postsContainer = db.posts;
    const reactionsContainer = db.reactions;

    // Verify post exists
    const postResponse = await postsContainer.item(postId, postId).read<PostDocument>();
    if (!postResponse.resource) {
      return notFound();
    }

    const likeId = getLikeId(postId, principal.sub);

    // Check if like exists
    let liked = false;
    try {
      const likeResponse = await reactionsContainer.item(likeId, postId).read<LikeDocument>();
      liked = !!likeResponse.resource;
    } catch (readError: unknown) {
      if (!isNotFoundError(readError)) {
        throw readError;
      }
    }

    return ok({
      status: 'success',
      liked,
      likeCount: postResponse.resource.stats?.likes ?? 0,
    });
  } catch (error) {
    context.log('posts.like.status.error', { postId, message: (error as Error).message });
    return serverError();
  }
});

// Rate-limited handlers
/* istanbul ignore next */
const rateLimitedLikePost = withRateLimit(likePost, () => getPolicyForFunction('likePost'));
/* istanbul ignore next */
const rateLimitedUnlikePost = withRateLimit(unlikePost, () => getPolicyForFunction('unlikePost'));
/* istanbul ignore next */
const rateLimitedGetLikeStatus = withRateLimit(getLikeStatus, () => getPolicyForFunction('getLikeStatus'));

// Register routes
app.http('likePost', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'posts/{postId}/like',
  handler: rateLimitedLikePost,
});

app.http('unlikePost', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'posts/{postId}/like',
  handler: rateLimitedUnlikePost,
});

app.http('getLikeStatus', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'posts/{postId}/like',
  handler: rateLimitedGetLikeStatus,
});
