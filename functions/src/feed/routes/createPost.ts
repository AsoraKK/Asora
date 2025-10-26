import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

import { authRequired, parseAuth } from '@shared/middleware/auth';
import { badRequest, created, serverError, unauthorized } from '@shared/utils/http';
import { HttpError } from '@shared/utils/errors';

import type { CreatePostBody } from '@feed/types';

export async function createPost(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const principal = parseAuth(req);

  try {
    authRequired(principal);
  } catch {
    return unauthorized();
  }

  const payload = (await req.json().catch(() => null)) as CreatePostBody | null;
  if (!payload || typeof payload !== 'object') {
    context.log('posts.create.invalid_json');
    return badRequest('Invalid JSON payload');
  }

  try {
    // Defer service import to avoid module-level initialization
    const { createPost: createPostService } = await import('@feed/service/feedService');
    const result = await createPostService({ principal, payload, context });
    const response = created(result.body);
    response.headers = {
      ...response.headers,
      ...result.headers,
    };
    return response;
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

    context.log('posts.create.error', error);
    return serverError();
  }
}

app.http('createPost', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'post',
  handler: createPost,
});
