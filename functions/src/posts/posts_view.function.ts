import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import { extractAuthContext } from '@shared/http/authContext';
import { getTargetDatabase } from '@shared/clients/cosmos';
import { trackAppEvent } from '@shared/appInsights';

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

function isNotFound(error: unknown): boolean {
  const err = error as any;
  return err?.code === 404 || err?.statusCode === 404;
}

export const posts_view = httpHandler<void, { viewCount: number }>(async (ctx) => {
  const postId = ctx.params.id;
  if (!postId) {
    return ctx.badRequest('Post ID is required', 'INVALID_REQUEST');
  }

  const auth = await extractAuthContext(ctx);
  const db = getTargetDatabase();
  const posts = db.posts;

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

  const currentViews = post.stats?.views ?? 0;
  const newViews = currentViews + 1;

  await posts.item(postId, postId).patch([{ op: 'set', path: '/stats/views', value: newViews }]);

  trackAppEvent({
    name: 'post_viewed',
    properties: { postId, userId: auth.userId, authorId: post.authorId },
  });

  return ctx.ok({ viewCount: newViews });
});

app.http('posts_view', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'posts/{id}/view',
  handler: posts_view,
});