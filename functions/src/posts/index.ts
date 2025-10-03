import { app } from '@azure/functions';
import { createPost } from './create';

app.http('posts-create', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'posts',
  handler: createPost,
});
