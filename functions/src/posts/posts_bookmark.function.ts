import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { extractAuthContext } from '@shared/http/authContext';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { trackAppEvent } from '@shared/appInsights';

interface BookmarkDocument {
  id: string;
  postId: string;
  userId: string;
  type: 'bookmark';
  createdAt: number;
}

interface PostDocument {
  id: string;
  postId: string;
  authorId: string;
  stats?: {
    likes?: number;
    comments?: number;
    replies?: number;
    bookmarks?: number;
    views?: number;
  };
}

function getBookmarkId(postId: string, userId: string): string {
  return `${postId}:${userId}:bookmark`;
}

function isNotFound(error: unknown): boolean {
  const err = error as any;
  return err?.code === 404 || err?.statusCode === 404;
}

export const posts_bookmark_create = httpHandler<void, { bookmarked: boolean; bookmarkCount: number }>(
  async (ctx) => {
    const postId = ctx.params.id;
    if (!postId) {
      return ctx.badRequest('Post ID is required', 'INVALID_REQUEST');
    }

    const auth = await extractAuthContext(ctx);
    const db = getTargetDatabase();
    const posts = db.posts;
    const reactions = db.reactions;

    let post: PostDocument | null = null;
    try {
      const { resource } = await posts.item(postId, postId).read<PostDocument>();
      post = resource || null;
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
    }

    if (!post) {
      return ctx.notFound('Post not found', 'POST_NOT_FOUND');
    }

    const bookmarkId = getBookmarkId(postId, auth.userId);

    // Idempotent check
    let alreadyBookmarked = false;
    try {
      const { resource } = await reactions.item(bookmarkId, postId).read<BookmarkDocument>();
      alreadyBookmarked = !!resource;
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
    }

    if (!alreadyBookmarked) {
      const bookmarkDoc: BookmarkDocument = {
        id: bookmarkId,
        postId,
        userId: auth.userId,
        type: 'bookmark',
        createdAt: Date.now(),
      };

      await reactions.items.create(bookmarkDoc);
      await posts.item(postId, postId).patch([
        { op: 'incr', path: '/stats/bookmarks', value: 1 },
      ]);

      trackAppEvent({
        name: 'post_bookmarked',
        properties: { postId, userId: auth.userId, authorId: post.authorId },
      });
    }

    const baseCount = post.stats?.bookmarks ?? 0;
    const bookmarkCount = baseCount + (alreadyBookmarked ? 0 : 1);

    return ctx.ok({ bookmarked: true, bookmarkCount });
  }
);

export const posts_bookmark_delete = httpHandler<void, { bookmarked: boolean; bookmarkCount: number }>(
  async (ctx) => {
    const postId = ctx.params.id;
    if (!postId) {
      return ctx.badRequest('Post ID is required', 'INVALID_REQUEST');
    }

    const auth = await extractAuthContext(ctx);
    const db = getTargetDatabase();
    const posts = db.posts;
    const reactions = db.reactions;

    let post: PostDocument | null = null;
    try {
      const { resource } = await posts.item(postId, postId).read<PostDocument>();
      post = resource || null;
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
    }

    if (!post) {
      return ctx.notFound('Post not found', 'POST_NOT_FOUND');
    }

    const bookmarkId = getBookmarkId(postId, auth.userId);

    let bookmarkFound = false;
    try {
      await reactions.item(bookmarkId, postId).read<BookmarkDocument>();
      bookmarkFound = true;
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
    }

    if (bookmarkFound) {
      await reactions.item(bookmarkId, postId).delete();
      const newCount = Math.max(0, (post.stats?.bookmarks ?? 0) - 1);
      await posts.item(postId, postId).patch([
        { op: 'set', path: '/stats/bookmarks', value: newCount },
      ]);

      trackAppEvent({
        name: 'post_bookmark_removed',
        properties: { postId, userId: auth.userId, authorId: post.authorId },
      });
    }

    const bookmarkCount = Math.max(0, (post.stats?.bookmarks ?? 0) - (bookmarkFound ? 1 : 0));
    return ctx.ok({ bookmarked: false, bookmarkCount });
  }
);

export const posts_bookmark_get = httpHandler<void, { bookmarked: boolean; bookmarkCount: number }>(
  async (ctx) => {
    const postId = ctx.params.id;
    if (!postId) {
      return ctx.badRequest('Post ID is required', 'INVALID_REQUEST');
    }

    const auth = await extractAuthContext(ctx);
    const db = getTargetDatabase();
    const posts = db.posts;
    const reactions = db.reactions;

    let post: PostDocument | null = null;
    try {
      const { resource } = await posts.item(postId, postId).read<PostDocument>();
      post = resource || null;
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
    }

    if (!post) {
      return ctx.notFound('Post not found', 'POST_NOT_FOUND');
    }

    let bookmarked = false;
    const bookmarkId = getBookmarkId(postId, auth.userId);
    try {
      const { resource } = await reactions.item(bookmarkId, postId).read<BookmarkDocument>();
      bookmarked = !!resource;
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
    }

    return ctx.ok({ bookmarked, bookmarkCount: post.stats?.bookmarks ?? 0 });
  }
);

app.http('posts_bookmark_create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'posts/{id}/bookmark',
  handler: posts_bookmark_create,
});

app.http('posts_bookmark_delete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'posts/{id}/bookmark',
  handler: posts_bookmark_delete,
});

app.http('posts_bookmark_get', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'posts/{id}/bookmark',
  handler: posts_bookmark_get,
});