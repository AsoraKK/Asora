/**
 * Create Post Function
 * 
 * POST /api/posts
 * 
 * Create a new post.
 * 
 * OpenAPI: posts_create
 */

import { app } from '@azure/functions';
import { httpHandler } from '@shared/http/handler';
import type { CreatePostRequest, Post } from '@shared/types/openapi';

export const posts_create = httpHandler<CreatePostRequest, Post>(async (ctx) => {
  ctx.context.log(`[posts_create] Creating new post [${ctx.correlationId}]`);

  // TODO: Implement create post logic
  // - Extract user ID from JWT
  // - Validate CreatePostRequest (content, contentType, mediaUrls, topics, visibility)
  // - Generate UUID v7 for post ID
  // - Store in Cosmos posts container with partition key /authorId
  // - Apply moderation (Hive AI + Azure Content Safety fallback)
  // - Return created Post

  return ctx.notImplemented('posts_create');
});

// Register HTTP trigger
app.http('posts_create', {
  methods: ['POST'],
  authLevel: 'anonymous', // TODO: Change to 'function' and add requireAuth middleware
  route: 'posts',
  handler: posts_create,
});
