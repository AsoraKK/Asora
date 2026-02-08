/**
 * Like Post Function (v1 REST)
 *
 * POST /api/posts/{id}/like - Like a post
 * DELETE /api/posts/{id}/like - Unlike a post
 * GET /api/posts/{id}/like - Check like status
 *
 * OpenAPI: posts_like_create, posts_like_delete, posts_like_get
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { extractAuthContext } from '@shared/http/authContext';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { trackAppEvent, trackAppMetric } from '@shared/appInsights';
import { awardPostLiked, revokePostLiked } from '@shared/services/reputationService';
import { enqueueUserNotification } from '@shared/services/notificationEvents';
import { NotificationEventType } from '../notifications/types';
import {
  DEVICE_INTEGRITY_BLOCKED_CODE,
  DEVICE_INTEGRITY_BLOCKED_MESSAGE,
  isDeviceIntegrityBlocked,
} from '@shared/middleware/deviceIntegrity';

interface LikeDocument {
  id: string; // Composite key: `${postId}:${userId}`
  postId: string;
  userId: string;
  createdAt: number;
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
 * Generate a deterministic like document ID
 */
function getLikeId(postId: string, userId: string): string {
  return `${postId}:${userId}`;
}

/**
 * Check if an error is a "not found" error
 */
function isNotFoundError(error: unknown): boolean {
  const err = error as any;
  return err?.code === 404 || err?.statusCode === 404;
}

/**
 * POST /api/posts/{id}/like - Like a post
 */
export const posts_like_create = httpHandler<void, { liked: boolean; likeCount: number }>(
  async ctx => {
    const postId = ctx.params.id;
    ctx.context.log(`[posts_like_create] Liking post ${postId} [${ctx.correlationId}]`);

    if (!postId) {
      return ctx.badRequest('Post ID is required', 'INVALID_REQUEST');
    }

    try {
      const auth = await extractAuthContext(ctx);
      const start = performance.now();

      if (isDeviceIntegrityBlocked(ctx.request)) {
        return ctx.forbidden(DEVICE_INTEGRITY_BLOCKED_MESSAGE, DEVICE_INTEGRITY_BLOCKED_CODE);
      }

      const db = getTargetDatabase();
      const postsContainer = db.posts;
      const likesContainer = db.reactions;

      // Verify post exists
      let postDoc: PostDocument;
      try {
        const { resource } = await postsContainer.item(postId, postId).read<PostDocument>();
        if (!resource) {
          return ctx.notFound('Post not found', 'POST_NOT_FOUND');
        }
        postDoc = resource;
      } catch (error) {
        if (isNotFoundError(error)) {
          return ctx.notFound('Post not found', 'POST_NOT_FOUND');
        }
        throw error;
      }

      const likeId = getLikeId(postId, auth.userId);

      // Check if already liked (idempotent)
      let alreadyLiked = false;
      try {
        const { resource: existing } = await likesContainer
          .item(likeId, postId)
          .read<LikeDocument>();
        if (existing) {
          alreadyLiked = true;
        }
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
      }

      if (!alreadyLiked) {
        // Create like document
        const likeDoc: LikeDocument = {
          id: likeId,
          postId,
          userId: auth.userId,
          createdAt: Date.now(),
        };

        await likesContainer.items.create(likeDoc);

        // Increment like count
        await postsContainer
          .item(postId, postId)
          .patch([{ op: 'incr', path: '/stats/likes', value: 1 }]);

        // Award reputation to post author (fire and forget)
        if (postDoc.authorId !== auth.userId) {
          awardPostLiked(postDoc.authorId, postId, auth.userId).catch(err => {
            ctx.context.error(`[posts_like_create] Reputation error: ${err.message}`);
          });

          const tokenName = (auth.token as unknown as Record<string, unknown>)['name'];
          const actorName =
            typeof tokenName === 'string' && tokenName.trim().length > 0 ? tokenName : undefined;
          void enqueueUserNotification({
            context: ctx.context,
            userId: postDoc.authorId,
            eventType: NotificationEventType.POST_LIKED,
            payload: {
              actorId: auth.userId,
              actorName,
              targetId: postId,
              targetType: 'post',
              snippet: 'Your post received a new like.',
            },
            dedupeKey: `post_like:${postId}:${auth.userId}`,
          });
        }
      }

      const duration = performance.now() - start;
      ctx.context.log('[posts_like_create] Like successful', {
        postId,
        duration: duration.toFixed(2),
        alreadyLiked,
      });

      return ctx.ok({
        liked: true,
        likeCount: postDoc.stats.likes + (alreadyLiked ? 0 : 1),
      });
    } catch (error) {
      ctx.context.error(`[posts_like_create] Error: ${error}`, {
        correlationId: ctx.correlationId,
      });

      if (error instanceof Error) {
        if (
          error.message.includes('JWT verification failed') ||
          error.message.includes('Missing Authorization')
        ) {
          return ctx.unauthorized('Invalid or missing authorization', 'UNAUTHORIZED');
        }
      }

      return ctx.internalError(error as Error);
    }
  }
);

/**
 * DELETE /api/posts/{id}/like - Unlike a post
 */
export const posts_like_delete = httpHandler<void, { liked: boolean; likeCount: number }>(
  async ctx => {
    const postId = ctx.params.id;
    ctx.context.log(`[posts_like_delete] Unliking post ${postId} [${ctx.correlationId}]`);

    if (!postId) {
      return ctx.badRequest('Post ID is required', 'INVALID_REQUEST');
    }

    try {
      const auth = await extractAuthContext(ctx);
      const start = performance.now();

      if (isDeviceIntegrityBlocked(ctx.request)) {
        return ctx.forbidden(DEVICE_INTEGRITY_BLOCKED_MESSAGE, DEVICE_INTEGRITY_BLOCKED_CODE);
      }

      const db = getTargetDatabase();
      const postsContainer = db.posts;
      const likesContainer = db.reactions;

      // Verify post exists
      let postDoc: PostDocument;
      try {
        const { resource } = await postsContainer.item(postId, postId).read<PostDocument>();
        if (!resource) {
          return ctx.notFound('Post not found', 'POST_NOT_FOUND');
        }
        postDoc = resource;
      } catch (error) {
        if (isNotFoundError(error)) {
          return ctx.notFound('Post not found', 'POST_NOT_FOUND');
        }
        throw error;
      }

      const likeId = getLikeId(postId, auth.userId);

      // Check if like exists
      let likeFound = false;
      try {
        await likesContainer.item(likeId, postId).read<LikeDocument>();
        likeFound = true;
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
      }

      if (likeFound) {
        // Delete like document
        await likesContainer.item(likeId, postId).delete();

        // Decrement like count (floor at 0)
        const newCount = Math.max(0, postDoc.stats.likes - 1);
        await postsContainer
          .item(postId, postId)
          .patch([{ op: 'set', path: '/stats/likes', value: newCount }]);

        // Revoke reputation from post author (fire and forget)
        if (postDoc.authorId !== auth.userId) {
          revokePostLiked(postDoc.authorId, postId, auth.userId).catch(err => {
            ctx.context.error(`[posts_like_delete] Reputation error: ${err.message}`);
          });
        }
      }

      const duration = performance.now() - start;
      ctx.context.log('[posts_like_delete] Unlike successful', {
        postId,
        duration: duration.toFixed(2),
        likeFound,
      });

      const finalCount = Math.max(0, postDoc.stats.likes - (likeFound ? 1 : 0));
      return ctx.ok({
        liked: false,
        likeCount: finalCount,
      });
    } catch (error) {
      ctx.context.error(`[posts_like_delete] Error: ${error}`, {
        correlationId: ctx.correlationId,
      });

      if (error instanceof Error) {
        if (
          error.message.includes('JWT verification failed') ||
          error.message.includes('Missing Authorization')
        ) {
          return ctx.unauthorized('Invalid or missing authorization', 'UNAUTHORIZED');
        }
      }

      return ctx.internalError(error as Error);
    }
  }
);

/**
 * GET /api/posts/{id}/like - Check like status
 */
export const posts_like_get = httpHandler<void, { liked: boolean; likeCount: number }>(
  async ctx => {
    const postId = ctx.params.id;
    ctx.context.log(`[posts_like_get] Checking like status for ${postId} [${ctx.correlationId}]`);

    if (!postId) {
      return ctx.badRequest('Post ID is required', 'INVALID_REQUEST');
    }

    try {
      const auth = await extractAuthContext(ctx);

      const db = getTargetDatabase();
      const postsContainer = db.posts;
      const likesContainer = db.reactions;

      // Verify post exists and get like count
      let postDoc: PostDocument;
      try {
        const { resource } = await postsContainer.item(postId, postId).read<PostDocument>();
        if (!resource) {
          return ctx.notFound('Post not found', 'POST_NOT_FOUND');
        }
        postDoc = resource;
      } catch (error) {
        if (isNotFoundError(error)) {
          return ctx.notFound('Post not found', 'POST_NOT_FOUND');
        }
        throw error;
      }

      const likeId = getLikeId(postId, auth.userId);

      // Check if viewer has liked
      let viewerHasLiked = false;
      try {
        const { resource } = await likesContainer.item(likeId, postId).read<LikeDocument>();
        viewerHasLiked = !!resource;
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
      }

      return ctx.ok({
        liked: viewerHasLiked,
        likeCount: postDoc.stats.likes,
      });
    } catch (error) {
      ctx.context.error(`[posts_like_get] Error: ${error}`, { correlationId: ctx.correlationId });

      if (error instanceof Error) {
        if (
          error.message.includes('JWT verification failed') ||
          error.message.includes('Missing Authorization')
        ) {
          return ctx.unauthorized('Invalid or missing authorization', 'UNAUTHORIZED');
        }
      }

      return ctx.internalError(error as Error);
    }
  }
);

// Register HTTP triggers
app.http('posts_like_create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'posts/{id}/like',
  handler: posts_like_create,
});

app.http('posts_like_delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'posts/{id}/like',
  handler: posts_like_delete,
});

app.http('posts_like_get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'posts/{id}/like',
  handler: posts_like_get,
});
